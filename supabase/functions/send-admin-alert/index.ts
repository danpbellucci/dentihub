
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
        throw new Error("API Key do Resend não configurada.");
    }

    const { function_name, error_details, metadata, created_at } = await req.json();
    const adminEmail = Deno.env.get('ADMIN_EMAIL'); 

    if (!adminEmail) {
        throw new Error("ADMIN_EMAIL não configurada.");
    }

    const htmlContent = `
        <div style="font-family: monospace; padding: 20px; border: 2px solid #ef4444; border-radius: 8px; background-color: #fff1f2; color: #7f1d1d;">
            <h2 style="margin-top: 0; color: #b91c1c;">🚨 Alerta de Falha Crítica</h2>
            <p>Uma função do sistema falhou e requer atenção.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr>
                    <td style="padding: 8px; border: 1px solid #fecaca; font-weight: bold;">Função:</td>
                    <td style="padding: 8px; border: 1px solid #fecaca;">${function_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #fecaca; font-weight: bold;">Data/Hora:</td>
                    <td style="padding: 8px; border: 1px solid #fecaca;">${new Date(created_at).toLocaleString('pt-BR')}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #fecaca; font-weight: bold;">Status:</td>
                    <td style="padding: 8px; border: 1px solid #fecaca; color: red; font-weight: bold;">FAILED / ERROR</td>
                </tr>
            </table>

            <div style="margin-top: 20px; background-color: #1e293b; color: #e2e8f0; padding: 15px; border-radius: 6px; overflow-x: auto;">
                <strong>Metadata / Detalhes:</strong><br/>
                <pre>${JSON.stringify(metadata || error_details, null, 2)}</pre>
            </div>

            <p style="font-size: 12px; margin-top: 20px; color: #991b1b;">Este é um alerta automático do DentiHub.</p>
        </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
            from: "DentiHub Alert <naoresponda@dentihub.com.br>",
            to: [adminEmail],
            subject: `[ALERTA] Falha na função: ${function_name}`,
            html: htmlContent
        })
    });

    if (!res.ok) {
        const errData = await res.json();
        console.error("Falha ao enviar alerta:", errData);
        throw new Error("Erro ao enviar e-mail de alerta.");
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error: any) {
    console.error("Erro interno no alerta:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
