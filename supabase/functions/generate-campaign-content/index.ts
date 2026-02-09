
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "@google/genai"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const DENTIHUB_REAL_FEATURES = `
VOCÊ É O GERENTE DE MARKETING DO DENTIHUB.
Sua tarefa é criar campanhas de Google Ads (Rede de Pesquisa) honestas e de alta conversão.

O QUE O DENTIHUB FAZ (FUNCIONALIDADES REAIS):
1. Prontuário com IA (Carro Chefe): O dentista dita a consulta e a IA escreve o SOAP.
2. Agenda Inteligente: Link público para o paciente agendar sozinho (tipo Calendly) + Gestão interna.
3. Confirmação de Consulta: VIA E-MAIL (Automático). O paciente clica no botão do e-mail para confirmar.
4. Financeiro: Fluxo de caixa, contas a pagar/receber.
5. Estoque: Controle de materiais com alertas de reposição por e-mail.
6. Prontuário Eletrônico: Anamnese, histórico.
7. Planos: Possui plano Gratuito (Free), Starter e Pro.

O QUE O DENTIHUB **NÃO** FAZ (PROIBIDO MENCIONAR):
- NÃO envia mensagens automáticas por WhatsApp. (Temos link para WhatsApp, mas não automação de envio).
- NÃO faz telemedicina.
- NÃO é um plano de saúde.

PÚBLICO ALVO:
- Dentistas donos de consultório.
- Secretárias que querem organizar a clínica.
- Clínicas pequenas e médias.
`;

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, taskType, contextData, currentContent } = await req.json()
    
    let apiKey = Deno.env.get('ADMIN_GEMINI_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY');
    
    if (!apiKey) {
      throw new Error('Chave da API não configurada no servidor.')
    }

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-3-flash-preview"

    let systemContext = '';
    let responseSchema: any = undefined;

    if (taskType === 'google_ads_setup') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                campaign_name: { type: Type.STRING, description: "Nome técnico da campanha (ex: [Search] - Institucional)" },
                objective: { type: Type.STRING, description: "Objetivo do Google Ads (Vendas, Leads, Tráfego)" },
                campaign_type: { type: Type.STRING, description: "Tipo (Pesquisa, PMax, etc)" },
                bidding_strategy: { type: Type.STRING, description: "Estratégia de Lances (CPA, Maximizar Conversões)" },
                keywords: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }, 
                    description: "Lista de 15 a 20 palavras-chave focadas (Broad Match Modifier ou Phrase Match)" 
                },
                ads: {
                    type: Type.OBJECT,
                    properties: {
                        headlines: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }, 
                            description: "15 Títulos (Max 30 caracteres cada). Use gatilhos mentais." 
                        },
                        descriptions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }, 
                            description: "4 Descrições (Max 90 caracteres cada)." 
                        }
                    },
                    required: ["headlines", "descriptions"]
                },
                sitelinks: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING, description: "Texto do link (Max 25 chars)" },
                            description: { type: Type.STRING, description: "Linha descritiva (Max 35 chars)" }
                        }
                    },
                    description: "4 Sitelinks estratégicos"
                },
                callouts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "8 Frases de destaque (Max 25 chars). Ex: 'Teste Grátis', 'Suporte BR'."
                },
                image_suggestions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "3 sugestões de imagens para a campanha (descrição textual do que usar)"
                }
            },
            required: ["campaign_name", "objective", "keywords", "ads", "sitelinks", "callouts", "image_suggestions"]
        };

        systemContext = `
            ${DENTIHUB_REAL_FEATURES}
            
            TAREFA:
            Crie a estrutura completa de uma campanha Google Ads.
            O objetivo é captar LEADS QUALIFICADOS (Dentistas procurando software).
            
            REGRAS CRÍTICAS:
            1. Respeite os limites de caracteres do Google Ads (Títulos 30, Descrições 90).
            2. NUNCA invente funcionalidades (ex: não fale de WhatsApp automático).
            3. Foque na "Dor" do dentista: Falta de tempo, prontuário de papel, agenda bagunçada.
            4. Destaque o diferencial: IA que escreve o prontuário.
        `;
    } 
    // ... (Manter lógica existente para outros tipos se houver) ...
    else {
         // Fallback genérico para email marketing
         systemContext = `Você é um especialista em marketing para dentistas. ${DENTIHUB_REAL_FEATURES}`;
         responseSchema = undefined; // Deixa livre se não for ads
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Contexto Extra: ${JSON.stringify(contextData || {})}` },
          { text: `INSTRUÇÃO: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: systemContext,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const rawText = response.text || "";
    let data;
    try {
        let cleanText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        data = JSON.parse(cleanText);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Erro ao processar JSON da IA.", raw: rawText }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Erro interno." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
