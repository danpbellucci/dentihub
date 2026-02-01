
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dentihub.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string, fromName: string, replyTo: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: `${fromName} <contato@dentihub.com.br>`, 
            to: [to],
            subject: subject,
            html: html,
            reply_to: replyTo
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Erro Resend: ${data.message || data.name}`);
    }
    return data;
}

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() - 3); // Ajuste BRT simples para display
    return date.toISOString().substring(11, 16);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    // Janela de busca: Agendamentos que acontecem daqui a 12h (com margem de 1h para o cron)
    const rangeStart = new Date(now.getTime() + (12 * 60 * 60 * 1000));
    const rangeEnd = new Date(now.getTime() + (13 * 60 * 60 * 1000));

    console.log(`[URGENT] Buscando agendamentos entre ${rangeStart.toISOString()} e ${rangeEnd.toISOString()}`);

    // Busca apenas agendamentos com status 'scheduled' (não confirmados/cancelados)
    const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
            id, 
            start_time, 
            service_name,
            clinic_id,
            status,
            client:clients(id, name, email),
            dentist:dentists(name),
            clinic:clinics(name, whatsapp, email, address)
        `)
        .gte('start_time', rangeStart.toISOString())
        .lt('start_time', rangeEnd.toISOString()) 
        .eq('status', 'scheduled'); // CRÍTICO: Apenas quem ainda não respondeu

    if (apptError) throw apptError;

    let sentCount = 0;
    let skippedCount = 0;

    if (appointments && appointments.length > 0) {
        for (const appt of appointments) {
            if (!appt.client || !appt.client.email) {
                skippedCount++;
                continue;
            }

            // Verifica se já enviou este tipo de lembrete
            const { data: existingComm } = await supabase
                .from('communications')
                .select('id')
                .eq('related_id', appt.id)
                .eq('type', 'urgent_reminder')
                .maybeSingle();

            if (existingComm) {
                skippedCount++;
                continue;
            }

            const clinicName = appt.clinic?.name || "Clínica Odontológica";
            const patientName = appt.client.name.split(' ')[0];
            const time = formatTime(appt.start_time);
            
            const domain = 'https://dentihub.com.br';
            const confirmLink = `${domain}/#/appointment-action?id=${appt.id}&action=confirm`;
            const cancelLink = `${domain}/#/appointment-action?id=${appt.id}&action=cancel`;
            const rescheduleLink = `${domain}/#/appointment-action?id=${appt.id}&action=reschedule`;

            const htmlContent = `
                <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #fca5a5; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #ef4444; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">⏳ Confirmação Pendente</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Olá, <strong>${patientName}</strong>.</p>
                        <p>Sua consulta é daqui a pouco (aprox. 12 horas) e ainda não recebemos sua confirmação.</p>
                        
                        <div style="background-color: #fff1f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <p style="margin: 5px 0;"><strong>⏰ Horário:</strong> ${time}</p>
                            <p style="margin: 5px 0;"><strong>👨‍⚕️ Profissional:</strong> ${appt.dentist?.name}</p>
                            <p style="margin: 5px 0;"><strong>🦷 Procedimento:</strong> ${appt.service_name}</p>
                        </div>
                        
                        <p style="margin-bottom: 15px; text-align: center; font-weight: bold;">Precisamos saber se você vem para manter sua vaga:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${confirmLink}" target="_blank" style="background-color: #22c55e; color: white; padding: 14px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; margin-bottom: 10px; box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.4);">
                                ✅ Sim, eu vou!
                            </a>
                            <br>
                            <div style="margin-top: 15px; font-size: 14px;">
                                <a href="${rescheduleLink}" target="_blank" style="color: #3b82f6; text-decoration: none; margin-right: 15px; font-weight: bold;">🔄 Reagendar</a>
                                <a href="${cancelLink}" target="_blank" style="color: #ef4444; text-decoration: none; font-weight: bold;">❌ Cancelar</a>
                            </div>
                        </div>

                        <p style="font-size: 12px; color: #666; text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                            ${appt.clinic?.address || ''}<br/>
                            <a href="${domain}" style="color: #999; text-decoration: none;">DentiHub</a>
                        </p>
                    </div>
                </div>
            `;

            try {
                await sendEmail(
                    resendApiKey, 
                    appt.client.email, 
                    `⏳ Ação Necessária: Consulta às ${time} - ${clinicName}`, 
                    htmlContent, 
                    clinicName, 
                    appt.clinic?.email || 'contato@dentihub.com.br'
                );

                await supabase.from('communications').insert({
                    clinic_id: appt.clinic_id,
                    type: 'urgent_reminder',
                    recipient_name: appt.client.name,
                    recipient_email: appt.client.email,
                    subject: `Lembrete Urgente (${time})`,
                    status: 'sent',
                    related_id: appt.id
                });
                sentCount++;
            } catch (err) {
                console.error("Erro envio:", err);
            }
        }
    }

    // LOG
    await supabase.from('edge_function_logs').insert({
        function_name: 'send-urgent-reminders',
        metadata: { processed: appointments?.length || 0, sent: sentCount, skipped: skippedCount },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
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
