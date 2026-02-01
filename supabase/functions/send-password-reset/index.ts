
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      throw new Error("Configuração do servidor incompleta.");
    }

    let body;
    try {
        body = await req.json();
    } catch {
        throw new Error("Corpo da requisição inválido.");
    }

    const { email } = body;
    if (!email) throw new Error("E-mail é obrigatório.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Gerar Link de Recuperação
    // Redireciona para a raiz. O frontend detectará o hash #access_token&type=recovery
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: 'https://dentihub.com.br/'
        }
    });

    if (linkError) throw linkError;
    if (!linkData || !linkData.properties?.action_link) throw new Error("Falha ao gerar link.");

    const recoveryLink = linkData.properties.action_link;

    // 2. Enviar E-mail via Resend
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: "DentiHub Segurança <contato@dentihub.com.br>",
            to: [email],
            subject: "Redefinição de Senha - DentiHub",
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background-color: #0ea5e9; padding: 30px 20px; text-align: center;">
                       <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">DentiHub</h1>
                    </div>

                    <!-- Body -->
                    <div style="padding: 40px 30px; color: #334155; line-height: 1.6; text-align: center;">
                       <h2 style="color: #0f172a; margin-top: 0;">Recuperação de Senha</h2>
                       
                       <p style="margin-bottom: 20px;">Olá,</p>
                       
                       <p>Recebemos uma solicitação para redefinir a senha da sua conta no DentiHub.</p>
                       <p>Se foi você, clique no botão abaixo para criar uma nova senha:</p>

                       <div style="margin: 35px 0;">
                          <a href="${recoveryLink}" target="_blank" style="background-color: #0ea5e9; color: #ffffff; padding: 14px 28px; font-family: Helvetica, Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.4);">
                            Redefinir Minha Senha
                          </a>
                       </div>
                       
                       <p style="font-size: 12px; color: #64748b;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                       <p style="margin: 0;">&copy; ${new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
                    </div>
                </div>
            `
        })
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Resend Error:", errData);
        throw new Error("Falha ao enviar e-mail.");
    }

    return new Response(JSON.stringify({ success: true, message: "E-mail enviado." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro send-password-reset:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
