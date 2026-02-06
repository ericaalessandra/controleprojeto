
import React, { useState, useRef, useEffect } from 'react';
import { Project, Task, ChatMessage, Company, AccessoryTask } from '../types';
import { supabase } from '../supabase';

interface ChatBotProps {
  projects: Project[];
  tasks: Task[];
  accessoryTasks?: AccessoryTask[];
  userName: string;
  company: Company | null;
  customIcon?: string; // Nova prop para ícone global/master
}

const ChatBot: React.FC<ChatBotProps> = ({ projects, tasks, accessoryTasks = [], userName, company, customIcon }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Use customIcon if available, otherwise fallback to company icon
  const activeIcon = customIcon || company?.chatBotIconData;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: `Olá ${userName.split(' ')[0]}! Sou o Innova Intelligence. Tenho acesso completo aos dados dos seus projetos. Como posso ajudar?`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const isProduction = import.meta.env.PROD;

    // Apenas verifica API Key se NÃO estiver em produção
    // Em produção, a chave fica segura no servidor (Edge Function)
    if (!isProduction && !apiKey) {
      setMessages(prev => [...prev, {
        role: 'model',
        text: "⚠️ API Key não configurada. Verifique seu arquivo .env",
        timestamp: Date.now()
      }]);
      setIsTyping(false);
      return;
    }

    try {
      const context = `
        VOCÊ É: Innova Intelligence
        ${company?.aiPersona || `VOCÊ É: Innova Intelligence - Seu assistente de IA amigável, entusiasta e especialista em Gestão de Projetos! 🚀
        ===== SUA PERSONALIDADE =====
        1. SEJA AMIGÁVEL: Use emojis (🚀, 💡, ✅, 📊) para tornar a conversa leve e visualmente rica.
        2. SEJA ESPECIALISTA: Você entende profundamente de gerenciamento de projetos e pode explicar conceitos.
        3. SEJA PROATIVO: Se vir um projeto atrasado, sugira ações ou pergunte se o usuário quer ajuda.`}

        NOME DO USUÁRIO: ${userName}
        EMPRESA: ${company?.name || 'Não definida'}

        ===== REGRAS DE ESCOPO =====
        1. O QUE VOCÊ PODE RESPONDER:
           - Perguntas sobre os projetos e tarefas listados abaixo.
           - Perguntas conceituais sobre gestão de projetos (ex: "O que é um projeto atrasado?", "Como calcular orçamento?").
           - Perguntas sobre o status geral do portfólio.
        2. O QUE VOCÊ NÃO DEVE RESPONDER:
           - Perguntas pessoais, políticas, religiosas ou fofocas.
           - Se o usuário fugir muito do tema, traga-o de volta gentilmente para o contexto de trabalho.

        ${company?.aiDefinitions || `===== DEFINIÇÕES DO SISTEMA (CONHECIMENTO TÉCNICO) =====
        Use estas definições para analisar os dados:
        - ATRASADO 🚨: Quando a "Data de Fim" é anterior à data de hoje (${new Date().toLocaleDateString('pt-BR')}) e o status NÃO é "Concluído".
        - EM DIA ✅: Quando a "Data de Fim" é futura ou igual a hoje.
        - RISCO ⚠️: Quando faltam menos de 5 dias para o prazo e a tarefa ainda não começou.
        - ORÇAMENTO 💰: Compare sempre o "Custo Estimado" com o "Total do Projeto" se disponível.`}

        ===== DADOS DISPONÍVEIS (BASE DE DADOS) =====
        
        PROJETOS DO USUÁRIO (${projects.length} projetos):
        ${projects.map(p => `
          - Nome: "${p.name}"
          - Descrição: ${p.description || 'Sem descrição'}
          - Status: ${p.status}
          - Orçamento Total: R$ ${p.totalBudget?.toLocaleString('pt-BR') || '0'}
          - Início: ${p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR') : 'Não definido'}
          - Término: ${p.endDate ? new Date(p.endDate).toLocaleDateString('pt-BR') : 'Não definido'}
        `).join('\n')}

        TAREFAS DO USUÁRIO (${tasks.length} tarefas):
        ${tasks.map(t => `
          - Título: "${t.title}"
          - Projeto: ${projects.find(p => p.id === t.projectId)?.name || 'Desconhecido'}
          - Status: ${t.status}
          - Prioridade: ${t.priority || 'Normal'}
          - Orçamento: R$ ${t.budget?.toLocaleString('pt-BR') || '0'}
          - Responsável: ${t.assignedTo || 'Não atribuído'}
          - Início: ${t.startDate ? new Date(t.startDate).toLocaleDateString('pt-BR') : 'Não definido'}
          - Fim: ${t.endDate ? new Date(t.endDate).toLocaleDateString('pt-BR') : 'Não definido'}
        `).join('\n')}

        TAREFAS ACESSÓRIAS (${accessoryTasks.length} itens):
        ${accessoryTasks.map(a => `
          - Título: "${a.title}"
          - Descrição: ${a.description || 'Sem descrição'}
          - Status: ${a.status}
          - Responsável: ${a.assignedTo || 'Não atribuído'}
          - Início: ${a.startDate || 'ND'}
          - Fim: ${a.endDate || 'ND'}
        `).join('\n')}

        ===== INSTRUÇÕES FINAIS =====
        - Responda sempre em Português do Brasil.
        - Use formatação simples (sem Markdown complexo), mas use quebras de linha para listar itens.
        - Se o usuário perguntar "Como estão meus projetos?", faça um resumo executivo citando quantos estão em dia e quantos estão atrasados.
      `;

      // Lógica Híbrida: Local (Proxy) vs Produção (Edge Function)
      const isProduction = import.meta.env.PROD;
      let text = "";

      if (!isProduction) {
        // AMBIENTE LOCAL: Usa Proxy do Vite (v1beta para gemini-2.5-flash)
        const response = await fetch(`/api/gemini/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: context + "\n\nPERGUNTA DO USUÁRIO: " + input }]
              }
            ]
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Erro detalhado (Local):", errorText);
          throw new Error(`Erro API (${response.status}): ${errorText.substring(0, 200)}`);
        }

        const data = await response.json();
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

      } else {
        // PRODUÇÃO: Usa Supabase Edge Function
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            message: input,
            context: context
          }
        });

        if (error) {
          console.error("Erro Edge Function:", error);
          throw new Error(`Erro Servidor IA: ${error.message}`);
        }

        text = data.text || "Sem resposta da IA.";
      }

      setMessages(prev => [...prev, { role: 'model', text: text, timestamp: Date.now() }]);

    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `Erro de conexão: ${error.message}. Verifique sua internet.`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[2000] flex flex-col items-end">
      {/* Janela de Chat */}
      {isOpen && (
        <div className="mb-4 w-[400px] max-h-[85vh] h-[650px] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300 origin-bottom-right">
          {/* Header */}
          <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-center shadow-md shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 overflow-hidden">
                {activeIcon ? (
                  <img src={activeIcon} className="w-full h-full object-contain p-1" alt="Bot" />
                ) : (
                  <i className="fas fa-robot text-lg"></i>
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-tight">Innova Intelligence</h4>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Online & Conectado</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-50 dark:bg-slate-900">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap font-sans leading-relaxed ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-tl-none'
                  }`}>
                  {msg.text || (msg.role === 'model' && !isTyping ? "..." : msg.text)}
                  {idx === messages.length - 1 && isTyping && msg.role === 'model' && (
                    <span className="inline-block w-1 h-3 bg-indigo-600 dark:bg-indigo-400 ml-1 animate-pulse align-middle"></span>
                  )}
                </div>
              </div>
            ))}
            {isTyping && !messages[messages.length - 1].text && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Pergunte sobre seus projetos..."
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-300 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/10 text-sm transition-all text-slate-900 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isTyping}
                className={`absolute right-2 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${input.trim() && !isTyping ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'text-slate-300 dark:text-slate-500 bg-transparent'
                  }`}
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
            <p className="text-[9px] text-center text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-widest">
              Análise em tempo real de todos os dados permitidos
            </p>
          </div>
        </div>
      )}

      {/* Botão de Abrir */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 relative group overflow-hidden border-2 border-white dark:border-slate-700 ${isOpen ? 'bg-slate-800' : 'bg-indigo-600'
          }`}
      >
        {isOpen ? (
          <i className="fas fa-times text-white text-xl"></i>
        ) : activeIcon ? (
          <img src={activeIcon} className="w-full h-full object-cover" alt="Bot" />
        ) : (
          <i className="fas fa-robot text-white text-2xl"></i>
        )}
      </button>
    </div>
  );
};

export default ChatBot;
