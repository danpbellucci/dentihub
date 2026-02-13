
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

const formatMoney = (amount: number) => {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const data = await res.json();
    if (!res.ok) throw new Error(`Erro Resend: ${data.message || data.name}`);
    return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseKey || !resendApiKey) throw new Error("Variáveis de ambiente não configuradas.");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Definição de Datas (Mês Anterior Completo) ---
    const now = new Date();
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    
    const startISO = startOfPrevMonth.toISOString();
    const endISO = endOfPrevMonth.toISOString();
    
    const monthLabel = startOfPrevMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    console.log(`[MONTHLY REPORT] Gerando para: ${monthLabel}`);

    // Busca configurações ativas (Reutilizando a flag finance_daily conforme solicitado)
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
        // 1. Métricas de Agendamento
        const { count: totalAppts } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('start_time', startISO)
            .lte('start_time', endISO);

        const { count: completedAppts } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'completed')
            .gte('start_time', startISO)
            .lte('start_time', endISO);

        // 2. Métricas Financeiras
        const { data: transactions } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('clinic_id', clinicId)
            .gte('date', startISO)
            .lte('date', endISO);

        let totalIncome = 0;
        let totalExpense = 0;
        
        transactions?.forEach(t => {
            if (t.type === 'income') totalIncome += Number(t.amount);
            else totalExpense += Number(t.amount);
        });

        const balance = totalIncome - totalExpense;

        // 3. Uso de IA (Registros Clínicos Criados)
        const { count: aiUsage } = await supabase
            .from('clinical_records')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('created_at', startISO)
            .lte('created_at', endISO);

        // 4. Inventário (Lista Completa)
        const { data: inventory } = await supabase
            .from('inventory_items')
            .select('name, quantity, min_quantity, unit')
            .eq('clinic_id', clinicId)
            .order('name');

        // Formatação da Tabela de Estoque
        let inventoryRows = '';
        if (inventory && inventory.length > 0) {
            inventoryRows = inventory.map(item => {
                const isLow = item.quantity <= item.min_quantity;
                return `
                    <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${isLow ? '#fff1f2' : 'transparent'};">
                        <td style="padding: 8px; font-size: 12px; color: #334155;">${item.name}</td>
                        <td style="padding: 8px; font-size: 12px; text-align: right; color: #334155;">
                            <span style="${isLow ? 'color: #ef4444; font-weight: bold;' : ''}">${item.quantity}</span> 
                            <span style="color: #94a3b8; font-size: 10px;">/ ${item.unit || 'un'}</span>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            inventoryRows = '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #94a3b8; font-size: 12px;">Estoque vazio.</td></tr>';
        }

        // Identificar Destinatários
        const { data: targetRoles } = await supabase.from('role_notifications').select('role').eq('clinic_id', clinicId).eq('notification_type', 'finance_daily').eq('is_enabled', true);
        const roles = targetRoles?.map(r => r.role) || [];
        if (roles.length === 0) continue;

        const { data: recipients } = await supabase.from('user_profiles').select('email').eq('clinic_id', clinicId).in('role', roles);
        if (!recipients || recipients.length === 0) continue;

        const { data: clinic } = await supabase.from('clinics').select('name, email').eq('id', clinicId).single();
        const clinicName = clinic?.name || 'Sua Clínica';

        // Template HTML
        const htmlContent = `
            <div style="font-family: Helvetica, Arial, sans-serif; color: #333; padding: 20px; background-color: #f8fafc;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
                    
                    <div style="text-align: center; border-bottom: 1px solid #e2e8f0; padding: 25px;">
                        <h2 style="color: #0f172a; margin: 0; font-size: 24px;">Resumo Mensal 📊</h2>
                        <p style="color: #64748b; font-size: 16px; margin-top: 5px; text-transform: capitalize;">${monthLabel}</p>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 0;">${clinicName}</p>
                    </div>

                    <div style="padding: 30px;">
                        
                        <!-- Cards Principais -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
                            <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0;">
                                <p style="margin: 0; font-size: 12px; color: #166534; text-transform: uppercase; font-weight: bold;">Resultado Financeiro</p>
                                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: ${balance >= 0 ? '#15803d' : '#ef4444'};">
                                    ${formatMoney(balance)}
                                </p>
                            </div>
                            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; border: 1px solid #bae6fd;">
                                <p style="margin: 0; font-size: 12px; color: #075985; text-transform: uppercase; font-weight: bold;">Consultas Realizadas</p>
                                <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #0369a1;">
                                    ${completedAppts || 0} <span style="font-size: 12px; font-weight: normal; color: #64748b;">/ ${totalAppts || 0}</span>
                                </p>
                            </div>
                        </div>

                        <!-- Detalhamento -->
                        <h3 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #334155;">Detalhes Operacionais</h3>
                        
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                            <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Entradas (Receita)</td>
                                <td style="padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold; color: #16a34a;">+ ${formatMoney(totalIncome)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Saídas (Despesa)</td>
                                <td style="padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold; color: #ef4444;">- ${formatMoney(totalExpense)}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Prontuários Gerados (IA)</td>
                                <td style="padding: 8px 0; font-size: 14px; text-align: right; font-weight: bold; color: #6366f1;">${aiUsage || 0}</td>
                            </tr>
                        </table>

                        <!-- Estoque -->
                        <h3 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #334155;">Posição de Estoque (Atual)</h3>
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background-color: #f1f5f9;">
                                    <tr>
                                        <th style="padding: 8px; font-size: 11px; text-align: left; color: #64748b; text-transform: uppercase;">Item</th>
                                        <th style="padding: 8px; font-size: 11px; text-align: right; color: #64748b; text-transform: uppercase;">Qtd.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${inventoryRows}
                                </tbody>
                            </table>
                        </div>

                    </div>

                    <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                        <p>Enviado automaticamente pelo DentiHub</p>
                        <a href="https://dentihub.com.br/#/dashboard" style="color: #0ea5e9; text-decoration: none;">Acessar Painel</a>
                    </div>
                </div>
            </div>
        `;

        const subject = `Resumo Mensal de ${monthLabel} 📅 - ${clinicName}`;

        for (const recipient of recipients) {
            try {
                await sendEmail(resendApiKey, recipient.email, subject, htmlContent, clinicName, clinic?.email || 'contato@dentihub.com.br');
                emailsSent++;
            } catch (e) {
                console.error(`Falha envio ${recipient.email}:`, e);
            }
        }
    }

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-monthly-report',
        metadata: { sent_count: emailsSent, month: monthLabel },
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
