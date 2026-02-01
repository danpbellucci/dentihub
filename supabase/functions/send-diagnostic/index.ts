
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = ['http://localhost:5173', 'https://dentihub.com.br', 'https://app.dentihub.com.br'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração ausente: RESEND_API_KEY não definida no Dashboard do Supabase.' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: 'JSON inválido no corpo da requisição.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }

    const { email, name } = body;

    if (!email) {
        return new Response(JSON.stringify({ error: 'E-mail destinatário é obrigatório.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }

    let clinicName = "DentiHub Teste";
    let clinicEmail = "contato@dentihub.com.br";
    const authHeader = req.headers.get('Authorization');

    if (authHeader) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
            const { data: clinic } = await supabaseClient
                .from('clinics')
                .select('name, email')
                .eq('id', user.id)
                .single();
            
            if (clinic) {
                clinicName = clinic.name || clinicName;
                if (clinic.email) clinicEmail = clinic.email;
            }
        }
    }

    console.log(`[DIAGNOSTIC] Enviando para: ${email} como: ${clinicName}`);

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: `${clinicName} <contato@dentihub.com.br>`,
            to: [email],
            subject: 'Teste de Conexão DentiHub ✅',
            html: `
              <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #0ea5e9;">Diagnóstico do Sistema</h2>
                <p>Olá, <strong>${name || 'Usuário'}</strong>!</p>
                <p>Este e-mail confirma que o sistema de envios da <strong>${clinicName}</strong> está funcionando.</p>
                <div style="background-color: #f0fdf4; color: #166534; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <strong>Status:</strong> Conexão Bem-sucedida 🚀
                </div>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Data do envio: ${new Date().toLocaleString('pt-BR')}</p>
                <p style="font-size: 10px; color: #999;">Enviado via Supabase Edge Functions</p>
              </div>
            `,
            reply_to: clinicEmail
        })
    });

    const data = await res.json();

    if (!res.ok) {
        console.error('[DIAGNOSTIC] Erro Resend:', JSON.stringify(data));
        return new Response(JSON.stringify({ error: `Erro na API de Email: ${data.message || data.name || res.statusText}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("[DIAGNOSTIC] Erro interno:", error);
    return new Response(JSON.stringify({ error: `Erro interno do servidor: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
