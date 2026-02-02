
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

async function sendEmailViaResend(apiKey: string, to: string[], subject: string, html: string, fromName: string, replyTo: string, attachments: any[] = []) {
    const payload: any = {
        from: `${fromName} <naoresponda@dentihub.com.br>`, 
        to: to,
        subject: subject,
        html: html,
        reply_to: replyTo
    };

    if (attachments && attachments.length > 0) {
        payload.attachments = attachments;
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Erro Resend: ${data.message || data.name || res.statusText}`);
    return data;
}

Deno.serve(async (req) => {
  // CORS Permissivo (*)
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
    const { type, recipients, appointment, client, userName, contactEmail, message, subject: reqSubject, htmlContent: reqHtmlContent, attachments } = body;
    
    // Captura o subtipo (created, updated, deleted)
    const subtype = body.subtype; 

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
        await sendEmailViaResend(resendApiKey, ['contato@dentihub.com.br'], `[Suporte] ${reqSubject}`, htmlContent, 'DentiHub System', contactEmail);
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
    // 3. AGENDAMENTO (Criação, Edição ou Cancelamento)
    else if (type === 'appointment' && client) {
        const baseUrl = 'https://dentihub.com.br';
        let subject = '';
        let htmlContent = '';

        if (subtype === 'deleted') {
            // LÓGICA DE CANCELAMENTO
            subject = `Cancelamento - ${clinicName}`;
            htmlContent = `
                <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ef4444;">Agendamento Cancelado</h2>
                    <p>Olá <strong>${client.name}</strong>,</p>
                    <p>Informamos que o agendamento abaixo foi <strong>cancelado</strong>.</p>
                    <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Data:</strong> ${appointment.date}</p>
                        <p style="margin: 5px 0;"><strong>Horário:</strong> ${appointment.time}</p>
                        <p style="margin: 5px 0;"><strong>Profissional:</strong> ${appointment.dentist_name}</p>
                        <p style="margin: 5px 0;"><strong>Procedimento:</strong> ${appointment.service_name}</p>
                    </div>
                    <p>Caso deseje reagendar, entre em contato conosco ou acesse nosso link de agendamento.</p>
                </div>
            `;
        } else {
            // LÓGICA DE CONFIRMAÇÃO (Created / Updated)
            subject = `Agendamento - ${clinicName}`;
            htmlContent = `
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
                        <a href="${baseUrl}/#/appointment-action?id=${appointment.id}&action=confirm" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Confirmar Presença</a>
                        <a href="${baseUrl}/#/appointment-action?id=${appointment.id}&action=cancel" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Cancelar</a>
                    </div>
                    ` : ''}
                </div>
            `; 
        }

        await sendEmailViaResend(resendApiKey, [client.email], subject, htmlContent, clinicName, clinicEmail);
        success = true;
    }
    // 4. CONVITE DE DENTISTA / FUNCIONÁRIO
    else if (type === 'invite_dentist' || type === 'invite_employee') {
        const isDentist = type === 'invite_dentist';
        const roleLabel = isDentist ? 'Dentista' : (body.roleLabel || 'Funcionário');
        
        for (const r of recipients) {
            if (r.email) {
                const subject = `Convite: Junte-se à equipe da ${clinicName}`;
                const html = `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background-color: #0ea5e9; padding: 30px 20px; text-align: center;">
                           <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${clinicName}</h1>
                        </div>

                        <div style="padding: 40px 30px; color: #334155; line-height: 1.6; text-align: center;">
                           <h2 style="color: #0f172a; margin-top: 0;">Você foi convidado(a)!</h2>
                           <p style="margin-bottom: 20px;">Olá <strong>${r.name || ''}</strong>,</p>
                           <p>A clínica <strong>${clinicName}</strong> convidou você para acessar a plataforma DentiHub com o perfil de <strong>${roleLabel}</strong>.</p>
                           <p>Para começar, clique no botão abaixo e defina sua senha:</p>

                           <div style="margin: 35px 0;">
                              <a href="https://dentihub.com.br/#/auth?view=forgot" target="_blank" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Criar minha senha
                              </a>
                           </div>
                        </div>
                    </div>
                `;
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, html, clinicName, clinicEmail);
                    results.count++;
                } catch (e) {
                    console.error("Erro envio convite:", e);
                }
            }
        }
        success = true;
    }
    // 5. RECEITA / DOCUMENTO
    else if (type === 'prescription' && client) {
        const subject = `Receita / Documento - ${clinicName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0ea5e9;">Novo Documento</h2>
                <p>Olá <strong>${client.name}</strong>,</p>
                <p>A clínica <strong>${clinicName}</strong> enviou um documento para você (Receita, Atestado ou Orientação).</p>
                <p>O arquivo está em anexo (PDF).</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">Se tiver dúvidas, entre em contato com a clínica.</p>
            </div>
        `;
        await sendEmailViaResend(resendApiKey, [client.email], subject, htmlContent, clinicName, clinicEmail, attachments);
        success = true;
    }
    // 6. CAMPANHA DE RETORNO (Recall)
    else if (type === 'recall' && recipients) {
        const subject = `Olá! Faz tempo que não te vemos na ${clinicName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #f97316; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Cuidar do sorriso é essencial! 😁</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Olá,</p>
                    <p>Notamos que faz um tempo desde sua última visita à <strong>${clinicName}</strong>.</p>
                    <p>A prevenção é o melhor caminho para manter sua saúde bucal em dia. Que tal agendar um check-up?</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://dentihub.com.br/#/${user.id}" target="_blank" style="background-color: #f97316; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">
                            Agendar Agora
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        for (const r of recipients) {
            if(r.email) {
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                    await supabaseAdmin.from('communications').insert({
                        clinic_id: user.id,
                        type: 'recall',
                        recipient_name: r.name,
                        recipient_email: r.email,
                        subject: 'Campanha de Retorno',
                        status: 'sent'
                    });
                    results.count++;
                } catch (e) { console.error(e); }
            }
        }
        success = true;
    }
    // 7. BOAS VINDAS
    else if (type === 'welcome' && recipients) {
        const subject = `Bem-vindo(a) à ${clinicName}!`;
        const bookingLink = body.origin ? `${body.origin}/#/${clinic.slug || clinic.id}` : `https://dentihub.com.br/#/${clinic.id}`;
        const htmlContent = `
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #0ea5e9;">Bem-vindo(a)!</h1>
                <p>Seu cadastro na <strong>${clinicName}</strong> foi realizado com sucesso.</p>
                <p>Sempre que precisar agendar uma consulta, você pode usar nosso link online:</p>
                ${generateButton('Agendar Consulta', bookingLink, '#0ea5e9')}
            </div>
        `;
        for (const r of recipients) {
            try {
                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                results.count++;
            } catch (e) {}
        }
        success = true;
    }

    if (success) {
        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    throw new Error("Tipo de e-mail desconhecido.");

  } catch (error: any) {
    console.error("Erro send-emails:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
