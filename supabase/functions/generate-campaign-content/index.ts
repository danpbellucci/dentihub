
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
    const { prompt, taskType, contextData, currentContent } = await req.json()
    
    // 1. Definição da Chave de API (Prioridade: ADMIN_GEMINI_KEY)
    let apiKey = Deno.env.get('ADMIN_GEMINI_KEY');
    let keySource = 'ADMIN_GEMINI_KEY';

    if (!apiKey) {
        apiKey = Deno.env.get('GEMINI_API_KEY');
        keySource = 'GEMINI_API_KEY';
    }
    if (!apiKey) {
        apiKey = Deno.env.get('API_KEY');
        keySource = 'API_KEY';
    }
    
    if (!apiKey) {
      throw new Error('Chave da API (ADMIN_GEMINI_KEY) não configurada no servidor.')
    }

    console.log(`[GENERATE-CONTENT] Usando chave: ${keySource} (${apiKey.substring(0, 5)}...)`);

    const ai = new GoogleGenAI({ apiKey })
    
    // 2. Modelo Definido (gemini-3-flash-preview)
    const MODEL_NAME = "gemini-3-flash-preview"

    let effectiveTaskType = taskType;
    if (!effectiveTaskType && currentContent) {
        effectiveTaskType = 'email_campaign_chat';
    }

    console.log(`[GENERATE-CONTENT] Tarefa: ${effectiveTaskType} | Modelo: ${MODEL_NAME}`);

    let systemContext = '';
    let responseSchema: any = undefined; // Deixe undefined se não tiver schema

    // --- CONFIGURAÇÃO DE SCHEMAS POR TIPO ---

    if (effectiveTaskType === 'social') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Título criativo ou Assunto do email" },
            content: { type: Type.STRING, description: "Corpo do texto completo (HTML simples se for email)" },
            hashtags: { type: Type.STRING, description: "Lista de hashtags (ex: #dentista #saude)" }
          },
          required: ["title", "content"],
        };
        systemContext = `
          Você é um Especialista em Marketing Odontológico de classe mundial.
          Gere conteúdo persuasivo, profissional e em Português do Brasil.
          Se for um E-mail, use formatação HTML básica (<p>, <b>, <br>) no campo 'content'.
          Se for Social Media, use emojis e linguagem engajadora.
        `;
    } 
    else if (effectiveTaskType === 'image_prompt') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            midjourney_prompt: { type: Type.STRING, description: "Prompt detalhado em Inglês para Midjourney v6" },
            dalle_prompt: { type: Type.STRING, description: "Prompt descritivo em Inglês para DALL-E 3" },
            pt_description: { type: Type.STRING, description: "Explicação da imagem em Português" }
          },
          required: ["midjourney_prompt", "dalle_prompt"],
        };
        systemContext = `
          Você é um Engenheiro de Prompt Sênior para IA Generativa.
          Crie prompts visuais impressionantes focados em Odontologia de alta qualidade.
          Os prompts DEVEM ser em INGLÊS.
        `;
    }
    else if (effectiveTaskType === 'ads_strategy') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            campaign_name: { type: Type.STRING },
            target_audience: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            headlines: { type: Type.ARRAY, items: { type: Type.STRING } },
            descriptions: { type: Type.ARRAY, items: { type: Type.STRING } },
            primary_text: { type: Type.STRING },
            call_to_action: { type: Type.STRING }
          },
          required: ["campaign_name", "headlines", "descriptions", "primary_text"],
        };
        systemContext = `
          Você é um Gestor de Tráfego Pago experiente.
          Crie uma estratégia completa para Google Ads e Meta Ads.
          Foco: Conversão e Leads.
          Google Ads: Headlines curtas (máx 30 chars).
          Meta Ads: Copy persuasiva usando framework AIDA.
        `;
    }
    else if (effectiveTaskType === 'email_campaign_chat') {
         responseSchema = {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            html_content: { type: Type.STRING },
            rationale: { type: Type.STRING }
          },
          required: ["subject", "html_content"],
        };
        systemContext = `Você é um assistente de marketing focado em e-mail marketing odontológico.`;
    }
    else {
        // Fallback genérico sem schema forçado
        systemContext = `Você é um assistente útil. Responda em JSON.`;
    }

    // 3. Chamada ao Modelo
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Contexto Adicional (JSON): ${JSON.stringify(contextData || {})}` },
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
    console.log("[GENERATE-CONTENT] Raw Response Length:", rawText.length);

    // 4. Tratamento da Resposta (Limpeza de Markdown)
    let data;
    try {
        // Remove blocos de código ```json ... ``` se existirem
        let cleanText = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        
        // Se ainda tiver sobras, tenta encontrar o primeiro { e o último }
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        data = JSON.parse(cleanText);
        
        // Verifica se o objeto está vazio (erro silencioso comum do Gemini)
        if (Object.keys(data).length === 0) {
             console.warn("[GENERATE-CONTENT] Aviso: Objeto JSON vazio retornado.");
             // Se veio vazio, mas temos texto bruto, talvez o modelo tenha falhado na estrutura
             if (rawText.length > 50) {
                 data = { error: "A IA gerou uma resposta, mas não no formato esperado.", raw: rawText };
             }
        }

    } catch (e) {
        console.error("[GENERATE-CONTENT] JSON Parse Error:", e.message);
        console.error("Texto recebido:", rawText);
        
        // Retorna erro amigável para o frontend
        return new Response(JSON.stringify({ 
            error: "A IA não retornou um JSON válido. Tente novamente.", 
            raw_response: rawText 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("[GENERATE-CONTENT] Fatal Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Erro interno na função." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
