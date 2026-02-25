
-- Inserir postagem sobre o que é um sistema de gestão
INSERT INTO public.blog_posts (title, slug, excerpt, content, image_url, author_name)
VALUES (
    'O que é um sistema de gestão para clínicas dentárias?',
    'o-que-e-sistema-gestao-clinica-dentaria',
    'Entenda o conceito de ERP e CRM na odontologia e como essas ferramentas podem organizar desde a sua agenda até o seu lucro real.',
    'Um sistema de gestão para clínicas dentárias, muitas vezes chamado de ERP (Enterprise Resource Planning) ou simplesmente software odontológico, é uma ferramenta digital projetada para centralizar todas as atividades operacionais, administrativas e financeiras de um consultório em um único lugar.

Antigamente, a gestão era feita em agendas de papel, fichas físicas e planilhas isoladas. Hoje, um sistema moderno como o DentiHub vai muito além de um simples cadastro de nomes.

Os Pilares de um Sistema de Gestão:

1. Gestão de Agenda: Organiza os horários dos dentistas, evita conflitos e permite o agendamento online pelo próprio paciente, funcionando 24h por dia.
2. Prontuário Digital: Armazena todo o histórico clínico, exames e evoluções de forma segura e organizada, eliminando o uso de papel.
3. Controle Financeiro: Registra entradas (pagamentos de tratamentos) e saídas (custos de materiais, aluguel, etc.), gerando relatórios de lucratividade.
4. Relacionamento (CRM): Gerencia a comunicação com o paciente, enviando lembretes automáticos e mensagens de retorno para garantir que ele não esqueça da consulta.

Por que sua clínica precisa de um?
Sem um sistema, o dentista perde muito tempo com tarefas burocráticas e corre o risco de perder dinheiro por falta de controle. Um software de gestão profissional traz:
- Organização: Tudo o que você precisa a um clique de distância.
- Produtividade: Processos automatizados (como lembretes) liberam sua equipe para focar no atendimento.
- Segurança: Backups automáticos garantem que você nunca perca os dados dos seus pacientes.

O Diferencial do DentiHub
Enquanto sistemas comuns apenas guardam dados, o DentiHub utiliza Inteligência Artificial para ajudar você a escrever prontuários e analisar sua clínica. É a evolução da gestão odontológica, pensada para quem quer crescer com tecnologia.

Conclusão
Um sistema de gestão não é um luxo, é a base para qualquer clínica que deseja ser lucrativa e profissional. Se você ainda usa papel ou sistemas lentos, está na hora de conhecer o DentiHub.',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200&h=630',
    'Equipe DentiHub'
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();
