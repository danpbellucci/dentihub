
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

    if (!supabaseUrl || !serviceRoleKey) throw new Error('Configuração incompleta.');

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
