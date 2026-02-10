
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server configuration error: Keys missing.");
    }

    // 1. Authenticate Request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Create client with Service Role to bypass RLS for deletion
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify the user making the request
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
        return new Response(JSON.stringify({ error: "Invalid user session." }), { status: 401, headers: corsHeaders });
    }

    console.log(`[DELETE ACCOUNT] Request from user: ${user.id}`);

    // 2. Check if User is Admin of a Clinic (To get the correct Clinic ID)
    const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('clinic_id, role')
        .eq('id', user.id)
        .single();

    if (!userProfile) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
        return new Response(JSON.stringify({ success: true, message: "User deleted (no profile found)." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (userProfile.role !== 'administrator') {
        return new Response(JSON.stringify({ error: "Only administrators can delete the account." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clinicId = userProfile.clinic_id;
    console.log(`[DELETE ACCOUNT] Deleting Clinic: ${clinicId}`);

    // Enviar E-mail de Feedback (Antes de deletar)
    if (user.email) {
        try {
            await fetch(`${supabaseUrl}/functions/v1/send-emails`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceRoleKey}`
                },
                body: JSON.stringify({
                    type: 'feedback_request',
                    recipients: [{ email: user.email }]
                })
            });
        } catch (emailErr) {
            console.error("Falha ao enviar email de feedback (deleção):", emailErr);
        }
    }

    // LOG DE USO (Antes de deletar)
    await supabaseAdmin.from('edge_function_logs').insert({
        function_name: 'delete-account',
        metadata: { deleted_user_id: user.id, clinic_id: clinicId },
        status: 'success'
    });

    // 3. Delete Data
    const { error: deleteClinicError } = await supabaseAdmin
        .from('clinics')
        .delete()
        .eq('id', clinicId);

    if (deleteClinicError) {
        console.error("Error deleting clinic:", deleteClinicError);
        console.log("Fallback: Manual deletion sequence...");
        await supabaseAdmin.from('communications').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('transactions').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('clinical_records').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('appointments').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('appointment_requests').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('clients').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('dentists').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('user_profiles').delete().eq('clinic_id', clinicId);
        await supabaseAdmin.from('clinics').delete().eq('id', clinicId);
    }

    // 4. Delete the Auth User
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthError) {
        console.error("Error deleting auth user:", deleteAuthError);
        throw new Error("Data deleted, but failed to remove login account.");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("[DELETE ACCOUNT] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
