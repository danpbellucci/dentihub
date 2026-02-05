
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
    const { prompt, currentContent, contentType } = await req.json()
    
    // Tenta usar a chave específica de Admin primeiro, senão cai para as chaves gerais
    const apiKey = Deno.env.get('ADMIN_GEMINI_KEY') || Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY')
    
    if (!apiKey) {
      throw new Error('Chave da API (ADMIN_GEMINI_KEY ou GEMINI_API_KEY) não configurada no servidor.')
    }

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-3-flash-preview"

    let systemContext = '';
    let responseSchema: any = {};

    // --- LÓGICA PARA E-MAIL MARKETING ---
    if (!contentType || contentType === 'email') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING, description: "O assunto do e-mail (Curto e atrativo)." },
            html_content: { type: Type.STRING, description: "O corpo do e-mail em HTML com CSS inline simples." },
            rationale: { type: Type.STRING, description: "Explicação curta da estratégia usada." }
          },
          required: ["subject", "html_content"],
        };

        systemContext = `
          Você é um especialista em Marketing Digital focado no SaaS "DentiHub".
          Seu objetivo é criar copy para e-mails de marketing.
          
          IMPORTANTE: Baseie-se APENAS nas funcionalidades reais: Agenda Inteligente, Prontuário com IA (Voz para Texto), Gestão Financeira, Lembretes Automáticos, Campanhas de Retorno.
          
          Diretrizes:
          - HTML simples com CSS inline.
          - Tom profissional e persuasivo.
          - Cores: #0ea5e9 (Azul Principal).
          
          Contexto: ${currentContent ? `Refinar e-mail existente: "${currentContent.subject}"` : "Criar novo."}
        `;
    } 
    
    // --- LÓGICA PARA REDES SOCIAIS ---
    else if (contentType === 'social') {
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING, description: "A legenda do post, formatada com quebras de linha." },
            hashtags: { type: Type.STRING, description: "Lista de hashtags relevantes separadas por espaço." },
            image_idea: { type: Type.STRING, description: "Descrição detalhada para criar uma imagem ou sugerir uma foto." },
            hook: { type: Type.STRING, description: "A primeira frase (gancho) para prender a atenção." }
          },
          required: ["caption", "hashtags", "image_idea"],
        };

        systemContext = `
          Você é um Social Media Manager especializado em Odontologia e Gestão de Clínicas.
          Seu objetivo é criar posts para o DentiHub (SaaS para dentistas).
          
          Público: Dentistas, Donos de Clínicas e Secretárias.
          Dores do público: Falta de tempo, pacientes que faltam, burocracia, glosas de convênio.
          Solução DentiHub: Automação, IA no prontuário, Agenda organizada.

          Diretrizes:
          - Use emojis moderadamente.
          - Texto escaneável (parágrafos curtos).
          - Foco em benefícios (ganhar tempo, ganhar dinheiro) e não apenas funcionalidades.
          - Se for Instagram: Tom visual e inspirador.
          - Se for LinkedIn: Tom profissional e focado em negócios/gestão.
          - Se for WhatsApp: Tom direto, curto e conversacional.
        `;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: `Solicitação do usuário: ${prompt}` }
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
