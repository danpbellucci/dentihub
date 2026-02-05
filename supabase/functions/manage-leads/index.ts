
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string, replyTo: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: "DentiHub <naoresponda@dentihub.com.br>",
            to: [to],
            subject: subject,
            html: html,
            reply_to: replyTo
        })
    });

    if (!res.ok) {
        const data = await res.json();
        throw new Error(`Erro Resend: ${data.message || data.name}`);
    }
    return await res.json();
}

const getUnsubscribeLink = (email: string) => {
    return `https://dentihub.com.br/#/?action=unsubscribe&email=${encodeURIComponent(email)}`;
};

const getFooter = (email: string) => `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999;">
        <p>Você recebeu este e-mail porque se cadastrou em nossa lista de interesse.</p>
        <p><a href="${getUnsubscribeLink(email)}" style="color: #999; text-decoration: underline;">Parar de receber estes e-mails</a></p>
    </div>
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Configuração incompleta.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { type, email } = await req.json();

    // 1. BOAS VINDAS (Imediato)
    if (type === 'welcome_lead' && email) {
        const subject = "Bem-vindo ao DentiHub! 🦷";
        const html = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #0ea5e9;">Obrigado pelo interesse!</h1>
                <p>Olá,</p>
                <p>Ficamos felizes que você queira modernizar sua clínica com o <strong>DentiHub</strong>.</p>
                
                <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #0369a1;">Por que escolher o DentiHub?</h3>
                    <ul style="padding-left: 20px;">
                        <li>✅ <strong>Prontuário com IA:</strong> Dite a evolução e o sistema escreve (SOAP).</li>
                        <li>✅ <strong>Agenda Online:</strong> Link público para seus pacientes agendarem.</li>
                        <li>✅ <strong>Lembretes Automáticos:</strong> Reduza faltas via e-mail.</li>
                        <li>✅ <strong>Gratuito para Começar:</strong> Plano Free vitalício para consultórios iniciantes.</li>
                    </ul>
                </div>

                <p>Você pode começar a usar tudo isso agora mesmo, sem custo e sem cartão de crédito.</p>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://dentihub.com.br/#/auth?view=signup" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Criar Minha Conta Grátis
                    </a>
                </div>
                ${getFooter(email)}
            </div>
        `;

        await sendEmail(resendApiKey, email, subject, html, 'contato@dentihub.com.br');
        
        await supabase.from('leads').update({ 
            last_contact_at: new Date().toISOString(),
            email_count: 1 
        }).eq('email', email);

        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. CRON FOLLOW-UP (A cada 5 dias)
    else if (type === 'cron_followup') {
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

        // Busca leads pendentes que não receberam contato recente
        const { data: leads } = await supabase
            .from('leads')
            .select('email, email_count')
            .eq('unsubscribed', false)
            .lt('last_contact_at', fiveDaysAgo)
            .limit(50); 

        let sent = 0;

        for (const lead of (leads || [])) {
            // Verifica se virou usuário
            const { data: user } = await supabase.from('user_profiles').select('id').eq('email', lead.email).maybeSingle();
            
            if (user) {
                await supabase.from('leads').update({ unsubscribed: true }).eq('email', lead.email);
                continue;
            }

            const subject = "Ainda não começou? 🤔";
            const html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <p>Olá,</p>
                    <p>Notamos que você ainda não finalizou seu cadastro no DentiHub.</p>
                    <p>Gostaríamos de saber: <strong>o que está faltando para você modernizar sua clínica?</strong></p>
                    <p>Responda este e-mail ou crie sua conta gratuitamente agora:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://dentihub.com.br/#/auth?view=signup" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Finalizar Cadastro Agora
                        </a>
                    </div>
                    ${getFooter(lead.email)}
                </div>
            `;

            try {
                await sendEmail(resendApiKey, lead.email, subject, html, 'contato@dentihub.com.br');
                await supabase.from('leads').update({ 
                    last_contact_at: new Date().toISOString(),
                    email_count: (lead.email_count || 0) + 1
                }).eq('email', lead.email);
                sent++;
            } catch (err) {
                console.error(`Erro envio lead ${lead.email}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. UNSUBSCRIBE
    else if (type === 'unsubscribe' && email) {
        await supabase.from('leads').update({ unsubscribed: true }).eq('email', email);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response("OK", { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
