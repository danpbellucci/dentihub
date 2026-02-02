
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  // CORS Permissivo (*)
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

    const { email: rawEmail, name } = body;

    if (!rawEmail) throw new Error("E-mail é obrigatório.");
    const email = rawEmail.toLowerCase().trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Gerar Código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // 2. Salvar no Banco
    await supabaseAdmin.from('verification_codes').delete().eq('email', email);
    
    const { error: dbError } = await supabaseAdmin.from('verification_codes').insert({
        email,
        code,
        expires_at: expiresAt.toISOString()
    });

    if (dbError) throw dbError;

    // 3. Enviar E-mail
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: "DentiHub Segurança <naoresponda@dentihub.com.br>",
            to: [email],
            subject: `${code} é seu código de verificação`,
            html: `
                <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #0ea5e9; text-align: center;">Validação de Conta</h2>
                    <p>Olá, <strong>${name || 'Doutor(a)'}</strong>!</p>
                    <p>Use o código abaixo para concluir seu cadastro no DentiHub:</p>
                    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b;">${code}</span>
                    </div>
                    <p style="text-align: center; color: #64748b; font-size: 12px;">Este código expira em 15 minutos.</p>
                </div>
            `
        })
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Resend Error:", errData);
        throw new Error("Falha ao enviar e-mail de verificação.");
    }

    return new Response(JSON.stringify({ success: true, message: "Código enviado." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro send-signup-code:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
