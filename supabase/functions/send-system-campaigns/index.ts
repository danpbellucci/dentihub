
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Configuração dos Templates de E-mail
const CAMPAIGNS = {
    'activation_ai': {
        subject: '💡 Dica: Economize 15min por consulta',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Vi que você criou sua conta recentemente, mas ainda não testou nosso recurso favorito: o <strong>Prontuário com Inteligência Artificial</strong>.</p>
            <p>Você sabia que pode ditar a evolução do paciente e nossa IA cria o resumo técnico (SOAP) automaticamente?</p>
            <ul>
                <li>🎤 Apenas fale o que aconteceu na consulta</li>
                <li>📝 A IA transcreve e organiza o texto</li>
                <li>⏱️ Economize tempo de digitação</li>
            </ul>
            <p>Experimente agora em seu próximo atendimento.</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/smart-record',
        ctaText: 'Testar Prontuário IA'
    },
    'activation_agenda': {
        subject: '📅 Comece a organizar sua semana',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Sua agenda está esperando por você. O DentiHub é a melhor forma de organizar seus atendimentos e evitar conflitos de horário.</p>
            <p>Para começar:</p>
            <ol>
                <li>Cadastre seu primeiro paciente</li>
                <li>Crie um agendamento teste</li>
                <li>Veja como é fácil visualizar sua semana</li>
            </ol>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/calendar',
        ctaText: 'Acessar Agenda'
    },
    'retention_ghost': {
        subject: '👻 Dias tranquilos?',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>,</p>
            <p>Notamos que você não tem agendamentos futuros marcados na agenda.</p>
            <p>Mesmo em dias mais calmos, lembre-se de registrar <strong>bloqueios</strong> ou <strong>retornos</strong> para manter suas métricas financeiras e de produtividade sempre precisas.</p>
            <p>Use o sistema para enviar e-mails de retorno para pacientes antigos e lotar sua agenda novamente!</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/messaging',
        ctaText: 'Criar Campanha de Retorno'
    },
    'monetization_limit': {
        subject: '🚀 Sua clínica está crescendo! (Limite de pacientes)',
        getContent: (name: string) => `
            <p>Parabéns, <strong>${name}</strong>!</p>
            <p>Você está quase atingindo o limite de 30 pacientes do plano Gratuito. Isso é um ótimo sinal de que sua clínica está prosperando.</p>
            <p>Não deixe seu crescimento parar. Faça o upgrade para o plano <strong>Starter</strong> e libere:</p>
            <ul>
                <li>✅ Até 100 Pacientes</li>
                <li>✅ Até 3 Dentistas</li>
                <li>✅ Mais uso da IA</li>
            </ul>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/settings',
        ctaText: 'Fazer Upgrade Agora'
    },
    'monetization_ai': {
        subject: '🧠 Gostou da IA? Desbloqueie todo o potencial',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>,</p>
            <p>Você utilizou todas as suas cotas gratuitas do Prontuário com Inteligência Artificial. Esperamos que tenha gostado da experiência!</p>
            <p>Imagine nunca mais ter que digitar evoluções longas manualmente? No plano <strong>Starter</strong>, você pode usar a IA todos os dias.</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/settings',
        ctaText: 'Liberar IA Diária'
    },
    // NOVOS E-MAILS
    'onboarding_3d': {
        subject: 'O que você está achando do DentiHub? 💭',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Gostaríamos muito de saber sua opinião sobre a plataforma nestes seus primeiros dias.</p>
            <p>Estamos aqui para ajudar você a ter a melhor experiência possível na gestão da sua clínica.</p>
            <p>Se tiver qualquer dúvida sobre o uso, sugestão de melhoria ou se encontrou alguma dificuldade, nosso suporte está à disposição.</p>
            <p>Você pode responder a este e-mail ou escrever diretamente para <strong>contato@dentihub.com.br</strong>.</p>
        `,
        ctaLink: 'mailto:contato@dentihub.com.br',
        ctaText: 'Falar com Suporte'
    },
    'referral_promo_4d': {
        subject: '🎁 Ganhe meses grátis no DentiHub',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Sabia que você pode usar os planos <strong>Starter</strong> e <strong>Pro</strong> do DentiHub sem pagar nada?</p>
            <p>Com nosso programa de indicações, você ganha recompensas reais:</p>
            <ul>
                <li>✅ <strong>30 dias de Plano Starter:</strong> Quando seu indicado atingir 30 pacientes cadastrados.</li>
                <li>✅ <strong>30 dias de Plano Pro:</strong> Quando seu indicado contratar qualquer plano pago.</li>
            </ul>
            <p>Ajude outros profissionais a modernizarem suas clínicas e seja recompensado por isso!</p>
            <p>Pegue seu link exclusivo e comece a indicar agora mesmo:</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/indique-e-ganhe',
        ctaText: 'Pegar Meu Link de Indicação'
    },
    'onboarding_7d': {
        subject: 'Uma semana juntos! 🚀',
        getContent: (name: string) => `
            <p>Olá, <strong>${name}</strong>!</p>
            <p>Já se passou uma semana desde que você criou sua conta no DentiHub. Esperamos que sua rotina esteja ficando mais organizada.</p>
            <p>Você tem alguma dúvida sobre como usar alguma ferramenta específica?</p>
            <ul>
                <li>A Agenda está funcionando bem para você?</li>
                <li>Conseguiu testar o Prontuário com IA?</li>
                <li>Cadastrou seus pacientes?</li>
            </ul>
            <p>Estamos à disposição para ajudar você a extrair o máximo da plataforma.</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard/guide',
        ctaText: 'Ver Guia Prático'
    },
    'onboarding_30d': {
        subject: '1 mês de DentiHub: Quanto tempo você economizou? ⏳',
        getContent: (name: string) => `
            <p>Parabéns, <strong>${name}</strong>!</p>
            <p>Estamos juntos há 1 mês! 🎉</p>
            <p>Sabia que, utilizando o DentiHub, dentistas chegam a economizar mais de <strong>20 horas por mês</strong> que antes eram gastas na digitação manual de prontuários e organização de papelada?</p>
            <p>Esperamos que você esteja sentindo essa liberdade para focar no que realmente importa: seus pacientes e sua qualidade de vida.</p>
            <p>Continue contando conosco para o sucesso da sua clínica!</p>
        `,
        ctaLink: 'https://dentihub.com.br/#/dashboard',
        ctaText: 'Acessar Meu Painel'
    }
};

async function sendEmail(apiKey: string, to: string, subject: string, htmlBody: string, ctaText: string, ctaLink: string) {
    const finalHtml = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">DentiHub</h1>
            </div>
            <div style="padding: 30px;">
                ${htmlBody}
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${ctaLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${ctaText}</a>
                </div>
            </div>
            <div style="background-color: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #666;">
                <p>Você recebeu este e-mail porque utiliza o DentiHub.</p>
            </div>
        </div>
    `;

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
            html: finalHtml
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao enviar email');
    }
}

