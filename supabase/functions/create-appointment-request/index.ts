
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br',
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Acesso negado." }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error('Configuração incompleta.');

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    let body;
    try {
        body = await req.json();
    } catch {
        throw new Error("Corpo inválido.");
    }

    const { 
        clinic_id, dentist_id, patient_name, patient_phone, 
        patient_email, patient_cpf, patient_birth_date, 
        patient_address, service_name, requested_time 
    } = body;

    // Rate Limit Check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
        .from('rate_limit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIp)
        .gte('created_at', oneHourAgo);

    if ((count || 0) >= 10) {
        return new Response(JSON.stringify({ error: "Muitas tentativas." }), { 
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }

    await supabaseAdmin.from('rate_limit_logs').insert({
        ip_address: clientIp,
        endpoint: 'appointment_request'
    });

    const { data, error: insertError } = await supabaseAdmin
        .from('appointment_requests')
        .insert({
            clinic_id, dentist_id, patient_name, patient_phone,
            patient_email, patient_cpf, patient_birth_date,
            patient_address, service_name, requested_time,
            status: 'pending'
        })
        .select().single();

    if (insertError) throw new Error("Erro ao salvar solicitação.");

    // BUSCAR DADOS DE CONTEXTO
    const { data: dentist } = await supabaseAdmin.from('dentists').select('name').eq('id', dentist_id).single();
    const dentistName = dentist?.name || 'Não especificado';

    const { data: clinicData } = await supabaseAdmin.from('clinics').select('name, email').eq('id', clinic_id).single();
    const clinicName = clinicData?.name || 'Clínica';
    const clinicEmail = clinicData?.email;

    const emailFunctionUrl = `${supabaseUrl}/functions/v1/send-emails`;

    // --- 1. NOTIFICAÇÃO PARA O PACIENTE (Recebemos seu pedido) ---
    if (patient_email) {
        try {
            await fetch(emailFunctionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'request_received_patient',
                    client: { name: patient_name, email: patient_email },
                    requestDetails: {
                        patientName: patient_name,
                        serviceName: service_name,
                        requestedTime: requested_time,
                        dentistName: dentistName
                    },
                    clinicName: clinicName,
                    clinicEmail: clinicEmail
                })
            });
        } catch (patError) {
            console.error("Falha ao notificar paciente:", patError);
        }
    }

    // --- 2. NOTIFICAÇÃO POR E-MAIL PARA A CLÍNICA ---
    try {
        // Busca quais papéis (roles) devem ser notificados
        const { data: activeConfigs } = await supabaseAdmin
            .from('role_notifications')
            .select('role')
            .eq('clinic_id', clinic_id)
            .eq('notification_type', 'new_request_alert')
            .eq('is_enabled', true);

        if (activeConfigs && activeConfigs.length > 0) {
            const rolesToNotify = activeConfigs.map(c => c.role);

            // Busca os usuários com esses papéis
            const { data: usersToNotify } = await supabaseAdmin
                .from('user_profiles')
                .select('email, role')
                .eq('clinic_id', clinic_id)
                .in('role', rolesToNotify);

            if (usersToNotify && usersToNotify.length > 0) {
                const recipients = usersToNotify.map(u => ({ email: u.email }));
                
                await fetch(emailFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'new_request_notification',
                        recipients: recipients,
                        requestDetails: {
                            patientName: patient_name,
                            serviceName: service_name,
                            requestedTime: requested_time,
                            dentistName: dentistName,
                            patientPhone: patient_phone
                        },
                        // Passa o nome da clínica explicitamente para o log ou contexto, 
                        // embora o remetente para a equipe seja fixo "DentiHub Notificações"
                        clinicName: clinicName 
                    })
                });
            }
        }
    } catch (notifError) {
        console.error("Erro ao enviar notificação de nova solicitação para clínica:", notifError);
    }

    // LOG DE USO
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'create-appointment-request',
        metadata: { clinic_id, dentist_id, client_ip: clientIp },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
    });
  }
})
