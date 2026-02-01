
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

// Utils slug
const sanitizeSlug = (text: string) => {
    if (!text) return '';
    return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
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

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) throw new Error("Configuração incompleta.");

    const { email: rawEmail, password, code, name } = await req.json();
    if (!rawEmail || !password || !code) throw new Error("Dados incompletos.");
    
    // Normalizar email para evitar problemas de case sensitive
    const email = rawEmail.toLowerCase().trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Verificar Código
    const { data: verification } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();

    if (!verification) {
        return new Response(JSON.stringify({ error: "Código inválido ou expirado." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200
        });
    }

    // 2. Criar Usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email, password: password, email_confirm: true, user_metadata: { full_name: name }
    });

    if (authError || !authUser.user) throw authError || new Error("Falha ao criar usuário.");
    const userId = authUser.user.id;

    // 3. Verificar se é um Usuário Convidado (Funcionário/Dentista)
    // Se o email já existe em user_profiles, significa que foi convidado.
    const { data: invitedProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role, clinic_id')
        .eq('email', email)
        .maybeSingle();

    if (invitedProfile) {
        // CENÁRIO A: USUÁRIO CONVIDADO
        // Atualizamos o ID do perfil existente (que era um placeholder ou uuid antigo) para o novo ID do Auth.
        // Mantemos o role e clinic_id originais do convite.
        
        console.log(`Vinculando usuário convidado ${email} ao perfil existente.`);
        
        // Atualiza usando o e-mail como chave, pois o ID antigo não é o do Auth
        const { error: linkError } = await supabaseAdmin
            .from('user_profiles')
            .update({ id: userId }) 
            .eq('email', email);

        if (linkError) {
            // Rollback: Se falhar ao vincular, deleta o usuário do Auth para não ficar órfão
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw new Error("Erro ao vincular perfil convidado: " + linkError.message);
        }

    } else {
        // CENÁRIO B: NOVO DONO DE CLÍNICA (Sign Up Padrão)
        // Cria uma nova clínica e um novo perfil de administrador.
        
        console.log(`Criando nova clínica para ${email}.`);

        let clinicName = name && name.trim() ? name.trim() : 'Minha Clínica';
        let slug = sanitizeSlug(name || 'clinica');
        const { data: existingSlug } = await supabaseAdmin.from('clinics').select('id').eq('slug', slug).maybeSingle();
        if (existingSlug) slug = `${slug}-${Math.floor(Math.random()*1000)}`;

        const { error: clinicError } = await supabaseAdmin
            .from('clinics')
            .insert({ id: userId, name: clinicName, slug: slug, subscription_tier: 'free' });

        if (clinicError) {
            await supabaseAdmin.auth.admin.deleteUser(userId);
            throw clinicError;
        }

        await supabaseAdmin.from('user_profiles').insert({
            id: userId, email: email, role: 'administrator', clinic_id: userId
        });
    }

    // 4. Limpeza
    await supabaseAdmin.from('verification_codes').delete().eq('email', email);

    // LOG DE USO
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'complete-signup',
        metadata: { user_id: userId, email, type: invitedProfile ? 'invite_accepted' : 'new_clinic' },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, message: "Conta criada!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });

  } catch (error: any) {
    console.error("Erro complete-signup:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  }
});
