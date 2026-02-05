
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenAI } from "@google/genai"

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
   - Atalho para configuração inicial (Onboarding) para novos usuários.

2. **Agenda (/calendar)**
   - Visualização Mensal e Lista.
   - Cores dos agendamentos dependem da cor configurada no perfil do Dentista.
   - Status: Agendado (Azul), Confirmado (Verde - Paciente confirmou), Concluído (Cinza), Cancelado (Vermelho).
   - **Financeiro Automático:** Ao marcar um agendamento como "Pago", o sistema lança automaticamente uma receita no módulo Financeiro.
   - **Retorno:** Ao marcar como "Concluído", o sistema sugere agendar um retorno.

3. **Pacientes (/clients)**
   - Cadastro completo (Nome, CPF, Data Nasc, WhatsApp).
   - **Prontuário:** Histórico de evoluções.
   - **Arquivos:** Upload de Raio-X e documentos (PDF/Imagens).
   - **Receita Digital:** Criação de receitas e atestados com geração de PDF e envio por e-mail.
   - Importação via Excel disponível.

4. **Dentistas (/dentists)**
   - Cadastro da equipe.
   - Configuração de horários de atendimento (dias da semana, horários de almoço).
   - Definição de serviços e preços específicos por dentista.
   - Bloqueio de datas (férias/feriados).

5. **Prontuário Inteligente com IA (/smart-record)**
   - Funcionalidade Premium.
   - O dentista clica no microfone e dita o procedimento.
   - A IA transcreve e gera um resumo no formato SOAP (Subjetivo, Objetivo, Avaliação, Plano).
   - Limites de uso dependem do plano (Free: 3 usos, Starter: 5/dia, Pro: 10/dia).

6. **Mensageria e Marketing (/messaging)**
   - **Automações:** O sistema envia lembretes automáticos (24h antes) e confirmações.
   - **Campanha de Retorno (Recall):** Filtra pacientes que não vêm há X meses e dispara e-mail de convite para check-up.

7. **Financeiro (/finance)**
   - Controle de Fluxo de Caixa (Entradas e Saídas).
   - Filtros por data e status (Pendente/Pago).
   - Lançamentos manuais ou automáticos vindos da Agenda.

8. **Solicitações (/requests)**
   - Central de aprovação para agendamentos feitos pelo Link Público.
   - Mostra se o paciente é novo ou já existe (match por CPF).
   - Permite aceitar ou recusar horários.

9. **Link Público de Agendamento**
   - Cada clínica tem uma URL única (ex: dentihub.com.br/minha-clinica).
   - Pacientes agendam sozinhos, o dentista aprova em "Solicitações".

10. **Configurações (/settings)**
    - Dados da clínica, Logo.
    - Gestão de Equipe (Convite de membros).
    - Planos e Assinatura (Integração Stripe).

## REGRAS DE RESPOSTA
- Se o usuário perguntar "Como cadastro um paciente?", explique passo a passo indo na aba Pacientes > Botão Novo.
- Se perguntarem sobre preços, explique que depende do plano (Free, Starter R$100, Pro R$300).
- Se perguntarem "Como funciona a IA?", explique sobre o Prontuário Inteligente.
- Se o usuário relatar um erro técnico, peça para contatar o suporte em contato@dentihub.com.br ou usar o menu "Guia Prático" > "Falar com Suporte".
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
    const { history, message } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY_HELP') || Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('Chave de API de Ajuda não configurada.')
    }

    const ai = new GoogleGenAI({ apiKey })
    const MODEL_NAME = "gemini-2.0-flash"

    // Constrói o histórico para a API
    const contents = [
      { role: 'user', parts: [{ text: "Contexto do Sistema: " + DENTIHUB_CONTEXT }] },
      { role: 'model', parts: [{ text: "Entendido. Estou pronto para ajudar com dúvidas sobre o DentiHub." }] },
      ...history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        temperature: 0.3, // Baixa temperatura para respostas mais precisas e técnicas
      },
    });

    const text = response.text || "Desculpe, não consegui processar sua dúvida no momento.";

    return new Response(JSON.stringify({ reply: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    console.error("Help AI Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
    