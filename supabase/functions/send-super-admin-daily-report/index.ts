
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

Deno.serve(async (req) => {
  // Configuração de CORS Segura
  const origin = req.headers.get('origin') ?? '';
  const allowedOrigins = [
    'http://localhost:5173', 
    'https://dentihub.com.br', 
    'https://www.dentihub.com.br', 
    'https://app.dentihub.com.br'
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : 'https://dentihub.com.br';

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    const adminEmail = 'danilobellucci@gmail.com'; 

    if (!supabaseUrl || !supabaseKey || !resendApiKey) {
        throw new Error("Variáveis de ambiente não configuradas.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    const dateLabel = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    console.log(`[REPORT] Gerando relatório para: ${dateLabel}`);

    const [
        { count: newClinics },
        { count: newPatients },
        { count: newDentists },
        { count: newAppointments },
        { count: newAIRecords },
        { count: emailsSent },
        { data: transactionsData }
    ] = await Promise.all([
        supabase.from('clinics').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('clients').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('role', 'dentist').gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('clinical_records').select('*', { count: 'exact', head: true }).gte('created_at', startOfDay).lte('created_at', endOfDay),
        supabase.from('communications').select('*', { count: 'exact', head: true }).eq('status', 'sent').gte('sent_at', startOfDay).lte('sent_at', endOfDay),
        supabase.from('transactions').select('amount').eq('type', 'income').gte('created_at', startOfDay).lte('created_at', endOfDay)
    ]);

    const totalVolume = transactionsData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;
    const formattedVolume = totalVolume.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #1e293b; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 20px;">Resumo Diário DentiHub 📊</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">${dateLabel}</p>
            </div>
            
            <div style="padding: 30px; color: #334155;">
                <p>Olá, <strong>Admin</strong>.</p>
                <p>Aqui estão os números do sistema para o dia de hoje:</p>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Novas Clínicas</div>
                        <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${newClinics || 0}</div>
                    </div>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                        <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold;">Volume Financeiro</div>
                        <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${formattedVolume}</div>
                    </div>
                </div>

                <h3 style="font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-top: 30px; color: #0f172a;">Crescimento & Uso</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; color: #64748b;">Novos Pacientes</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${newPatients || 0}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; color: #64748b;">Novos Dentistas</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${newDentists || 0}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; color: #64748b;">Agendamentos Criados</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${newAppointments || 0}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px 0; color: #64748b;">Prontuários IA Gerados</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${newAIRecords || 0}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px 0; color: #64748b;">E-mails Enviados</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #0f172a;">${emailsSent || 0}</td>
                    </tr>
                </table>

                <div style="margin-top: 30px; text-align: center;">
                    <a href="https://dentihub.com.br/#/super-admin" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                        Acessar God Mode
                    </a>
                </div>
            </div>
            
            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
                DentiHub - Relatório Automático do Sistema
            </div>
        </div>
    `;

    async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                from: "DentiHub System <naoresponda@dentihub.com.br>",
                to: [to],
                subject: subject,
                html: html
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(`Erro Resend: ${data.message || data.name}`);
        }
        return await res.json();
    }

    await sendEmail(resendApiKey, adminEmail, `Relatório Diário (${dateLabel}) - DentiHub`, htmlContent);

    await supabase.from('edge_function_logs').insert({
        function_name: 'send-super-admin-daily-report',
        metadata: { 
            new_clinics: newClinics, 
            new_patients: newPatients, 
            total_volume: totalVolume 
        },
        status: 'success'
    });

    return new Response(JSON.stringify({ success: true, message: "Relatório enviado com sucesso." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error: any) {
    console.error("Erro no relatório:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
