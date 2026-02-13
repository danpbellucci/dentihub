
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "@google/genai"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const DENTIHUB_CONTEXT = `
PRODUTO: DentiHub - ERP para Clínicas Odontológicas.
PÚBLICO: Dentistas donos de clínicas e Secretárias.
DIFERENCIAIS: Prontuário via Voz (IA), Agenda Online, Financeiro Automático, Tudo na Nuvem, Sem fidelidade.
TOM DE VOZ: Profissional, Moderno, Persuasivo e Focado em Resultado.
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
    const { prompt, taskType, contextData } = await req.json()
    
    let apiKey = Deno.env.get('ADMIN_GEMINI_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY');
    if (!apiKey) throw new Error('Chave da API não configurada.');

    const ai = new GoogleGenAI({ apiKey })
    // Migrado para o modelo recomendado para tarefas de texto/marketing
    const MODEL_NAME = "gemini-3-flash-preview"

    let systemContext = DENTIHUB_CONTEXT;
    let responseSchema: any = undefined;

    if (taskType === 'google_ads_setup') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                campaign_name: { type: Type.STRING },
                product_service: { type: Type.STRING, description: "Descrição do que está sendo anunciado" },
                unique_selling_proposition: { type: Type.STRING, description: "O maior diferencial competitivo para este anúncio" },
                objective: { type: Type.STRING },
                bidding_strategy: { type: Type.STRING },
                keywords: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "MÍNIMO 15 palavras-chave de alta intenção"
                },
                negative_keywords: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "MÍNIMO 10 palavras-chave negativas essenciais"
                },
                ads: {
                    type: Type.OBJECT,
                    properties: {
                        headlines: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Exatamente 15 títulos (headlines) de até 30 caracteres"
                        },
                        descriptions: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "Exatamente 4 descrições de até 90 caracteres"
                        }
                    },
                    required: ["headlines", "descriptions"]
                },
                sitelinks: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            text: { type: Type.STRING, description: "Máx 25 char" }, 
                            description: { type: Type.STRING, description: "Máx 35 char" } 
                        } 
                    } 
                },
                callouts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Frases de destaque de até 25 caracteres" },
                image_suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Prompts ou ideias visuais para os banners" }
            },
            required: ["campaign_name", "keywords", "negative_keywords", "ads", "product_service", "unique_selling_proposition"]
        };
        systemContext += "\nVocê é um Estrategista Sênior de Google Ads focado no mercado odontológico SaaS. Sua missão é gerar uma campanha COMPLETA. NÃO deixe arrays vazios. O retorno deve ser JSON puro.";
    } 
    
    // --- Outros tipos de tarefa mantidos ---
    else if (taskType === 'blog_post') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                slug: { type: Type.STRING },
                excerpt: { type: Type.STRING },
                content_html: { type: Type.STRING },
                image_prompt: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "content_html", "excerpt"]
        };
    } else {
        // Fallback schema
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                subject: { type: Type.STRING },
                html_content: { type: Type.STRING },
                rationale: { type: Type.STRING }
            }
        };
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Contexto do Negócio: ${JSON.stringify(contextData || {})}` },
          { text: `TAREFA: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: systemContext,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const data = JSON.parse(response.text || "{}");

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
