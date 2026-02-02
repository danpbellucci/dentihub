
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dentihub.com.br',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(apiKey: string, to: string, subject: string, html: string, clinicName: string, replyTo: string) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            from: `${clinicName} <naoresponda@dentihub.com.br>`, 
            to: [to],
            subject: subject,
            html: html,
            reply_to: replyTo
        })
    });
    if (!res.ok) throw new Error("Erro Resend");
    return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Config incompleta.");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: clients, error: rpcError } = await supabase.rpc('get_birthdays_today');

    if (rpcError) throw new Error(`Erro RPC: ${rpcError.message}`);
    if (!clients || clients.length === 0) {
        await supabase.from('edge_function_logs').insert({
            function_name: 'send-birthday-emails',
            metadata: { sent_count: 0, message: "Nenhum aniversariante" },
            status: 'success'
        });
        return new Response(JSON.stringify({ message: "Nenhum aniversariante." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    let emailsSent = 0;

    for (const client of clients) {
        if (!client.email) continue;
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase.from('communications').select('id').eq('recipient_email', client.email).eq('type', 'birthday').gte('created_at', `${todayStr}T00:00:00`).maybeSingle();
        if (existing) continue;

        const htmlContent = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                <h1 style="color: #3b82f6;">Feliz Aniversário! 🎂</h1>
                <p>Olá, <strong>${client.name.split(' ')[0]}</strong>!</p>
                <p>A <strong>${client.clinic_name || 'Clínica'}</strong> deseja muitas felicidades.</p>
            </div>
        `;

        try {
            await sendEmail(resendApiKey, client.email, `Feliz Aniversário! 🎉`, htmlContent, client.clinic_name || 'Sua Clínica', client.clinic_email || 'contato@dentihub.com.br');
            await supabase.from('communications').insert({
                clinic_id: client.clinic_id,
                type: 'birthday',
                recipient_name: client.name,
                recipient_email: client.email,
                subject: 'Feliz Aniversário!',
                status: 'sent',
                related_id: client.id
            });
            emailsSent++;
        } catch (e) {}
    }

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-birthday-emails',
        metadata: { sent_count: emailsSent },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, sent: emailsSent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
