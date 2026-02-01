
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

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(date.getHours() - 3); 
    return date.toISOString().substring(11, 16);
};

const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string, clinicName: string, replyTo: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: `${clinicName} <contato@dentihub.com.br>`, 
            to: [to],
            subject: subject,
            html: html,
            reply_to: replyTo
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Erro Resend: ${data.message || data.name}`);
    return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Variáveis de ambiente não configuradas.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const startOfTomorrow = new Date(tomorrow.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString();
    const endOfTomorrow = new Date(tomorrow.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString();
    const tomorrowLabel = formatDate(tomorrow);

    const { data: dentists, error: dentistError } = await supabase
        .from('dentists')
        .select('id, name, email, clinic_id, clinic:clinics(name, email)')
        .not('email', 'is', null);

    if (dentistError) throw dentistError;

    let emailsSent = 0;

    for (const dentist of dentists) {
        if (!dentist.email) continue;

        const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('email', dentist.email)
            .eq('clinic_id', dentist.clinic_id)
            .maybeSingle();
        
        const roleToCheck = userProfile?.role || 'dentist';

        const { data: notificationSetting } = await supabase
            .from('role_notifications')
            .select('is_enabled')
            .eq('clinic_id', dentist.clinic_id)
            .eq('role', roleToCheck)
            .eq('notification_type', 'agenda_daily')
            .maybeSingle();

        if (!notificationSetting || !notificationSetting.is_enabled) continue;

        const { data: appointments } = await supabase
            .from('appointments')
            .select(`start_time, end_time, service_name, status, client:clients(name, whatsapp)`)
            .eq('dentist_id', dentist.id)
            .gte('start_time', startOfTomorrow)
            .lte('start_time', endOfTomorrow)
            .neq('status', 'cancelled')
            .order('start_time', { ascending: true });

        if (!appointments || appointments.length === 0) continue;

        const rows = appointments.map(appt => {
            return `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px; font-weight: bold; color: #333;">${formatTime(appt.start_time)}</td>
                    <td style="padding: 10px; color: #555;">${appt.client?.name || 'Cliente Sem Nome'}</td>
                    <td style="padding: 10px; color: #555;">${appt.service_name || 'Consulta'}</td>
                    <td style="padding: 10px; font-size: 12px;">${appt.status === 'confirmed' ? '✅ Confirmado' : 'Agendado'}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #0ea5e9; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 18px;">Sua Agenda para Amanhã 📅</h1>
                    <p style="color: #e0f2fe; margin: 5px 0 0 0; font-size: 14px;">${tomorrowLabel}</p>
                </div>
                <div style="padding: 20px;">
                    <p>Olá, <strong>Dr(a). ${dentist.name}</strong>,</p>
                    <p>Aqui está o resumo dos seus atendimentos previstos para amanhã:</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                        <thead><tr style="background-color: #f8fafc; text-align: left;"><th style="padding: 10px;">Horário</th><th style="padding: 10px;">Paciente</th><th style="padding: 10px;">Procedimento</th><th style="padding: 10px;">Status</th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;

        try {
            await sendEmail(resendApiKey, dentist.email, `Agenda de Amanhã (${tomorrowLabel})`, htmlContent, dentist.clinic?.name || 'DentiHub', dentist.clinic?.email || 'contato@dentihub.com.br');
            await supabase.from('communications').insert({
                clinic_id: dentist.clinic_id,
                type: 'agenda', 
                recipient_name: dentist.name,
                recipient_email: dentist.email,
                subject: `Agenda Diária (${tomorrowLabel})`,
                status: 'sent',
                related_id: null 
            });
            emailsSent++;
        } catch (err) {
            console.error(`Falha envio agenda: ${err}`);
        }
    }

    // LOG DE USO
    await supabase.from('edge_function_logs').insert({
        function_name: 'send-daily-agenda',
        metadata: { sent_count: emailsSent },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, sent: emailsSent }), {
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
