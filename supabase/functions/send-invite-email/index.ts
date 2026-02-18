import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, role, companyName } = await req.json();

        if (!email) {
            throw new Error("Email is required");
        }

        const { data, error } = await resend.emails.send({
            from: "SGPC Innova4Up <onboarding@resend.dev>", // TODO: User needs to update this after domain verification
            to: [email],
            subject: "Bem-vindo ao Sistema de Gestão de Projetos e Controle de Custos (SGPC) da empresa Innova4Up! 🚀",
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Olá!</h2>
          <p>Você foi convidado para ser um usuário do <strong>Sistema de Gestão de Projetos e Controle de Custos (SGPC)</strong>.</p>
          <p>Você recebeu acesso como <strong>Perfil: ${role === 'admin' ? 'Administrador' : 'Colaborador'}</strong> na unidade <strong>${companyName || 'Principal'}</strong>.</p>
          <p>Para acessar sua conta e definir sua senha, siga os passos:</p>
          <ol>
            <li>Clique no link abaixo: <a href="https://controleprojeto.vercel.app/" target="_blank">https://controleprojeto.vercel.app/</a></li>
            <li>Clique na opção <strong>"Primeiro Acesso"</strong></li>
            <li>Cadastre sua senha.</li>
          </ol>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://controleprojeto.vercel.app/" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              Acessar SGPC Agora
            </a>
          </div>
        </div>
      `,
        });

        if (error) {
            console.error("Resend Error:", error);
            return new Response(JSON.stringify({ error }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
