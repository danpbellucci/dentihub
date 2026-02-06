
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
    'https://app.dentihub.com.br'
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

    // --- NOTIFICAÇÃO POR E-MAIL PARA A CLÍNICA ---
    try {
        // 1. Busca quais papéis (roles) devem ser notificados
        const { data: activeConfigs } = await supabaseAdmin
            .from('role_notifications')
            .select('role')
            .eq('clinic_id', clinic_id)
            .eq('notification_type', 'new_request_alert')
            .eq('is_enabled', true);

        if (activeConfigs && activeConfigs.length > 0) {
            const rolesToNotify = activeConfigs.map(c => c.role);

            // 2. Busca os usuários com esses papéis
            const { data: usersToNotify } = await supabaseAdmin
                .from('user_profiles')
                .select('email, role')
                .eq('clinic_id', clinic_id)
                .in('role', rolesToNotify);

            if (usersToNotify && usersToNotify.length > 0) {
                // 3. Busca nome do dentista (para o email)
                const { data: dentist } = await supabaseAdmin.from('dentists').select('name').eq('id', dentist_id).single();
                const dentistName = dentist?.name || 'Não especificado';

                // 4. Envia os e-mails
                // Usamos o endpoint send-emails para centralizar o layout e lógica do Resend
                const recipients = usersToNotify.map(u => ({ email: u.email }));
                
                // Chamada interna para a função de email
                // Nota: Usamos fetch para chamar a outra função edge
                const emailFunctionUrl = `${supabaseUrl}/functions/v1/send-emails`;
                
                await fetch(emailFunctionUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`, // Usa Service Key para bypassar RLS na outra ponta
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
                        }
                    })
                });
            }
        }
    } catch (notifError) {
        console.error("Erro ao enviar notificação de nova solicitação:", notifError);
        // Não falha a requisição principal, apenas loga o erro
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
