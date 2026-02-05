
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "https://esm.sh/@google/genai@0.2.0"

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const DENTIHUB_CONTEXT = `
Você é o assistente virtual oficial do DentiHub, um SaaS ERP/CRM para clínicas odontológicas.
Sua função é tirar dúvidas dos usuários sobre como usar o sistema.
Seja educado, direto e útil. Responda em português do Brasil.

## ESTRUTURA DO SISTEMA E FUNCIONALIDADES

1. **Visão Geral (Dashboard)**
   - Mostra KPIs: Total de pacientes, agendamentos do dia, receita do mês.
   - Gráficos de entradas e saídas financeiras da semana.
   - Lista dos próximos agendamentos.
   - Atalho para configuração inicial (Onboarding).

2. **Agenda (/calendar)**
   - Visualização Mensal e Lista.
   - Status: Agendado (Azul), Confirmado (Verde), Concluído (Cinza), Cancelado (Vermelho).
   - **Financeiro Automático:** Marcar como "Pago" lança receita automaticamente.
   - **Retorno:** Ao marcar "Concluído", sugere agendar retorno.

3. **Pacientes (/clients)**
   - Cadastro completo (Nome, CPF, Data Nasc, WhatsApp).
   - **Prontuário:** Histórico de evoluções.
   - **Arquivos:** Upload de Raio-X/Documentos.
   - **Receita Digital:** Geração de PDF e envio por e-mail.

4. **Dentistas (/dentists)**
   - Cadastro da equipe e horários de atendimento.
   - Configuração de comissões e serviços.

5. **Prontuário Inteligente com IA (/smart-record)**
   - O dentista dita o procedimento no microfone.
   - A IA transcreve e gera resumo SOAP (Subjetivo, Objetivo, Avaliação, Plano).
   - Limites: Free (3 usos), Starter (5/dia), Pro (10/dia).

6. **Mensageria (/messaging)**
   - Lembretes automáticos (24h antes).
   - Campanha de Retorno (Recall) para pacientes sumidos.

7. **Financeiro (/finance)**
   - Fluxo de Caixa (Entradas/Saídas).
   - Lançamentos manuais ou automáticos da Agenda.

8. **Solicitações (/requests)**
   - Aprovação de agendamentos do Link Público.

9. **Link Público**
   - URL única da clínica para pacientes agendarem sozinhos.

10. **Configurações**
    - Dados da clínica, Logo, Gestão de Equipe e Assinatura.

## REGRAS DE RESPOSTA
- Responda apenas sobre o DentiHub.
- Se perguntarem de preços, explique os planos (Free, Starter R$100, Pro R$300).
- Erros técnicos: peça para contatar contato@dentihub.com.br.
`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { history, message } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('API_KEY');
    
    if (!apiKey) {
      console.error("Erro: GEMINI_API_KEY não encontrada.");
      return new Response(JSON.stringify({ reply: "Erro de configuração: Chave de API não encontrada no servidor." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey })
    // Usando gemini-1.5-flash que é mais estável e amplamente disponível
    const MODEL_NAME = "gemini-1.5-flash"

    // Formata o histórico corretamente para a API
    const chatContent = [
      { role: 'user', parts: [{ text: "Contexto do Sistema: " + DENTIHUB_CONTEXT }] },
      { role: 'model', parts: [{ text: "Entendido. DentiHub." }] },
      ...history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: chatContent,
      config: {
        temperature: 0.3,
      },
    });

    const text = response.text || "Desculpe, não consegui entender.";

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Help AI Error:", error);
    
    // Retorna erro JSON válido em vez de explodir com 500 sem corpo
    return new Response(JSON.stringify({ 
      reply: "Desculpe, o serviço de IA está temporariamente indisponível. Tente novamente em instantes.",
      error: error.message 
    }), {
      status: 200, // Retornamos 200 para o frontend exibir a mensagem amigável 'reply'
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
