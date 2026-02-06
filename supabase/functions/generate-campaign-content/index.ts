
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI, Type } from "@google/genai"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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
    
    // Prioriza a chave de Admin
    const apiKey = Deno.env.get('ADMIN_GEMINI_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY')
    
    if (!apiKey) {
      throw new Error('Chave da API (ADMIN_GEMINI_KEY) não configurada.')
    }

    const ai = new GoogleGenAI({ apiKey })
    // Usando modelo de alta performance para texto conforme guidelines
    const MODEL_NAME = "gemini-3-flash-preview"

    let systemContext = '';
    let responseSchema: any = {};

    // 1. COPY PARA REDES SOCIAIS / BLOG
    if (taskType === 'social') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título chamativo ou Headline." },
            content: { type: Type.STRING, description: "O corpo do texto completo (post ou artigo)." },
            hashtags: { type: Type.STRING, description: "Lista de hashtags separadas por espaço." },
            image_suggestion: { type: Type.STRING, description: "Sugestão visual para acompanhar o texto." }
          },
          required: ["title", "content", "hashtags"],
        };

        systemContext = `
          Você é um Especialista em Content Marketing e Copywriting para Odontologia.
          Objetivo: Criar conteúdo engajador para redes sociais ou blogs de clínicas.
          Diretrizes:
          - Use técnica AIDA (Atenção, Interesse, Desejo, Ação).
          - Use emojis moderadamente.
          - Foque nas dores e desejos dos pacientes (estética, saúde, medo de dentista).
          - Texto escaneável.
        `;
    } 
    
    // 2. PROMPT PARA IMAGENS
    else if (taskType === 'image_prompt') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            midjourney_prompt: { type: Type.STRING, description: "Prompt detalhado otimizado para Midjourney (em inglês)." },
            dalle_prompt: { type: Type.STRING, description: "Prompt descritivo otimizado para DALL-E 3 (em inglês)." },
            negative_prompt: { type: Type.STRING, description: "O que evitar na imagem (ex: deformed teeth, scary tools)." },
            pt_description: { type: Type.STRING, description: "Explicação da ideia da imagem em português." }
          },
          required: ["midjourney_prompt", "dalle_prompt", "pt_description"],
        };

        systemContext = `
          Você é um Engenheiro de Prompt especialista em IA Generativa de Imagens (Midjourney, DALL-E, Stable Diffusion).
          Objetivo: Criar prompts para gerar imagens de alta qualidade para marketing odontológico.
          Diretrizes:
          - Evite "Uncanny Valley" (dentes deformados, muitos dedos).
          - Estilo: Fotorealista, Cinematográfico, Iluminação de Estúdio ou Ilustração 3D (conforme pedido).
          - Os prompts devem ser em INGLÊS técnico.
        `;
    }

    // 3. GOOGLE ADS E META ADS
    else if (taskType === 'ads_strategy') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            campaign_name: { type: Type.STRING },
            target_audience: { type: Type.STRING, description: "Segmentação de público detalhada." },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 10-20 palavras-chave (Google Ads)." },
            headlines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "5 opções de títulos chamativos (30 chars max para Google)." },
            descriptions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 opções de descrições persuasivas (90 chars max para Google)." },
            primary_text: { type: Type.STRING, description: "Texto principal para Meta Ads (Facebook/Instagram)." },
            call_to_action: { type: Type.STRING, description: "Melhor CTA para usar." }
          },
          required: ["campaign_name", "keywords", "headlines", "descriptions", "primary_text"],
        };

        systemContext = `
          Você é um Gestor de Tráfego Pago Senior (Google Ads & Meta Ads) focado em clínicas odontológicas.
          Objetivo: Estruturar uma campanha de alta conversão.
          Diretrizes:
          - Google Ads: Foco em intenção de busca (fundo de funil). Títulos curtos e diretos.
          - Meta Ads: Foco em interrupção e desejo visual. Texto persuasivo.
          - Segmentação: Geográfica (raio da clínica), Idade, Interesses.
        `;
    } else {
        throw new Error("Tipo de tarefa desconhecido.");
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Contexto/Dados do Usuário: ${JSON.stringify(contextData || {})}` },
          { text: `Solicitação Principal: ${prompt}` }
        ]
      },
      config: {
        systemInstruction: systemContext,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    
    let data;
    try {
        data = JSON.parse(cleanedText);
    } catch (e) {
        console.error("JSON Parse Error:", text);
        throw new Error("A IA gerou uma resposta inválida. Tente novamente.");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno na função." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
