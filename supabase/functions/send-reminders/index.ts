
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dentihub.com.br', // Cron jobs não tem origin browser, mas definimos o padrão
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para enviar email
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
    date.setHours(date.getHours() - 3); 
    return date.toISOString().substring(11, 16);
};

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() - 3);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
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
    const rangeStart = new Date(now.getTime() + (23 * 60 * 60 * 1000));
    const rangeEnd = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    console.log(`[REMINDERS] Job iniciado em: ${now.toISOString()}`);

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
        .in('status', ['scheduled', 'confirmed']);

    if (apptError) throw apptError;

    let sentCount = 0;
    let skippedCount = 0;
    let errorsCount = 0;

    if (appointments && appointments.length > 0) {
        for (const appt of appointments) {
            if (!appt.client || !appt.client.email) {
                skippedCount++;
                continue;
            }

            const { data: existingComm } = await supabase
                .from('communications')
                .select('id')
                .eq('related_id', appt.id)
                .eq('type', 'reminder')
                .maybeSingle();

            if (existingComm) {
                skippedCount++;
                continue;
            }

            const clinicName = appt.clinic?.name || "Clínica Odontológica";
            const clinicWhatsapp = appt.clinic?.whatsapp || "";
            const patientName = appt.client.name.split(' ')[0];
            const time = formatTime(appt.start_time);
            const date = formatDate(appt.start_time);
            const dentistName = appt.dentist?.name || "Dentista";

            const htmlContent = `
                <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 20px;">Lembrete de Consulta 🦷</h1>
                    </div>
                    <div style="padding: 20px;">
                        <p style="font-size: 16px;">Olá, <strong>${patientName}</strong>!</p>
                        <p>Lembramos que sua consulta é amanhã.</p>
                        <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
                            <p style="margin: 5px 0;"><strong>🗓 Data:</strong> Amanhã, ${date}</p>
                            <p style="margin: 5px 0;"><strong>⏰ Horário:</strong> ${time}</p>
                            <p style="margin: 5px 0;"><strong>👨‍⚕️ Profissional:</strong> ${dentistName}</p>
                            <p style="margin: 5px 0;"><strong>🦷 Procedimento:</strong> ${appt.service_name}</p>
                        </div>
                        <p>Caso não possa comparecer, por favor, avise-nos com antecedência.</p>
                        ${clinicWhatsapp ? `<p style="text-align: center; margin-top: 30px;"><a href="https://wa.me/55${clinicWhatsapp.replace(/\D/g,'')}" style="background-color: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirmar no WhatsApp</a></p>` : ''}
                    </div>
                </div>
            `;

            try {
                await sendEmail(resendApiKey, appt.client.email, `Lembrete: Consulta Amanhã às ${time} - ${clinicName}`, htmlContent, clinicName, appt.clinic?.email || 'contato@dentihub.com.br');
                await supabase.from('communications').insert({
                    clinic_id: appt.clinic_id,
                    type: 'reminder',
                    recipient_name: appt.client.name,
                    recipient_email: appt.client.email,
                    subject: `Lembrete de Consulta (${date} - ${time})`,
                    status: 'sent',
                    related_id: appt.id
                });
                sentCount++;
            } catch (err) {
                errorsCount++;
            }
        }
    }

    // LOG DE USO
    await supabase.from('edge_function_logs').insert({
        function_name: 'send-reminders',
        metadata: { processed: appointments?.length || 0, sent: sentCount, skipped: skippedCount, errors: errorsCount },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, processed: appointments?.length || 0, sent: sentCount, skipped: skippedCount, errors: errorsCount }), {
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
