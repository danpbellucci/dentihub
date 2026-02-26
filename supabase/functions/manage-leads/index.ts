
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  // Configuração de CORS Segura
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Configuração incompleta.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { type, email } = await req.json();

    // Helper de envio de e-mail
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
        return `https://dentihub.com.br/?action=unsubscribe&email=${encodeURIComponent(email)}`;
    };

    const getFooter = (email: string) => `
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #999;">
            <p>Você recebeu este e-mail porque se cadastrou em nossa lista de interesse.</p>
            <p><a href="${getUnsubscribeLink(email)}" style="color: #999; text-decoration: underline;">Parar de receber estes e-mails</a></p>
        </div>
    `;

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
                    <a href="https://dentihub.com.br/auth?view=signup" style="background-color: #0ea5e9; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
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

    // 2. CRON FOLLOW-UP (Diário)
    else if (type === 'cron_followup') {
        const now = Date.now();
        const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();
        const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();
        
        const fiveDaysAgo = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

        // A. PROMOÇÃO DE INDICAÇÃO (3 DIAS APÓS CADASTRO)
        const { data: promoLeads } = await supabase
            .from('leads')
            .select('email, email_count')
            .eq('unsubscribed', false)
            .lt('created_at', threeDaysAgo) 
            .gt('created_at', fourDaysAgo) // Janela de 24h para pegar apenas os de 3 dias atrás
            .lt('email_count', 2); // Garante que só recebeu o welcome (1)

        let sentPromo = 0;
        
        for (const lead of (promoLeads || [])) {
             // CRUCIAL: Verifica se virou usuário (conta criada)
            const { data: user } = await supabase.from('user_profiles').select('id').eq('email', lead.email).maybeSingle();
            
            if (user) {
                // Se já criou conta, para de mandar e-mails de lead
                await supabase.from('leads').update({ unsubscribed: true }).eq('email', lead.email);
                continue;
            }

            const subject = "🎁 Use o DentiHub Premium de graça";
            const html = `
                <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                    <p>Olá,</p>
                    <p>Sabia que você pode usar os planos <strong>Starter</strong> e <strong>Pro</strong> do DentiHub sem pagar nada?</p>
                    <p>Ao criar sua conta, você recebe um código de indicação exclusivo para ganhar recompensas:</p>
                    <ul>
                        <li>✅ <strong>30 dias de Plano Starter:</strong> Quando seu indicado atingir 30 pacientes cadastrados.</li>
                        <li>✅ <strong>30 dias de Plano Pro:</strong> Quando seu indicado contratar qualquer plano pago.</li>
                    </ul>
                    <p>Crie sua conta agora para pegar seu código e começar a indicar:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://dentihub.com.br/auth?view=signup" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            Criar Conta e Pegar Código
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
                sentPromo++;
            } catch (err) {
                console.error(`Erro envio lead promo ${lead.email}:`, err);
            }
        }

        // B. FOLLOW-UP PADRÃO (5+ DIAS) - Lógica Antiga
        const { data: oldLeads } = await supabase
            .from('leads')
            .select('email, email_count')
            .eq('unsubscribed', false)
            .lt('last_contact_at', fiveDaysAgo)
            .gte('email_count', 2) // Já recebeu a promo, agora recebe o follow-up padrão
            .limit(50); 

        let sentFollowUp = 0;

        for (const lead of (oldLeads || [])) {
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
                        <a href="https://dentihub.com.br/auth?view=signup" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
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
                sentFollowUp++;
            } catch (err) {
                console.error(`Erro envio lead followup ${lead.email}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, sentPromo, sentFollowUp }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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