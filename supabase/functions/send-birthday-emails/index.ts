
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br',
    'https://aistudio.google.com'
  ];
  const isDev = origin?.endsWith('.run.app') || origin?.includes('localhost');
  const corsOrigin = (origin && (allowedOrigins.includes(origin) || isDev)) ? origin : 'https://dentihub.com.br';
  
  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
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
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background-color: #0ea5e9; padding: 50px 20px; text-align: center; background-image: linear-gradient(to bottom right, #0ea5e9, #0284c7);">
                    <div style="font-size: 64px; margin-bottom: 15px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">🎉</div>
                    <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">Feliz Aniversário!</h1>
                </div>
                
                <!-- Body -->
                <div style="padding: 45px 35px; color: #334155; line-height: 1.8; text-align: center;">
                    <p style="font-size: 20px; margin-top: 0; color: #0f172a;">Olá, <strong>${client.name.split(' ')[0]}</strong>!</p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">Hoje o dia é todo seu e nós da <strong>${client.clinic_name || 'nossa clínica'}</strong> não poderíamos deixar passar em branco!</p>
                    
                    <p style="font-size: 16px; margin-bottom: 30px;">Desejamos que seu novo ciclo seja repleto de sorrisos contagiantes, saúde plena e muitas conquistas. Que a alegria de hoje se repita em cada dia do seu ano.</p>
                    
                    <!-- Quote Box -->
                    <div style="margin: 40px 0; padding: 25px; background-color: #f0f9ff; border-radius: 16px; border: 1px solid #e0f2fe;">
                        <p style="margin: 0; color: #0369a1; font-style: italic; font-size: 16px;">"O sorriso é o cartão de visitas da alma, e o seu merece ser celebrado hoje e sempre."</p>
                    </div>
                    
                    <p style="font-size: 15px; color: #64748b; margin-bottom: 0;">Com carinho,</p>
                    <p style="font-size: 18px; font-weight: 700; color: #0ea5e9; margin: 5px 0 0 0;">Equipe ${client.clinic_name || 'DentiHub'}</p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; padding: 25px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                    <p style="margin: 0 0 8px 0;">Mensagem enviada por <strong>${client.clinic_name || 'sua clínica'}</strong> através da plataforma DentiHub.</p>
                    <p style="margin: 0;">&copy; ${new Date().getFullYear()} DentiHub. Todos os direitos reservados.</p>
                </div>
            </div>
        `;

        try {
            const replyTo = client.clinic_email && client.clinic_email !== 'contato@dentihub.com.br' 
                ? client.clinic_email 
                : undefined;

            await sendEmail(resendApiKey, client.email, `Feliz Aniversário! 🎉`, htmlContent, client.clinic_name || 'Sua Clínica', replyTo as any);
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
