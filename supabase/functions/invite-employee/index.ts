
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // BLOQUEIO DE SEGURANÇA RIGOROSO
  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Acesso negado: Origem não autorizada." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  }

  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!serviceRoleKey || !supabaseUrl || !anonKey || !resendApiKey) {
      throw new Error("Erro de configuração do servidor.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401
        });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
        return new Response(JSON.stringify({ error: "Sessão inválida." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401
        });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error("Payload inválido.");
    }

    const { email, clinicName, role } = body;

    if (!email) throw new Error("Email obrigatório.");

    const inviteRole = role || 'employee';

    // Validação de Permissão
    const { data: userProfile } = await supabaseAuth
        .from('user_profiles')
        .select('clinic_id, role')
        .eq('id', user.id)
        .maybeSingle();
    
    let clinicId = null;
    let finalClinicName = clinicName;

    if (userProfile && userProfile.clinic_id) {
        clinicId = userProfile.clinic_id;
        const { data: cData } = await supabaseAuth.from('clinics').select('name').eq('id', clinicId).single();
        if (cData) finalClinicName = cData.name;
        
        if (inviteRole === 'administrator' && userProfile.role !== 'administrator') {
                throw new Error("Permissão insuficiente.");
        }
    } else {
        // Fallback para Owner sem profile (caso raro)
        const { data: clinicAsOwner } = await supabaseAuth.from('clinics').select('id, name').eq('id', user.id).maybeSingle();
        if (clinicAsOwner) {
            clinicId = clinicAsOwner.id;
            finalClinicName = clinicAsOwner.name || 'DentiHub';
        } else {
            throw new Error("Usuário sem vínculo.");
        }
    }

    if (!clinicId) throw new Error("Clínica não identificada.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: existingProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id')
        .eq('email', email)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    if (existingProfile) {
        return new Response(JSON.stringify({ error: "Este e-mail já está cadastrado nesta clínica." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });
    }

    const { error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
            email: email,
            role: inviteRole,
            clinic_id: clinicId
        });

    if (insertError) {
        console.error("Erro DB:", insertError.message);
        throw new Error("Erro ao registrar no banco.");
    }

    // Envio de Email
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: `${finalClinicName} <contato@dentihub.com.br>`,
            to: [email],
            subject: `Convite: ${finalClinicName}`,
            html: `
                <p>Olá,</p>
                <p>Você foi convidado para a equipe de <strong>${finalClinicName}</strong>.</p>
                <p><a href="https://dentihub.com.br/#/auth">Clique aqui para acessar ou criar sua conta</a></p>
            `,
            reply_to: 'contato@dentihub.com.br'
        })
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Erro Resend:", errData.name);
        throw new Error("Falha no envio de e-mail.");
    }

    // LOG DE USO
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'invite-employee',
        metadata: { clinic_id: clinicId, invited_email: email, role: inviteRole, invited_by: user.id },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[INVITE-ERR]", error.message);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
