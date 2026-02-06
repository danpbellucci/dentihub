
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
    const { type, recipients, appointment, client, userName, contactEmail, message, subject: reqSubject, htmlContent: reqHtmlContent, attachments, item, requestDetails } = body;
    
    // Captura o subtipo (created, updated, deleted)
    const subtype = body.subtype; 

    const results = { count: 0 };

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Token ausente");

    // Usa Service Role se o token for da própria edge function (chamada interna), senão usa o token do usuário
    let user;
    if (authHeader.includes(supabaseServiceKey)) {
        // Chamada interna confiável, não precisa validar usuário
        user = { id: 'system' };
    } else {
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        const { data } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
        user = data.user;
    }

    if (!user) throw new Error("Usuário não autenticado");

    // Para chamadas internas que não têm um usuário logado real (ex: cron jobs ou trigger de request),
    // definimos clinicName genérico ou passamos no body.
    let clinicName = 'DentiHub';
    let clinicEmail = 'contato@dentihub.com.br';

    if (user.id !== 'system') {
        const { data: clinic } = await supabaseAdmin.from('clinics').select('*').eq('id', user.id).single();
        if (clinic) {
            clinicName = clinic.name || 'DentiHub';
            clinicEmail = clinic.email || 'contato@dentihub.com.br';
        }
    }

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
    // 4. NOVA SOLICITAÇÃO DE AGENDAMENTO (Notificação para a Clínica)
    else if (type === 'new_request_notification' && requestDetails) {
        const { patientName, serviceName, requestedTime, dentistName, patientPhone } = requestDetails;
        
        // Formata a data
        const dateObj = new Date(requestedTime);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const subject = `🔔 Nova Solicitação de Agendamento: ${patientName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0ea5e9; margin-top: 0;">Nova Solicitação Online 📅</h2>
                <p>Um paciente solicitou um agendamento através do link público.</p>
                
                <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Paciente:</strong> ${patientName}</p>
                    <p style="margin: 5px 0;"><strong>Contato:</strong> ${patientPhone}</p>
                    <p style="margin: 5px 0;"><strong>Serviço:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Profissional:</strong> ${dentistName}</p>
                    <p style="margin: 5px 0;"><strong>Data Solicitada:</strong> ${dateStr} às ${timeStr}</p>
                </div>
                
                <p>Acesse o sistema para aceitar ou recusar esta solicitação.</p>
                
                <div style="margin-top: 25px; text-align: center;">
                    <a href="https://dentihub.com.br/#/dashboard/requests" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                        Gerenciar Solicitações
                    </a>
                </div>
            </div>
        `;

        for (const r of recipients) {
            if (r.email) {
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, "DentiHub Notificações", "naoresponda@dentihub.com.br");
                    results.count++;
                } catch (err) {
                    console.error(`Erro ao enviar notificação para ${r.email}:`, err);
                }
            }
        }
        success = true;
    }
    // 5. CONVITE DE DENTISTA / FUNCIONÁRIO
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
                           <p>Para começar, clique no botão abaixo e crie sua conta:</p>

                           <div style="margin: 35px 0;">
                              <a href="https://dentihub.com.br/#/auth?view=forgot" target="_blank" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Criar minha conta
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
    // 6. RECEITA / DOCUMENTO
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
    // 7. ALERTA DE ESTOQUE
    else if (type === 'stock_alert' && item) {
        const subject = `⚠️ Alerta de Estoque Baixo: ${item.name} - ${clinicName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444; margin-top: 0;">Alerta de Estoque 📉</h2>
                <p>O item abaixo atingiu o nível mínimo configurado:</p>
                
                <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Item:</strong> ${item.name}</p>
                    <p style="margin: 5px 0;"><strong>Quantidade Atual:</strong> ${item.quantity}</p>
                    <p style="margin: 5px 0;"><strong>Mínimo Definido:</strong> ${item.min_quantity}</p>
                </div>
                
                <p style="margin-top: 20px;">Por favor, verifique a necessidade de reposição.</p>
                <div style="margin-top: 20px;">
                    <a href="https://dentihub.com.br/#/dashboard/inventory" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Gerenciar Estoque</a>
                </div>
            </div>
        `;
        
        for (const r of recipients) {
            if(r.email) {
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                    await supabaseAdmin.from('communications').insert({
                        clinic_id: user.id !== 'system' ? user.id : (item.clinic_id), // Tenta pegar ID correto
                        type: 'stock_alert',
                        recipient_name: r.name || 'Admin',
                        recipient_email: r.email,
                        subject: `Alerta Estoque: ${item.name}`,
                        status: 'sent'
                    });
                    results.count++;
                } catch (e) { console.error(e); }
            }
        }
        success = true;
    }
    // 8. RECALL E OUTROS
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
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://dentihub.com.br/#/${clinicName.toLowerCase().replace(/\s/g, '-')}" target="_blank" style="background-color: #f97316; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Agendar Agora</a>
                    </div>
                </div>
            </div>`;
         for (const r of recipients) {
            if(r.email) {
                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                results.count++;
            }
         }
         success = true;
    }
    else if (type === 'welcome' && recipients) {
        const subject = `Bem-vindo(a) à ${clinicName}!`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px;">
                <h1 style="color: #0ea5e9;">Bem-vindo!</h1>
                <p>Seu cadastro na <strong>${clinicName}</strong> foi realizado com sucesso.</p>
            </div>
        `;
        for (const r of recipients) {
            if(r.email) {
                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                results.count++;
            }
        }
        success = true;
    }

    if (success) {
        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }

    return new Response(JSON.stringify({ success: true, message: "Processado." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: any) {
    console.error("Erro send-emails:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
