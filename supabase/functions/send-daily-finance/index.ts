
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

const formatMoney = (amount: number) => {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
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

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Variáveis de ambiente não configuradas.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const startOfTomorrow = new Date(tomorrow.toISOString().split('T')[0] + 'T00:00:00.000Z').toISOString();
    const endOfTomorrow = new Date(tomorrow.toISOString().split('T')[0] + 'T23:59:59.999Z').toISOString();
    const tomorrowLabel = formatDate(tomorrow);

    const { data: activeConfigs } = await supabase
        .from('role_notifications')
        .select('clinic_id')
        .eq('notification_type', 'finance_daily')
        .eq('is_enabled', true);
    
    if (!activeConfigs || activeConfigs.length === 0) {
        return new Response(JSON.stringify({ message: "Nenhum envio necessário." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const uniqueClinicIds = [...new Set(activeConfigs.map(c => c.clinic_id))];
    let emailsSent = 0;

    for (const clinicId of uniqueClinicIds) {
        const { data: appointments } = await supabase.from('appointments').select('amount').eq('clinic_id', clinicId).gte('start_time', startOfTomorrow).lte('start_time', endOfTomorrow).neq('status', 'cancelled');
        const projectedRevenue = appointments?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        
        const { data: expenses } = await supabase.from('transactions').select('amount').eq('clinic_id', clinicId).eq('type', 'expense').gte('date', startOfTomorrow).lte('date', endOfTomorrow);
        const projectedExpenses = expenses?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

        const { data: targetRoles } = await supabase.from('role_notifications').select('role').eq('clinic_id', clinicId).eq('notification_type', 'finance_daily').eq('is_enabled', true);
        const roles = targetRoles?.map(r => r.role) || [];
        if (roles.length === 0) continue;

        const { data: recipients } = await supabase.from('user_profiles').select('email').eq('clinic_id', clinicId).in('role', roles);
        if (!recipients || recipients.length === 0) continue;

        const { data: clinic } = await supabase.from('clinics').select('name, email').eq('id', clinicId).single();
        const clinicName = clinic?.name || 'Sua Clínica';

        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                <h2 style="color: #10b981;">Previsão Financeira 💰</h2>
                <p>Resumo para amanhã (${tomorrowLabel}):</p>
                <p>Receita Prevista: <strong>${formatMoney(projectedRevenue)}</strong></p>
                <p>Contas a Pagar: <strong>${formatMoney(projectedExpenses)}</strong></p>
            </div>
        `;

        for (const recipient of recipients) {
            try {
                await sendEmail(resendApiKey, recipient.email, `Resumo Financeiro: ${tomorrowLabel}`, htmlContent, clinicName, clinic?.email || 'contato@dentihub.com.br');
                emailsSent++;
            } catch (e) {}
        }
    }

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-daily-finance',
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