Deno.serve(async (req) => {
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
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Configuração incompleta.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const campaignKeys = Object.keys(CAMPAIGNS);
    const results: any = {};

    let body: any = {};
    if (req.method === 'POST') {
        try {
            body = await req.json();
        } catch {}
    }

    const { testMode, targetEmail } = body;

    // --- MODO DE TESTE (ENVIA TUDO PARA O ADMIN) ---
    if (testMode && targetEmail) {
        console.log(`[TEST MODE] Enviando todas as campanhas para ${targetEmail}`);
        
        for (const key of campaignKeys) {
            const campaign = CAMPAIGNS[key as keyof typeof CAMPAIGNS];
            try {
                await sendEmail(
                    resendApiKey,
                    targetEmail,
                    `[TESTE] ${campaign.subject}`,
                    campaign.getContent('Super Admin'),
                    campaign.ctaText,
                    campaign.ctaLink
                );
                results[key] = 1;
            } catch (err) {
                console.error(`Erro envio teste ${key}:`, err);
                results[key] = 'error';
            }
        }

        return new Response(JSON.stringify({ success: true, message: "Modo teste concluído", results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // --- MODO PRODUÇÃO ---
    for (const key of campaignKeys) {
        const campaign = CAMPAIGNS[key as keyof typeof CAMPAIGNS];
        const { data: targets, error } = await supabase.rpc('get_campaign_targets', { p_campaign_key: key });
        
        if (error) continue;

        let sentCount = 0;
        if (targets && targets.length > 0) {
            for (const user of targets) {
                try {
                    if (!user.email) continue;

                    await sendEmail(
                        resendApiKey, 
                        user.email, 
                        campaign.subject, 
                        campaign.getContent(user.name || 'Doutor(a)'), 
                        campaign.ctaText, 
                        campaign.ctaLink
                    );

                    await supabase.from('communications').insert({
                        clinic_id: user.user_id,
                        type: 'system',
                        recipient_name: user.name,
                        recipient_email: user.email,
                        subject: campaign.subject,
                        status: 'sent'
                    });

                    sentCount++;
                } catch (err) {
                    console.error(`Falha ao enviar para ${user.email}:`, err);
                }
            }
        }
        results[key] = sentCount;
    }

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-system-campaigns',
        metadata: { results },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});