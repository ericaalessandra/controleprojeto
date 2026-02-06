import { Project, Task, ProjectPulse } from "./types";
import { supabase } from "./supabase";

/**
 * Realiza a análise de pulso do projeto utilizando a API do Gemini.
 */
export const getProjectPulse = async (project: Project, tasks: Task[]): Promise<ProjectPulse | null> => {
  const isProduction = import.meta.env.PROD;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!isProduction && (!apiKey || apiKey === 'undefined')) {
    console.error("Gemini Pulse: API Key ausente.");
    return null;
  }

  const lang = localStorage.getItem('app_language') || 'pt';
  const langInstruction = lang === 'en' ? 'Answer in English.' : lang === 'es' ? 'Answer in Spanish.' : 'Answer in Portuguese.';

  const prompt = `
    ${langInstruction}
    Analyze the health of this project based on real data:
    PROJECT: "${project.name}"
    DESCRIPTION: "${project.description}"
    TOTAL BUDGET: ${project.totalBudget || 0}
    
    TASKS:
    ${tasks.map(t => `- [${t.status}] ${t.title} | Cost: ${t.budget || 0} | End: ${t.endDate || 'N/D'}`).join('\n')}

    Instructions:
    1. Calculate a score (0-100).
    2. Status: 'Saudável', 'Alerta', or 'Crítico'.
    3. SUMMARY (1 sentence).
    4. INSIGHTS (3 bullet points).

    RETURN PURE JSON ONLY (NO MARKDOWN), following this structure:
    {
      "score": number,
      "status": "string",
      "summary": "string",
      "insights": ["string", "string", "string"]
    }
  `;

  try {
    let jsonStr = "";

    if (isProduction) {
      console.log("Gemini Pulse: Via Edge Function (Prod)...");
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt, context: "Você é um analista de projetos JSON strict." }
      });

      if (error) throw error;
      jsonStr = data.text;
    } else {
      console.log("Gemini Pulse: Via Proxy (Local)...");
      // v1beta para gemini-2.5-flash
      const response = await fetch(`/api/gemini/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(response.statusText + " - " + errorText.substring(0, 100));
      }
      const data = await response.json();
      jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (jsonStr) {
      const cleanJson = jsonStr.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      let finalStatus = parsed.status || 'Alerta';
      const statusStr = String(finalStatus).toLowerCase();
      if (statusStr.includes('saud') || statusStr.includes('health')) finalStatus = 'Saudável';
      else if (statusStr.includes('crit')) finalStatus = 'Crítico';
      else if (statusStr.includes('alert') || statusStr.includes('warn')) finalStatus = 'Alerta';

      return {
        score: Number(parsed.score) || 0,
        status: finalStatus as any,
        summary: parsed.summary || "",
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        lastUpdated: Date.now()
      };
    }
    return null;
  } catch (error) {
    console.error("Gemini Pulse Error:", error);
    return null;
  }
};

/**
 * Gera insights executivos detalhados para o projeto.
 */
export const getProjectInsights = async (project: Project, tasks: Task[]): Promise<string> => {
  const isProduction = import.meta.env.PROD;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!isProduction && (!apiKey || apiKey === 'undefined')) return "API Key pendente.";

  const lang = localStorage.getItem('app_language') || 'pt';
  const langInstruction = lang === 'en' ? 'Answer in English.' : lang === 'es' ? 'Answer in Spanish.' : 'Answer in Portuguese.';

  const prompt = `
    ${langInstruction}
    As a senior project management consultant, analyze the project:
    NAME: "${project.name}"
    DESCRIPTION: "${project.description}"
    
    CURRENT TASK STATE:
    ${tasks.map(t => `- [STATUS: ${t.status}] Title: ${t.title} | Deadline: ${t.endDate || 'Not defined'}`).join('\n')}

    OBJECTIVE:
    1. Provide an executive diagnosis of progress.
    2. Identify critical risks.
    3. Suggest 3 acceleration strategies.
    
    Respond in a professional and direct tone. Use Markdown formatting.
  `;

  try {
    if (isProduction) {
      console.log("Gemini Insights: Via Edge Function (Prod)...");
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt }
      });
      if (error) throw error;
      return data.text || "Insights indisponíveis.";
    } else {
      console.log("Gemini Insights: Via Proxy (Local)...");
      // v1beta para gemini-2.5-flash
      const response = await fetch(`/api/gemini/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return `Erro ao gerar insights: ${response.status} - ${errorText.substring(0, 100)}`;
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Insights indisponíveis no momento.";
    }
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Assistente de IA temporariamente indisponível.";
  }
};
