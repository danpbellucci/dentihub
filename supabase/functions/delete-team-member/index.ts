
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
    'https://aistudio.google.com'
  ];
  
  // Define o header de CORS
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Variáveis de ambiente do Supabase não configuradas.");
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error("Token de autorização ausente.");
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
        return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });
    }

    const { data: requesterProfile } = await supabaseClient
        .from('user_profiles')
        .select('role, clinic_id')
        .eq('id', user.id)
        .single();

    if (!requesterProfile || requesterProfile.role !== 'administrator') {
        throw new Error("Apenas administradores podem remover membros da equipe.");
    }

    let body;
    try {
        body = await req.json();
    } catch {
        throw new Error("Corpo da requisição inválido.");
    }

    const { userId } = body;
    
    if (!userId) {
        throw new Error("ID do usuário a ser removido é obrigatório.");
    }

    if (userId === user.id) {
        throw new Error("Você não pode remover a si mesmo.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: targetProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('email, role')
        .eq('id', userId)
        .maybeSingle();

    if (targetProfile) {
        if (targetProfile.role === 'dentist' && targetProfile.email) {
            console.log(`Desvinculando e-mail ${targetProfile.email} da tabela de dentistas...`);
            await supabaseAdmin
                .from('dentists')
                .update({ email: null })
                .eq('email', targetProfile.email)
                .eq('clinic_id', requesterProfile.clinic_id);
        }
    }

    const { error: deleteError } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('id', userId);

    if (deleteError) {
        throw deleteError;
    }

    // LOG DE USO
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'delete-team-member',
        metadata: { requester_id: user.id, deleted_user_id: userId, clinic_id: requesterProfile.clinic_id },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, message: "Membro removido com sucesso." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[DELETE-TEAM-MEMBER] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, 
    });
  }
});
