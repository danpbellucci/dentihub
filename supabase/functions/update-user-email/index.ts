
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

  // Verificar Origem
  if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(JSON.stringify({ error: "Origem não permitida." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Configuração do servidor incompleta.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Token ausente.");

    // Cliente para validar quem chama
    const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Usuário não autenticado.");

    // Verificar permissão de Admin na clínica
    const { data: requesterProfile } = await supabaseClient
        .from('user_profiles')
        .select('role, clinic_id')
        .eq('id', user.id)
        .single();

    if (!requesterProfile || requesterProfile.role !== 'administrator') {
        throw new Error("Apenas administradores podem alterar e-mails de outros usuários.");
    }

    const { oldEmail, newEmail, clinicId } = await req.json();

    if (!oldEmail || !newEmail || !clinicId) {
        throw new Error("Dados incompletos.");
    }

    if (requesterProfile.clinic_id !== clinicId) {
        throw new Error("Você não tem permissão nesta clínica.");
    }

    // Cliente Admin para operações privilegiadas
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Encontrar o usuário alvo pelo e-mail antigo
    const { data: targetProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('id, role')
        .eq('email', oldEmail)
        .eq('clinic_id', clinicId)
        .maybeSingle();

    if (!targetProfile) {
        throw new Error("Usuário não encontrado com o e-mail antigo.");
    }

    // 2. Atualizar o e-mail na tabela de Perfis
    const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .update({ email: newEmail })
        .eq('id', targetProfile.id);

    if (profileError) throw profileError;

    // 3. Atualizar o e-mail no Supabase Auth (Login Real)
    // Nota: Isso envia um e-mail de confirmação para o novo endereço por padrão do Supabase,
    // a menos que email_confirm esteja desativado ou usemos adminUpdateUser com confirm: true (se permitido).
    // Aqui assumimos atualização direta administrativa.
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetProfile.id,
        { email: newEmail, email_confirm: true } // Auto-confirmar mudança administrativa
    );

    if (authUpdateError) {
        // Reverter perfil se auth falhar (manter consistência)
        await supabaseAdmin.from('user_profiles').update({ email: oldEmail }).eq('id', targetProfile.id);
        throw new Error("Erro ao atualizar login: " + authUpdateError.message);
    }

    // LOG
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'update-user-email',
        metadata: { admin_id: user.id, target_id: targetProfile.id, old_email: oldEmail, new_email: newEmail },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, message: "E-mail atualizado com sucesso." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Erro update-user-email:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
