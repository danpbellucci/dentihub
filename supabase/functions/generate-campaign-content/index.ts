
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
DIFERENCIAIS: Prontuário via Voz (IA), Agenda Online, Financeiro Automático.
TOM DE VOZ: Profissional, Moderno, Empático (foca na falta de tempo do dentista).
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
    const MODEL_NAME = "gemini-2.0-flash"

    let systemContext = DENTIHUB_CONTEXT;
    let responseSchema: any = undefined;

    // --- 1. GOOGLE ADS ---
    if (taskType === 'google_ads_setup') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                campaign_name: { type: Type.STRING },
                objective: { type: Type.STRING },
                keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                ads: {
                    type: Type.OBJECT,
                    properties: {
                        headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
                        descriptions: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["headlines", "descriptions"]
                },
                sitelinks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: {type:Type.STRING}, description: {type:Type.STRING} } } },
                callouts: { type: Type.ARRAY, items: { type: Type.STRING } },
                image_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        };
        systemContext += "\nCrie uma estrutura de campanha para Google Search.";
    } 
    
    // --- 2. BLOG POST ---
    else if (taskType === 'blog_post') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título SEO otimizado e atrativo" },
                slug: { type: Type.STRING, description: "URL amigável sugerida" },
                excerpt: { type: Type.STRING, description: "Resumo curto para listagem (meta description)" },
                content_html: { type: Type.STRING, description: "Conteúdo completo do artigo em HTML (use <h2>, <p>, <ul>, <strong>). Mínimo 600 palavras. Foco em SEO." },
                image_prompt: { type: Type.STRING, description: "Prompt para gerar a imagem de capa em IA (Midjourney/DALL-E)" },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "content_html", "excerpt"]
        };
        systemContext += "\nEscreva um artigo de blog completo, educativo e que venda indiretamente o DentiHub.";
    }

    // --- 3. SOCIAL MEDIA (Instagram/LinkedIn) ---
    else if (taskType === 'social_media') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                platform: { type: Type.STRING, description: "Instagram ou LinkedIn" },
                caption: { type: Type.STRING, description: "Legenda completa com emojis e quebras de linha" },
                hashtags: { type: Type.STRING, description: "Lista de hashtags relevantes" },
                image_idea: { type: Type.STRING, description: "Descrição visual da imagem ou carrossel para o designer/IA" },
                story_script: { type: Type.STRING, description: "Roteiro curto para Stories promovendo esse post" }
            }
        };
        systemContext += "\nCrie conteúdo para redes sociais focado em engajamento e autoridade.";
    }

    // --- 4. META ADS (Facebook/Instagram) ---
    else if (taskType === 'meta_ads') {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                primary_text: { type: Type.STRING, description: "Texto principal do anúncio (acima da imagem)" },
                headline: { type: Type.STRING, description: "Título do anúncio (ao lado do botão)" },
                description: { type: Type.STRING, description: "Descrição curta (abaixo do título)" },
                call_to_action: { type: Type.STRING, description: "Botão (ex: Saiba Mais, Cadastre-se)" },
                creative_ideas: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING }, 
                    description: "3 ideias de imagem ou vídeo para este anúncio" 
                },
                audience_interests: { type: Type.STRING, description: "Sugestão de segmentação de interesses" }
            }
        };
        systemContext += "\nCrie um anúncio de alta conversão para Facebook/Instagram Ads.";
    }

    // --- 5. EMAIL MARKETING (Padrão) ---
    else {
        responseSchema = {
            type: Type.OBJECT,
            properties: {
                subject: { type: Type.STRING },
                html_content: { type: Type.STRING },
                rationale: { type: Type.STRING }
            }
        };
        systemContext += "\nCrie um e-mail marketing persuasivo.";
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Contexto Extra: ${JSON.stringify(contextData || {})}` },
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
