
import { GoogleGenAI, Type } from "@google/genai"
import { createClient } from "@supabase/supabase-js"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response>): void;
};

const DENTIHUB_CONTEXT = `
Você é o assistente oficial do DentiHub (Sistema ERP para Odontologia).
Você tem permissão para realizar ações no banco de dados através de ferramentas (tools).

REGRAS:
1. Se o usuário pedir para cadastrar um paciente, use a tool 'cadastrar_paciente'.
2. Se o usuário pedir para agendar, use a tool 'agendar_consulta'. O formato de data deve ser ISO (YYYY-MM-DDTHH:MM:SS) ou data local se for óbvio (ex: 'hoje às 14h' converta para data futura próxima).
3. Seja direto e confirme a ação realizada.
4. Se faltarem dados (ex: pedir para agendar sem dizer o paciente), pergunte ao usuário os dados faltantes antes de chamar a tool.
`;

const toolsDefinition = [
  {
    functionDeclarations: [
      {
        name: "cadastrar_paciente",
        description: "Cadastra um novo paciente no sistema.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            nome: { type: Type.STRING, description: "Nome completo do paciente" },
            telefone: { type: Type.STRING, description: "Telefone ou WhatsApp (opcional)" },
            cpf: { type: Type.STRING, description: "CPF do paciente (opcional)" }
          },
          required: ["nome"]
        }
      },
      {
        name: "agendar_consulta",
        description: "Agenda uma consulta encontrando paciente e dentista pelos nomes.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            nome_paciente: { type: Type.STRING, description: "Nome do paciente para buscar no banco" },
            nome_dentista: { type: Type.STRING, description: "Nome do dentista (ou 'qualquer' se não especificado)" },
            data_hora: { type: Type.STRING, description: "Data e hora da consulta (ISO 8601 ou YYYY-MM-DD HH:MM)" },
            procedimento: { type: Type.STRING, description: "Nome do serviço/procedimento (ex: Avaliação, Limpeza)" }
          },
          required: ["nome_paciente", "data_hora"]
        }
      }
    ]
  }
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { history, message } = await req.json()
    
    // Auth Check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
       throw new Error("Usuário não autenticado.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Sessão inválida.");

    const { data: profile } = await supabase.from('user_profiles').select('clinic_id').eq('id', user.id).maybeSingle();
    const clinicId = profile?.clinic_id;

    if (!clinicId) throw new Error("Clínica não identificada.");

    // AI Config
    const apiKey = Deno.env.get('GEMINI_API_KEY_HELP') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY');
    if (!apiKey) throw new Error("API Key não encontrada.");

    const ai = new GoogleGenAI({ apiKey })
    // Using gemini-2.0-flash for better tool stability
    const MODEL_NAME = "gemini-2.0-flash" 

    const chatContent = [
      { role: 'user', parts: [{ text: "Contexto do Sistema: " + DENTIHUB_CONTEXT }] },
      { role: 'model', parts: [{ text: "Entendido. Estou pronto para ajudar e executar comandos." }] },
      ...history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: chatContent,
      config: {
        tools: toolsDefinition,
        temperature: 0.1,
      },
    });

    const response1 = result.candidates?.[0]?.content;
    const parts1 = response1?.parts || [];
    const functionCallPart = parts1.find(p => p.functionCall);

    if (functionCallPart) {
        const fc = functionCallPart.functionCall;
        const fnName = fc.name;
        const args = fc.args as any;
        
        let toolResult = "";

        if (fnName === "cadastrar_paciente") {
            const { error } = await supabase.from('clients').insert({
                clinic_id: clinicId,
                name: args.nome,
                whatsapp: args.telefone || null,
                cpf: args.cpf || null
            });
            if (error) toolResult = `Erro ao cadastrar: ${error.message}`;
            else toolResult = `Sucesso! Paciente ${args.nome} cadastrado.`;
        } 
        else if (fnName === "agendar_consulta") {
            const { data: patients } = await supabase.from('clients')
                .select('id, name')
                .eq('clinic_id', clinicId)
                .ilike('name', `%${args.nome_paciente}%`)
                .limit(1);
            
            let dentistId = null;
            let dentistName = "Qualquer";
            
            if (args.nome_dentista && args.nome_dentista.toLowerCase() !== 'qualquer') {
                const { data: dentists } = await supabase.from('dentists')
                    .select('id, name')
                    .eq('clinic_id', clinicId)
                    .ilike('name', `%${args.nome_dentista}%`)
                    .limit(1);
                if (dentists && dentists.length > 0) {
                    dentistId = dentists[0].id;
                    dentistName = dentists[0].name;
                }
            } else {
                const { data: anyDentist } = await supabase.from('dentists').select('id, name').eq('clinic_id', clinicId).limit(1);
                if (anyDentist && anyDentist.length > 0) {
                    dentistId = anyDentist[0].id;
                    dentistName = anyDentist[0].name;
                }
            }

            if (!patients || patients.length === 0) {
                toolResult = `Erro: Não encontrei paciente com nome similar a "${args.nome_paciente}".`;
            } else if (!dentistId) {
                toolResult = `Erro: Não há dentistas cadastrados na clínica.`;
            } else {
                let startTime = args.data_hora;
                if (!startTime.includes('T')) startTime = startTime.replace(' ', 'T') + ':00';
                
                const dateObj = new Date(startTime);
                if (isNaN(dateObj.getTime())) {
                    toolResult = `Erro: Data inválida (${args.data_hora}).`;
                } else {
                    const endObj = new Date(startTime);
                    endObj.setHours(endObj.getHours() + 1);

                    const { error } = await supabase.from('appointments').insert({
                        clinic_id: clinicId,
                        client_id: patients[0].id,
                        dentist_id: dentistId,
                        service_name: args.procedimento || 'Consulta Geral',
                        start_time: startTime,
                        end_time: endObj.toISOString(),
                        status: 'scheduled'
                    });

                    if (error) toolResult = `Erro ao agendar: ${error.message}`;
                    else toolResult = `Sucesso! Agendado para ${patients[0].name} com Dr(a). ${dentistName} em ${startTime}.`;
                }
            }
        }

        const response2 = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: [
                ...chatContent,
                { role: 'model', parts: [functionCallPart] },
                { role: 'user', parts: [{ 
                    functionResponse: {
                        name: fnName,
                        response: { result: toolResult }
                    }
                }]}
            ]
        });

        const finalAnswer = response2.text || "Ação realizada.";
        return new Response(JSON.stringify({ reply: finalAnswer }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } else {
        const text = result.text || "Desculpe, não entendi.";
        return new Response(JSON.stringify({ reply: text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error("Help AI Error:", error);
    return new Response(JSON.stringify({ 
      reply: "Tive um problema técnico ao processar sua solicitação. Tente novamente.",
      error: error.message 
    }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
