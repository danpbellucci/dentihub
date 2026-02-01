
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const generateButton = (text: string, url: string, color: string, textColor: string = '#ffffff') => {
  return `<a href="${url}" target="_blank" style="background-color: ${color}; color: ${textColor}; padding: 12px 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 5px;">${text}</a>`;
};

async function sendEmailViaResend(apiKey: string, to: string[], subject: string, html: string, fromName: string, replyTo: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: `${fromName} <contato@dentihub.com.br>`, 
            to: to,
            subject: subject,
            html: html,
            reply_to: replyTo
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Erro Resend: ${data.message || data.name || res.statusText}`);
    return data;
}

Deno.serve(async (req) => {
  // CORS Permissivo (*) para evitar erros de bloqueio em ambientes de desenvolvimento/preview
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
        throw new Error("Configuração ausente.");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { type, subtype, recipients, appointment, client, userName, contactEmail, message, subject: reqSubject, htmlContent: reqHtmlContent } = body;
    const results = { count: 0 };

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Token ausente");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error("Usuário não autenticado");

    // Lógica principal de envio
    const { data: clinic } = await supabaseAdmin.from('clinics').select('*').eq('id', user.id).single();
    const clinicName = clinic?.name || 'DentiHub';
    const clinicEmail = clinic?.email || 'contato@dentihub.com.br';

    let success = false;

    // 1. SUPORTE
    if (type === 'support_ticket') {
        const htmlContent = `User: ${userName} (${contactEmail})<br>Msg: ${message}`;
        await sendEmailViaResend(resendApiKey, ['contato@dentihub.com.br'], `[Suporte] ${reqSubject}`, htmlContent, 'DentiHub', contactEmail);
        success = true;
    } 
    // 2. MARKETING EM MASSA
    else if (type === 'marketing_campaign') {
        if (recipients && Array.isArray(recipients) && reqSubject && reqHtmlContent) {
            for (const r of recipients) {
                if(r.email) {
                    try {
                        await sendEmailViaResend(resendApiKey, [r.email], reqSubject, reqHtmlContent, clinicName, clinicEmail);
                        results.count++;
                    } catch (err) {
                        console.error(`Falha ao enviar para ${r.email}:`, err);
                    }
                }
            }
            success = true;
        }
    }
    // 3. CONFIRMAÇÃO DE AGENDAMENTO
    else if (type === 'appointment' && client) {
        const subject = `Agendamento - ${clinicName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0ea5e9;">Confirmação de Agendamento</h2>
                <p>Olá <strong>${client.name}</strong>,</p>
                <p>Sua consulta foi agendada com sucesso.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #0ea5e9; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Data:</strong> ${appointment.date}</p>
                    <p style="margin: 5px 0;"><strong>Horário:</strong> ${appointment.time}</p>
                    <p style="margin: 5px 0;"><strong>Profissional:</strong> ${appointment.dentist_name}</p>
                    <p style="margin: 5px 0;"><strong>Procedimento:</strong> ${appointment.service_name}</p>
                </div>
                <p>Caso precise remarcar, entre em contato conosco.</p>
                
                ${appointment.id && appointment.id !== 'pending' ? `
                <div style="margin-top: 20px;">
                    <a href="${body.origin}/appointment-action?id=${appointment.id}&action=confirm" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Confirmar Presença</a>
                    <a href="${body.origin}/appointment-action?id=${appointment.id}&action=cancel" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Cancelar</a>
                </div>
                ` : ''}
            </div>
        `; 
        await sendEmailViaResend(resendApiKey, [client.email], subject, htmlContent, clinicName, clinicEmail);
        success = true;
    }
    // 4. CONVITE DE DENTISTA / FUNCIONÁRIO
    else if (type === 'invite_dentist' || type === 'invite_employee') {
        const isDentist = type === 'invite_dentist';
        const roleLabel = isDentist ? 'Dentista' : 'Membro da Equipe';
        
        for (const r of recipients) {
            if (r.email) {
                const subject = `Convite: Junte-se à ${clinicName}`;
                const html = `
                    <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #0ea5e9; text-align: center;">Bem-vindo ao Time!</h2>
                        <p>Olá, <strong>${r.name || 'Colega'}</strong>.</p>
                        <p>Você foi convidado(a) para acessar o sistema da <strong>${clinicName}</strong> como ${roleLabel}.</p>
                        <p>Para começar, acesse o link abaixo e crie sua senha:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            ${generateButton('Acessar Sistema', 'https://dentihub.com.br/#/auth?view=forgot', '#0ea5e9')}
                        </div>
                        <p style="font-size: 12px; color: #666; text-align: center;">Dica: Use a opção "Esqueceu a senha" para definir sua primeira senha.</p>
                    </div>
                `;
                await sendEmailViaResend(resendApiKey, [r.email], subject, html, clinicName, clinicEmail);
                results.count++;
            }
        }
        success = true;
    }
    // 5. BOAS-VINDAS AO PACIENTE
    else if (type === 'welcome') {
        const clinicSlug = clinic.slug || clinic.id;
        const bookingUrl = body.origin ? `${body.origin}/#/${clinicSlug}` : null;
        const whatsappClean = clinic.whatsapp ? clinic.whatsapp.replace(/\D/g, '') : null;

        for (const r of recipients) {
            if (r.email) {
                const subject = `Bem-vindo(a) à ${clinicName}`;
                const html = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <!-- Header -->
                        <div style="background-color: #0ea5e9; padding: 30px 20px; text-align: center;">
                           <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${clinicName}</h1>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px 20px; color: #334155; line-height: 1.6;">
                           <p style="font-size: 18px; margin-bottom: 20px;">Olá, <strong>${r.name}</strong>! 👋</p>
                           <p>Seja muito bem-vindo(a)! É um prazer ter você como paciente.</p>
                           <p>Já realizamos o seu cadastro em nosso sistema para oferecer um atendimento mais ágil e personalizado.</p>

                           <div style="background-color: #f8fafc; border-left: 4px solid #0ea5e9; padding: 15px; margin: 25px 0; border-radius: 4px;">
                              <p style="margin: 0; font-size: 14px; color: #475569;">
                                 <strong>Dica:</strong> Você pode agendar suas próximas consultas diretamente pelo nosso link online, sem precisar ligar.
                              </p>
                           </div>

                           <!-- Actions -->
                           <div style="text-align: center; margin-top: 30px;">
                              ${bookingUrl ? generateButton('📅 Agendar Online', bookingUrl, '#0ea5e9') : ''}
                              ${whatsappClean ? generateButton('💬 Conversar no WhatsApp', `https://wa.me/55${whatsappClean}`, '#22c55e') : ''}
                           </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                           <p style="margin: 0;">${clinicName}</p>
                           ${clinic.address ? `<p style="margin: 5px 0 0;">${clinic.address} - ${clinic.city || ''}</p>` : ''}
                        </div>
                    </div>
                `;
                await sendEmailViaResend(resendApiKey, [r.email], subject, html, clinicName, clinicEmail);
                results.count++;
            }
        }
        success = true;
    }
    // 6. GENÉRICO / CAMPANHA MANUAL (Recall)
    else if (type === 'recall' || (recipients && Array.isArray(recipients))) {
        for (const r of recipients) {
            if(r.email) {
                // Se for recall, usa template de retorno, senão usa o genérico ou o passado via reqHtmlContent
                let finalSubject = reqSubject || `Mensagem de ${clinicName}`;
                let finalHtml = reqHtmlContent;

                if (!finalHtml) {
                    if (type === 'recall') {
                        finalSubject = `Sentimos sua falta na ${clinicName}`;
                        finalHtml = `
                            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
                                <p>Olá, <strong>${r.name}</strong>!</p>
                                <p>Faz um tempo que não vemos o seu sorriso aqui na <strong>${clinicName}</strong>.</p>
                                <p>A saúde bucal precisa de cuidados periódicos. Que tal agendar um check-up para garantir que está tudo bem?</p>
                                <p>Estamos com horários disponíveis e aguardando sua visita.</p>
                                <div style="margin-top: 20px;">
                                    ${generateButton('Agendar Agora', `https://wa.me/55${clinic.whatsapp?.replace(/\D/g, '') || ''}`, '#22c55e')}
                                </div>
                            </div>
                        `;
                    } else {
                        // Fallback genérico melhorado
                        finalHtml = `
                            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px;">
                                <p>Olá <strong>${r.name || ''}</strong>,</p>
                                <p>Você tem uma nova mensagem da <strong>${clinicName}</strong>.</p>
                                <p>Entre em contato conosco para mais informações.</p>
                            </div>
                        `;
                    }
                }

                await sendEmailViaResend(resendApiKey, [r.email], finalSubject, finalHtml, clinicName, clinicEmail);
                results.count++;
            }
        }
        success = true;
    }

    if (success) {
        // LOG DE USO
        await supabaseAdmin.from('edge_function_logs').insert({
            function_name: 'send-emails',
            metadata: { type, user_id: user.id, count: results.count },
            status: 'success'
        });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });

  } catch (error: any) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, 
    });
  }
});
