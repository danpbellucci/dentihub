
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

// Helper para somar valores de um array de objetos
const sumAmount = (data: any[]) => {
    return data?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
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

    // --- Definição de Datas ---
    const now = new Date();
    
    // Hoje
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const todayLabel = formatDate(now);

    // Amanhã
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0).toISOString();
    const endOfTomorrow = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59).toISOString();
    const tomorrowLabel = formatDate(tomorrow);

    // Semana (Domingo a Sábado atual)
    const currentDay = now.getDay(); // 0 (Domingo) a 6 (Sábado)
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - currentDay); // Volta para Domingo
    startOfWeekDate.setHours(0,0,0,0);
    
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6); // Vai até Sábado
    endOfWeekDate.setHours(23,59,59,999);

    const startOfWeek = startOfWeekDate.toISOString();
    const endOfWeek = endOfWeekDate.toISOString();

    // Busca configurações ativas
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
        // --- Queries em Paralelo para Performance ---
        // Entradas (Agendamentos não cancelados) e Saídas (Transações de despesa)
        
        const incomeQuery = (start: string, end: string) => 
            supabase.from('appointments').select('amount').eq('clinic_id', clinicId).gte('start_time', start).lte('start_time', end).neq('status', 'cancelled');
        
        const expenseQuery = (start: string, end: string) => 
            supabase.from('transactions').select('amount').eq('clinic_id', clinicId).eq('type', 'expense').gte('date', start).lte('date', end);

        const [
            { data: todayIncomeData }, { data: todayExpenseData },
            { data: tomIncomeData }, { data: tomExpenseData },
            { data: weekIncomeData }, { data: weekExpenseData }
        ] = await Promise.all([
            incomeQuery(startOfToday, endOfToday),
            expenseQuery(startOfToday, endOfToday),
            incomeQuery(startOfTomorrow, endOfTomorrow),
            expenseQuery(startOfTomorrow, endOfTomorrow),
            incomeQuery(startOfWeek, endOfWeek),
            expenseQuery(startOfWeek, endOfWeek)
        ]);

        // Cálculos
        const valTodayIn = sumAmount(todayIncomeData || []);
        const valTodayOut = sumAmount(todayExpenseData || []);
        const valTodayBal = valTodayIn - valTodayOut;

        const valTomIn = sumAmount(tomIncomeData || []);
        const valTomOut = sumAmount(tomExpenseData || []);
        const valTomBal = valTomIn - valTomOut;

        const valWeekIn = sumAmount(weekIncomeData || []);
        const valWeekOut = sumAmount(weekExpenseData || []);
        const valWeekBal = valWeekIn - valWeekOut;

        // SUPRESSÃO DE ENVIO:
        // Se não houver movimentação financeira na semana inteira (R$ 0,00), não envia o email.
        if (valWeekIn === 0 && valWeekOut === 0) {
            continue;
        }

        // Identificar Destinatários
        const { data: targetRoles } = await supabase.from('role_notifications').select('role').eq('clinic_id', clinicId).eq('notification_type', 'finance_daily').eq('is_enabled', true);
        const roles = targetRoles?.map(r => r.role) || [];
        if (roles.length === 0) continue;

        const { data: recipients } = await supabase.from('user_profiles').select('email').eq('clinic_id', clinicId).in('role', roles);
        if (!recipients || recipients.length === 0) continue;

        const { data: clinic } = await supabase.from('clinics').select('name, email').eq('id', clinicId).single();
        const clinicName = clinic?.name || 'Sua Clínica';

        // Template HTML Melhorado
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
                <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                    <h2 style="color: #10b981; margin: 0;">Resumo Financeiro 💰</h2>
                    <p style="color: #64748b; font-size: 14px; margin-top: 5px;">${clinicName}</p>
                </div>

                <!-- HOJE -->
                <div style="margin-bottom: 25px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">📅 Hoje (${todayLabel})</h3>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p style="margin: 5px 0;">Entradas Previstas: <strong style="color: #10b981;">${formatMoney(valTodayIn)}</strong></p>
                        <p style="margin: 5px 0;">Contas a Pagar: <strong style="color: #ef4444;">${formatMoney(valTodayOut)}</strong></p>
                        <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
                            <p style="margin: 0; font-size: 15px;">Saldo do Dia: <strong>${formatMoney(valTodayBal)}</strong></p>
                        </div>
                    </div>
                </div>

                <!-- AMANHÃ -->
                <div style="margin-bottom: 25px;">
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">⏩ Amanhã (${tomorrowLabel})</h3>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
                        <p style="margin: 5px 0;">Entradas Previstas: <strong style="color: #10b981;">${formatMoney(valTomIn)}</strong></p>
                        <p style="margin: 5px 0;">Contas a Pagar: <strong style="color: #ef4444;">${formatMoney(valTomOut)}</strong></p>
                        <div style="border-top: 1px solid #e2e8f0; margin-top: 10px; padding-top: 10px;">
                            <p style="margin: 0; font-size: 15px;">Saldo Previsto: <strong>${formatMoney(valTomBal)}</strong></p>
                        </div>
                    </div>
                </div>

                <!-- SEMANA -->
                <div>
                    <h3 style="margin: 0 0 10px 0; color: #0f172a; font-size: 16px;">📊 Esta Semana (Dom - Sáb)</h3>
                    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <p style="margin: 5px 0;">Total Entradas: <strong style="color: #10b981;">${formatMoney(valWeekIn)}</strong></p>
                        <p style="margin: 5px 0;">Total Saídas: <strong style="color: #ef4444;">${formatMoney(valWeekOut)}</strong></p>
                        <div style="border-top: 1px solid #bfdbfe; margin-top: 10px; padding-top: 10px;">
                            <p style="margin: 0; font-size: 16px;">Saldo da Semana: <strong style="color: #0f172a;">${formatMoney(valWeekBal)}</strong></p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8;">
                    <p>Enviado automaticamente pelo DentiHub</p>
                </div>
            </div>
        `;

        for (const recipient of recipients) {
            try {
                await sendEmail(resendApiKey, recipient.email, `Resumo Financeiro - ${clinicName}`, htmlContent, clinicName, clinic?.email || 'contato@dentihub.com.br');
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
