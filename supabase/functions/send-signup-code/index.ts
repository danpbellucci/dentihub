
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

    const { email: rawEmail, name, referralCode } = body;

    if (!rawEmail) throw new Error("E-mail é obrigatório.");
    const email = rawEmail.toLowerCase().trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // --- VALIDAÇÃO PRÉVIA DO CÓDIGO DE INDICAÇÃO ---
    if (referralCode && referralCode.trim() !== '') {
        const cleanCode = referralCode.trim().toUpperCase();
        
        // Verifica se existe alguma clínica com este código
        const { data: clinic, error } = await supabaseAdmin
            .from('clinics')
            .select('id')
            .eq('referral_code', cleanCode)
            .maybeSingle();

        if (!clinic) {
            return new Response(JSON.stringify({ 
                error: "O código de indicação informado não existe. Por favor, revise o código ou apague-o para continuar." 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200, // Retorna 200 com erro no body para o front tratar
            });
        }
    }
    // ------------------------------------------------

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
            from: "DentiHub <naoresponda@dentihub.com.br>",
            to: [email],
            subject: `${code} é seu código de verificação`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Seu código de verificação</title>
                </head>
                <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <div style="background-color: #0ea5e9; padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">DentiHub</h1>
                        </div>

                        <!-- Body -->
                        <div style="padding: 40px 30px; color: #334155; text-align: center;">
                            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; font-weight: 700;">Validação de Conta</h2>
                            <p style="margin: 15px 0 25px 0; font-size: 16px; line-height: 1.5;">Olá, <strong>${name || 'Doutor(a)'}</strong>!<br>Utilize o código abaixo para finalizar seu cadastro.</p>
                            
                            <!-- Code Box Highlight -->
                            <div style="background-color: #f0f9ff; border: 2px dashed #0ea5e9; border-radius: 12px; padding: 25px; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; color: #0369a1; font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">CÓDIGO DE SEGURANÇA</p>
                                <div style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0284c7; background-color: #ffffff; padding: 10px 20px; border-radius: 8px; display: inline-block;">
                                    ${code}
                                </div>
                                <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">(Selecione e copie o número acima)</p>
                            </div>

                            <p style="color: #64748b; font-size: 13px; margin: 0;">Este código expira em 15 minutos.</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="font-size: 11px; color: #94a3b8; margin: 0;">Se você não solicitou este código, ignore este e-mail.</p>
                        </div>
                    </div>
                </body>
                </html>
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
