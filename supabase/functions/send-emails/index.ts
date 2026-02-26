
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
  const origin = req.headers.get('origin') ?? '';
  
  // HARDENED SECURITY: Localhost removido
  const allowedOrigins = [
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
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
    const { type, recipients, appointment, client, userName, contactEmail, message, subject: reqSubject, htmlContent: reqHtmlContent, attachments, item, requestDetails, clinicName: bodyClinicName, clinicEmail: bodyClinicEmail, planName } = body;
    
    // Captura o subtipo (created, updated, deleted)
    const subtype = body.subtype; 

    const results = { count: 0 };

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Token ausente");

    // Usa Service Role se o token for da própria edge function (chamada interna), senão usa o token do usuário
    let user;
    if (authHeader.includes(supabaseServiceKey)) {
        // Chamada interna confiável, não precisa validar usuário
        user = { id: 'system', email: 'system@dentihub.com.br' };
    } else {
        const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
        const { data } = await supabaseAuth.auth.getUser(authHeader.replace('Bearer ', ''));
        user = data.user;
    }

    if (!user) throw new Error("Usuário não autenticado");

    let clinicName = 'DentiHub';
    let clinicEmail = 'contato@dentihub.com.br';

    // Prioridade: Dados do Body > Dados do Usuário Logado
    if (bodyClinicName) {
        clinicName = bodyClinicName;
        if (bodyClinicEmail) clinicEmail = bodyClinicEmail;
    } else if (user.id !== 'system') {
        const { data: clinic } = await supabaseAdmin.from('clinics').select('*').eq('id', user.id).single();
        if (clinic) {
            clinicName = clinic.name || 'DentiHub';
            clinicEmail = clinic.email || 'contato@dentihub.com.br';
        }
    }

    let success = false;

    // 1. SUPORTE
    if (type === 'support_ticket') {
        // Sanitização básica: message é tratado como texto puro no template
        const safeMessage = (message || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeUserName = (userName || 'Usuário').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        const htmlContent = `User: ${safeUserName} (${contactEmail})<br>Msg: ${safeMessage}`;
        await sendEmailViaResend(resendApiKey, ['contato@dentihub.com.br'], `[Suporte] ${reqSubject}`, htmlContent, 'DentiHub System', contactEmail);
        success = true;
    } 
    // 2. MARKETING EM MASSA (PERIGOSO - REQUER VALIDAÇÃO DE SUPER ADMIN)
    else if (type === 'marketing_campaign') {
        // Validação de Segurança: Verifica se o usuário é um Super Admin na tabela
        const { data: isSuperAdmin } = await supabaseAdmin
            .from('super_admins')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();

        if (!isSuperAdmin && user.id !== 'system') {
            return new Response(JSON.stringify({ error: "Não autorizado. Apenas Super Admins podem enviar campanhas customizadas." }), {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        if (recipients && Array.isArray(recipients) && reqSubject && reqHtmlContent) {
            for (const r of recipients) {
                if(r.email) {
                    try {
                        // Aqui permitimos o HTML customizado pois validamos o Admin
                        await sendEmailViaResend(resendApiKey, [r.email], reqSubject, reqHtmlContent, clinicName, clinicEmail);
                        results.count++;
                        
                        // Pequeno delay para evitar rate limit do Resend (especialmente no plano free)
                        if (recipients.length > 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
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
        // Usa templates fixos - IGNORA reqHtmlContent
        const baseUrl = 'https://dentihub.com.br';
        let subject = '';
        let htmlContent = '';

        if (subtype === 'deleted') {
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
                    <p>Caso deseje reagendar, entre em contato conosco.</p>
                </div>
            `;
        } else {
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
                        <a href="${baseUrl}/appointment-action?id=${appointment.id}&action=confirm" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">Confirmar Presença</a>
                        <a href="${baseUrl}/appointment-action?id=${appointment.id}&action=cancel" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Cancelar</a>
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
        // Usa templates fixos - IGNORA reqHtmlContent
        const { patientName, serviceName, requestedTime, dentistName, patientPhone } = requestDetails;
        
        const dateObj = new Date(requestedTime);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

        const subject = `🔔 Nova Solicitação: ${patientName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #0ea5e9; margin-top: 0;">Nova Solicitação Online 📅</h2>
                <p><strong>${patientName}</strong> solicitou um agendamento através do link público.</p>
                
                <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Contato:</strong> ${patientPhone}</p>
                    <p style="margin: 5px 0;"><strong>Serviço:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Profissional:</strong> ${dentistName}</p>
                    <p style="margin: 5px 0;"><strong>Data Solicitada:</strong> ${dateStr} às ${timeStr}</p>
                </div>
                
                <p>Acesse o sistema para aceitar ou recusar esta solicitação.</p>
                
                <div style="margin-top: 25px; text-align: center;">
                    <a href="https://dentihub.com.br/dashboard/requests" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
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
                    
                    if (recipients.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (err) {
                    console.error(`Erro ao enviar notificação para ${r.email}:`, err);
                }
            }
        }
        success = true;
    }
    // 5. NOTIFICAÇÃO PARA O PACIENTE (Solicitação Recebida)
    else if (type === 'request_received_patient' && client && requestDetails) {
        // Usa templates fixos - IGNORA reqHtmlContent
        const { patientName, serviceName, requestedTime, dentistName } = requestDetails;
        
        const dateObj = new Date(requestedTime);
        const dateStr = dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

        const subject = `Solicitação Recebida - ${clinicName}`;
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #0ea5e9;">Recebemos sua solicitação!</h2>
                <p>Olá <strong>${patientName}</strong>,</p>
                <p>Recebemos seu pedido de agendamento na <strong>${clinicName}</strong>.</p>
                
                <div style="background-color: #f0f9ff; padding: 15px; border-left: 4px solid #0ea5e9; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Profissional:</strong> ${dentistName}</p>
                    <p style="margin: 5px 0;"><strong>Procedimento:</strong> ${serviceName}</p>
                    <p style="margin: 5px 0;"><strong>Data Sugerida:</strong> ${dateStr} às ${timeStr}</p>
                </div>
                
                <p>Nossa equipe irá analisar a disponibilidade e você receberá uma confirmação por e-mail em breve.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">DentiHub - Gestão de Clínicas</p>
            </div>
        `;

        await sendEmailViaResend(resendApiKey, [client.email], subject, htmlContent, clinicName, clinicEmail);
        success = true;
    }
    // 6. CONVITE DE DENTISTA / FUNCIONÁRIO
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
                              <a href="https://dentihub.com.br/auth?view=signup" target="_blank" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Criar minha conta
                              </a>
                           </div>
                        </div>
                    </div>
                `;
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, html, clinicName, clinicEmail);
                    results.count++;
                    
                    if (recipients.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (e) {
                    console.error("Erro envio convite:", e);
                }
            }
        }
        success = true;
    }
    // 7. RECEITA / DOCUMENTO
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
    // 8. ALERTA DE ESTOQUE
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
                    <a href="https://dentihub.com.br/dashboard/inventory" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Gerenciar Estoque</a>
                </div>
            </div>
        `;
        
        for (const r of recipients) {
            if(r.email) {
                try {
                    await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                    await supabaseAdmin.from('communications').insert({
                        clinic_id: user.id !== 'system' ? user.id : (item.clinic_id), 
                        type: 'stock_alert',
                        recipient_name: r.name || 'Admin',
                        recipient_email: r.email,
                        subject: `Alerta Estoque: ${item.name}`,
                        status: 'sent'
                    });
                    results.count++;
                    
                    if (recipients.length > 1) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (e) { console.error(e); }
            }
        }
        success = true;
    }
    // 9. RECALL / WELCOME
    else if ((type === 'recall' || type === 'welcome') && recipients) {
         // Usa templates fixos - IGNORA reqHtmlContent
         const subject = type === 'recall' 
            ? `Como está o seu sorriso? 🦷 - ${clinicName}`
            : `Bem-vindo(a) ao DentiHub! 🚀`;
            
         const htmlContent = type === 'recall' 
            ? `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #f97316; padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Cuidar do sorriso é essencial! 😁</h1>
                </div>
                <div style="padding: 40px 30px; line-height: 1.6;">
                    <p style="font-size: 16px;">Olá,</p>
                    <p>Esperamos que esteja tudo bem com você!</p>
                    <p>Notamos que já faz um tempo desde sua última visita à <strong>${clinicName}</strong>. A prevenção é sempre o melhor caminho para manter sua saúde bucal em dia e evitar desconfortos futuros.</p>
                    
                    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 25px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #9a3412;"><strong>Dica de Saúde:</strong> Check-ups regulares a cada 6 meses são fundamentais para prevenir cáries, problemas gengivais e manter seu sorriso brilhante.</p>
                    </div>

                    <p>Que tal agendar uma avaliação de retorno para garantirmos que está tudo certo?</p>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://dentihub.com.br/${clinicName.toLowerCase().replace(/\s/g, '-')}" target="_blank" style="background-color: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.3);">
                            Agendar Meu Retorno Agora
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; text-align: center;">Estamos aguardando sua visita!</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">${clinicName}</p>
                    <p style="margin: 5px 0;">${clinicEmail}</p>
                </div>
            </div>`
            : `
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                <div style="background-color: #0ea5e9; padding: 40px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Bem-vindo(a) ao DentiHub! 🦷</h1>
                    <p style="color: #e0f2fe; margin-top: 10px; font-size: 16px;">Sua jornada para uma gestão brilhante começa aqui.</p>
                </div>
                <div style="padding: 40px 30px; line-height: 1.6;">
                    <p style="font-size: 16px;">Olá <strong>${recipients[0]?.name || 'Doutor(a)'}</strong>,</p>
                    <p>Ficamos muito felizes em ter você conosco! Para ajudar você a começar com o pé direito, preparamos este guia rápido com as principais funções do sistema:</p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 30px 0; border-radius: 8px;">
                        <h3 style="margin-top: 0; color: #0ea5e9; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">🚀 Guia de Início Rápido</h3>
                        
                        <div style="margin-top: 15px;">
                            <p style="margin: 0 0 5px 0;"><strong>1. Cadastrar Equipe e Funcionários:</strong></p>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá em <strong>Configurações > Gestão de Acessos</strong>.Insira o e-mail, defina o perfil (Administrador, Funcionário ou crie um novo perfil) e clique em "Convidar". Eles receberão um convite para criar o acesso.</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <p style="margin: 0 0 5px 0;"><strong>2. Editar Perfil de Acesso:</strong></p>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá até <strong>Configurações > Perfis de Acesso</strong>. Você verá a lista de perfis. Selecione as telas que deseja habilitar o acesso para cada perfil, assim como os e-mails de notificações.</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <p style="margin: 0 0 5px 0;"><strong>3. Incluir um Dentista:</strong></p>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Acesse a aba <strong>Dentistas</strong> no menu lateral. Clique em "Novo", preencha os dados do dentista, os planos aceitos, sua especialidade e os horários de atendimento. Isso é muito importante para que os pacientes consigam solicitar agendamento apenas nos horários disponíveis do dentista.</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <p style="margin: 0 0 5px 0;"><strong>4. Cadastrar um Paciente:</strong></p>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">No menu lateral, clique em <strong>Pacientes</strong> e depois no botão "Novo". Preencha os dados básicos e o CPF para garantir um histórico clínico organizado e seguro.</p>
                        </div>

                        <div style="margin-top: 15px;">
                            <p style="margin: 0 0 5px 0;"><strong>5. Fazer um Agendamento:</strong></p>
                            <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá em <strong>Agenda</strong>, escolha o dia e clique no horário desejado. Selecione o paciente, o dentista e o procedimento. Pronto! O paciente receberá um lembrete automático caso tenha cadastrado o e-mail do paciente.</p>
                        </div>
                    </div>

                    <p>Tudo isso e muito mais está detalhado no nosso Guia Prático interativo dentro do sistema.</p>

                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://dentihub.com.br/dashboard/guide" target="_blank" style="background-color: #0ea5e9; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.3);">
                            Acessar Guia Completo
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; text-align: center;">Dúvidas? Responda a este e-mail ou use o botão de ajuda no sistema.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0;">Equipe DentiHub - Gestão Inteligente para Dentistas</p>
                    <p style="margin: 5px 0;">contato@dentihub.com.br</p>
                </div>
            </div>`;

         for (const r of recipients) {
            if(!r.email) continue;
            
            try {
                const htmlContent = type === 'recall' 
                    ? `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                        <div style="background-color: #f97316; padding: 30px 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Cuidar do sorriso é essencial! 😁</h1>
                        </div>
                        <div style="padding: 40px 30px; line-height: 1.6;">
                            <p style="font-size: 16px;">Olá,</p>
                            <p>Esperamos que esteja tudo bem com você!</p>
                            <p>Notamos que já faz um tempo desde sua última visita à <strong>${clinicName}</strong>. A prevenção é sempre o melhor caminho para manter sua saúde bucal em dia e evitar desconfortos futuros.</p>
                            
                            <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 25px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #9a3412;"><strong>Dica de Saúde:</strong> Check-ups regulares a cada 6 meses são fundamentais para prevenir cáries, problemas gengivais e manter seu sorriso brilhante.</p>
                            </div>

                            <p>Que tal agendar uma avaliação de retorno para garantirmos que está tudo certo?</p>

                            <div style="text-align: center; margin: 40px 0;">
                                <a href="https://dentihub.com.br/${clinicName.toLowerCase().replace(/\s/g, '-')}" target="_blank" style="background-color: #f97316; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(249, 115, 22, 0.3);">
                                    Agendar Meu Retorno Agora
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #64748b; text-align: center;">Estamos aguardando sua visita!</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0;">${clinicName}</p>
                            <p style="margin: 5px 0;">${clinicEmail}</p>
                        </div>
                    </div>`
                    : `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                        <div style="background-color: #0ea5e9; padding: 40px 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Bem-vindo(a) ao DentiHub! 🦷</h1>
                            <p style="color: #e0f2fe; margin-top: 10px; font-size: 16px;">Sua jornada para uma gestão brilhante começa aqui.</p>
                        </div>
                        <div style="padding: 40px 30px; line-height: 1.6;">
                            <p style="font-size: 16px;">Olá <strong>${r.name || 'Doutor(a)'}</strong>,</p>
                            <p>Ficamos muito felizes em ter você conosco! Para ajudar você a começar com o pé direito, preparamos este guia rápido com as principais funções do sistema:</p>
                            
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 30px 0; border-radius: 8px;">
                                <h3 style="margin-top: 0; color: #0ea5e9; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">🚀 Guia de Início Rápido</h3>
                                
                                <div style="margin-top: 15px;">
                                    <p style="margin: 0 0 5px 0;"><strong>1. Cadastrar Equipe e Funcionários:</strong></p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá em <strong>Configurações > Gestão de Acessos</strong>.Insira o e-mail, defina o perfil (Administrador, Funcionário ou crie um novo perfil) e clique em "Convidar". Eles receberão um convite para criar o acesso.</p>
                                </div>

                                <div style="margin-top: 15px;">
                                    <p style="margin: 0 0 5px 0;"><strong>2. Editar Perfil de Acesso:</strong></p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá até <strong>Configurações > Perfis de Acesso</strong>. Você verá a lista de perfis. Selecione as telas que deseja habilitar o acesso para cada perfil, assim como os e-mails de notificações.</p>
                                </div>

                                <div style="margin-top: 15px;">
                                    <p style="margin: 0 0 5px 0;"><strong>3. Incluir um Dentista:</strong></p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Acesse a aba <strong>Dentistas</strong> no menu lateral. Clique em "Novo", preencha os dados do dentista, os planos aceitos, sua especialidade e os horários de atendimento. Isso é muito importante para que os pacientes consigam solicitar agendamento apenas nos horários disponíveis do dentista.</p>
                                </div>

                                <div style="margin-top: 15px;">
                                    <p style="margin: 0 0 5px 0;"><strong>4. Cadastrar um Paciente:</strong></p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">No menu lateral, clique em <strong>Pacientes</strong> e depois no botão "Novo". Preencha os dados básicos e o CPF para garantir um histórico clínico organizado e seguro.</p>
                                </div>

                                <div style="margin-top: 15px;">
                                    <p style="margin: 0 0 5px 0;"><strong>5. Fazer um Agendamento:</strong></p>
                                    <p style="margin: 0 0 15px 0; font-size: 14px; color: #64748b;">Vá em <strong>Agenda</strong>, escolha o dia e clique no horário desejado. Selecione o paciente, o dentista e o procedimento. Pronto! O paciente receberá um lembrete automático caso tenha cadastrado o e-mail do paciente.</p>
                                </div>
                            </div>

                            <p>Tudo isso e muito mais está detalhado no nosso Guia Prático interativo dentro do sistema.</p>

                            <div style="text-align: center; margin: 40px 0;">
                                <a href="https://dentihub.com.br/dashboard/guide" target="_blank" style="background-color: #0ea5e9; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(14, 165, 233, 0.3);">
                                    Acessar Guia Completo
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #64748b; text-align: center;">Dúvidas? Responda a este e-mail ou use o botão de ajuda no sistema.</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0;">Equipe DentiHub - Gestão Inteligente para Dentistas</p>
                            <p style="margin: 5px 0;">contato@dentihub.com.br</p>
                        </div>
                    </div>`;

                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, clinicName, clinicEmail);
                results.count++;
                
                // Pequeno delay para evitar rate limit do Resend (especialmente no plano free)
                if (recipients.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (err) {
                console.error(`Erro ao enviar ${type} para ${r.email}:`, err);
            }
         }
         success = true;
    }
    // 10. ASSINATURA CONCLUÍDA (Novo)
    else if (type === 'subscription_success' && planName) {
        const subject = `Bem-vindo ao DentiHub ${planName}! 🚀`;
        const benefits = planName.includes('Pro') 
            ? ['Pacientes Ilimitados', 'Até 5 Dentistas', 'IA Avançada'] 
            : ['Até 100 Pacientes', 'Até 3 Dentistas', 'Prontuário com IA'];
            
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
                <div style="background-color: #10b981; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Parabéns! 🎉</h1>
                    <p style="color: #ecfdf5; margin-top: 5px;">Você agora é <strong>${planName}</strong></p>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 16px;">Olá, <strong>Doutor(a)</strong>!</p>
                    <p>Ficamos muito felizes em ter você conosco. Seu plano foi atualizado com sucesso e novos recursos já estão liberados.</p>
                    
                    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #166534;">O que você desbloqueou:</h3>
                        <ul style="padding-left: 20px; margin-bottom: 0;">
                            ${benefits.map(b => `<li style="margin-bottom: 5px; color: #15803d;">✅ ${b}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://dentihub.com.br/dashboard" style="background-color: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Acessar Meu Painel
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        for (const r of recipients) {
            if (r.email) {
                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, "DentiHub", "contato@dentihub.com.br");
                results.count++;
            }
        }
        success = true;
    }
    // 11. PEDIDO DE FEEDBACK (Cancelamento/Exclusão) (Novo)
    else if (type === 'feedback_request') {
        const subject = "Sentiremos sua falta... 💭";
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #334155; margin-top: 0;">Uma pergunta rápida...</h2>
                <p>Olá,</p>
                <p>Notamos que você cancelou sua assinatura ou excluiu sua conta no DentiHub.</p>
                <p>Estamos sempre buscando melhorar e sua opinião é extremamente valiosa para nós. <strong>Poderia nos contar o motivo da sua saída?</strong></p>
                <p>Basta responder a este e-mail. Prometemos que lemos todas as respostas!</p>
                <br>
                <p style="font-size: 14px; color: #64748b;">Atenciosamente,<br>Equipe DentiHub</p>
            </div>
        `;
        
        for (const r of recipients) {
            if (r.email) {
                await sendEmailViaResend(resendApiKey, [r.email], subject, htmlContent, "Danilo do DentiHub", "contato@dentihub.com.br");
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
