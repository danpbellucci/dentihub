
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
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getDayName = (date: Date) => {
    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return days[date.getDay()];
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

    // --- Definição de Datas (D0 a D+7) ---
    const now = new Date();
    // Ajuste fuso horário simples (considerando que o servidor roda em UTC, ajustamos para início do dia local aproximado)
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7); // +7 dias
    endDate.setHours(23, 59, 59, 999);

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

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
        // 1. Buscar Receitas Previstas (Agendamentos)
        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_time, amount, service_name, client:clients(name)')
            .eq('clinic_id', clinicId)
            .gte('start_time', startISO)
            .lte('start_time', endISO)
            .neq('status', 'cancelled');

        // 2. Buscar Despesas Previstas (Transações)
        const { data: expenses } = await supabase
            .from('transactions')
            .select('date, amount, category, observation')
            .eq('clinic_id', clinicId)
            .eq('type', 'expense')
            .gte('date', startISO)
            .lte('date', endISO);

        // Se não houver nada, pula
        if ((!appointments || appointments.length === 0) && (!expenses || expenses.length === 0)) {
            continue;
        }

        // 3. Unificar e Agrupar Dados
        const items = [];

        // Processar Receitas
        if (appointments) {
            appointments.forEach(appt => {
                if (Number(appt.amount) > 0) {
                    items.push({
                        date: new Date(appt.start_time),
                        desc: `${appt.client?.name || 'Paciente'} - ${appt.service_name}`,
                        amount: Number(appt.amount),
                        type: 'income'
                    });
                }
            });
        }

        // Processar Despesas
        if (expenses) {
            expenses.forEach(exp => {
                items.push({
                    date: new Date(exp.date),
                    desc: `${exp.category} ${exp.observation ? `(${exp.observation})` : ''}`,
                    amount: Number(exp.amount),
                    type: 'expense'
                });
            });
        }

        // Ordenar por data
        items.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Agrupar por dia (YYYY-MM-DD)
        const groupedByDay: Record<string, typeof items> = {};
        
        items.forEach(item => {
            // Ajuste de fuso horário manual para exibição correta (UTC-3 aprox)
            const localDate = new Date(item.date.getTime() - (3 * 60 * 60 * 1000));
            const dayKey = localDate.toISOString().split('T')[0];
            if (!groupedByDay[dayKey]) groupedByDay[dayKey] = [];
            groupedByDay[dayKey].push(item);
        });

        // 4. Construir HTML da Lista
        let listHtml = '';
        const sortedDays = Object.keys(groupedByDay).sort();

        let totalPeriodBalance = 0;

        for (const dayKey of sortedDays) {
            const dayItems = groupedByDay[dayKey];
            const dateObj = new Date(dayKey + 'T12:00:00'); // Meio dia para evitar problemas de fuso no getDay
            
            let dayIncome = 0;
            let dayExpense = 0;

            let dayRows = '';
            
            dayItems.forEach(item => {
                const isIncome = item.type === 'income';
                if (isIncome) dayIncome += item.amount; else dayExpense += item.amount;
                
                dayRows += `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 8px 0; font-size: 13px; color: #334155;">
                            ${item.desc}
                        </td>
                        <td style="padding: 8px 0; font-size: 13px; text-align: right; font-weight: bold; color: ${isIncome ? '#16a34a' : '#ef4444'};">
                            ${isIncome ? '+' : '-'} ${formatMoney(item.amount)}
                        </td>
                    </tr>
                `;
            });

            const dayBalance = dayIncome - dayExpense;
            totalPeriodBalance += dayBalance;

            listHtml += `
                <div style="margin-bottom: 25px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <strong style="color: #0f172a; font-size: 14px;">${formatDate(dateObj)} - ${getDayName(dateObj)}</strong>
                        <span style="font-size: 12px; font-weight: bold; color: ${dayBalance >= 0 ? '#16a34a' : '#ef4444'};">Saldo: ${formatMoney(dayBalance)}</span>
                    </div>
                    <div style="padding: 0 15px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            ${dayRows}
                        </table>
                    </div>
                </div>
            `;
        }

        // Identificar Destinatários
        const { data: targetRoles } = await supabase.from('role_notifications').select('role').eq('clinic_id', clinicId).eq('notification_type', 'finance_daily').eq('is_enabled', true);
        const roles = targetRoles?.map(r => r.role) || [];
        if (roles.length === 0) continue;

        const { data: recipients } = await supabase.from('user_profiles').select('email').eq('clinic_id', clinicId).in('role', roles);
        if (!recipients || recipients.length === 0) continue;

        const { data: clinic } = await supabase.from('clinics').select('name, email').eq('id', clinicId).single();
        const clinicName = clinic?.name || 'Sua Clínica';

        const subject = `Previsão Financeira (7 Dias) 📅 - ${clinicName}`;

        // Template HTML Final
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                    
                    <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding: 20px;">
                        <h2 style="color: #0ea5e9; margin: 0; font-size: 22px;">Fluxo de Caixa Previsto 💰</h2>
                        <p style="color: #64748b; font-size: 14px; margin-top: 5px;">${clinicName}</p>
                    </div>

                    <div style="padding: 20px;">
                        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
                            Abaixo estão listadas todas as receitas (agendamentos) e despesas previstas para os próximos 7 dias.
                        </p>

                        ${listHtml}

                        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #bae6fd;">
                            <p style="margin: 0; font-size: 14px; color: #0369a1;">Resultado Previsto no Período</p>
                            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: ${totalPeriodBalance >= 0 ? '#0284c7' : '#ef4444'};">
                                ${formatMoney(totalPeriodBalance)}
                            </p>
                        </div>
                    </div>

                    <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
                        <p>Enviado automaticamente pelo DentiHub</p>
                        <a href="https://dentihub.com.br/#/dashboard/finance" style="color: #0ea5e9; text-decoration: none;">Acessar Financeiro Completo</a>
                    </div>
                </div>
            </div>
        `;

        for (const recipient of recipients) {
            try {
                await sendEmail(resendApiKey, recipient.email, subject, htmlContent, clinicName, clinic?.email || 'contato@dentihub.com.br');
                emailsSent++;
            } catch (e) {}
        }
    }

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-daily-finance',
        metadata: { sent_count: emailsSent, type: 'detailed_7_days' },
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
