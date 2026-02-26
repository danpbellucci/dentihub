
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  
  // HARDENED SECURITY: Localhost removido
  const allowedOrigins = [
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br',
    'https://dentihub.vercel.app',
    'https://aistudio.google.com'
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

    const { email: rawEmail, clinicName, role } = body;

    if (!rawEmail) throw new Error("Email obrigatório.");
    
    // Normalizar email
    const email = rawEmail.toLowerCase().trim();

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

    // Tradução amigável da role
    let roleDisplay = 'Funcionário';
    if (inviteRole === 'dentist') roleDisplay = 'Dentista';
    if (inviteRole === 'administrator') roleDisplay = 'Administrador';

    if (!['dentist', 'administrator', 'employee'].includes(inviteRole)) {
         const { data: roleData } = await supabaseAdmin.from('clinic_roles').select('label').eq('name', inviteRole).eq('clinic_id', clinicId).maybeSingle();
         if (roleData) roleDisplay = roleData.label;
         else roleDisplay = inviteRole; 
    }

    // Envio de Email com Layout Novo
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: `${finalClinicName} <naoresponda@dentihub.com.br>`,
            to: [email],
            subject: `Convite: Junte-se à equipe da ${finalClinicName}`,
            html: `
                <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                    <!-- Header -->
                    <div style="background-color: #0ea5e9; padding: 30px 20px; text-align: center;">
                       <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${finalClinicName}</h1>
                    </div>

                    <!-- Body -->
                    <div style="padding: 40px 30px; color: #334155; line-height: 1.6; text-align: center;">
                       <h2 style="color: #0f172a; margin-top: 0;">Você foi convidado(a)!</h2>
                       
                       <p style="margin-bottom: 20px;">Olá!</p>
                       
                       <p>A clínica <strong>${finalClinicName}</strong> convidou você para acessar a plataforma DentiHub com o perfil de <strong>${roleDisplay}</strong>.</p>
                       
                       <p>Para começar, clique no botão abaixo e crie sua conta:</p>

                       <div style="margin: 35px 0;">
                          <a href="https://dentihub.com.br/auth?view=signup" target="_blank" style="background-color: #0ea5e9; color: #ffffff; padding: 12px 24px; font-family: Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Criar minha conta
                          </a>
                       </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                       <p style="margin: 0;">Enviado por DentiHub para ${finalClinicName}</p>
                    </div>
                </div>
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
