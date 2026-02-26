
-- Inserir postagem sobre o que é um sistema de gestão
INSERT INTO public.blog_posts (title, slug, excerpt, content, image_url, author_name)
VALUES (
    'O que é um sistema de gestão para clínicas dentárias?',
    'o-que-e-sistema-gestao-clinica-dentaria',
    'Entenda o conceito de ERP e CRM na odontologia e como essas ferramentas podem organizar desde a sua agenda até o seu lucro real.',
    '<p>Um sistema de gestão para clínicas dentárias, muitas vezes chamado de ERP (Enterprise Resource Planning) ou simplesmente software odontológico, é uma ferramenta digital projetada para centralizar todas as atividades operacionais, administrativas e financeiras de um consultório em um único lugar.</p>

    <p>Antigamente, a gestão era feita em agendas de papel, fichas físicas e planilhas isoladas. Hoje, um sistema moderno como o DentiHub vai muito além de um simples cadastro de nomes.</p>

    <h2>Os Pilares de um Sistema de Gestão</h2>
    <ul>
        <li><strong>1. Gestão de Agenda:</strong> Organiza os horários dos dentistas, evita conflitos e permite o agendamento online pelo próprio paciente, funcionando 24h por dia.</li>
        <li><strong>2. Prontuário Digital:</strong> Armazena todo o histórico clínico, exames e evoluções de forma segura e organizada, eliminando o uso de papel.</li>
        <li><strong>3. Controle Financeiro:</strong> Registra entradas (pagamentos de tratamentos) e saídas (custos de materiais, aluguel, etc.), gerando relatórios de lucratividade.</li>
        <li><strong>4. Relacionamento (CRM):</strong> Gerencia a comunicação com o paciente, enviando lembretes automáticos e mensagens de retorno para garantir que ele não esqueça da consulta.</li>
    </ul>

    <h2>Por que sua clínica precisa de um?</h2>
    <p>Sem um sistema, o dentista perde muito tempo com tarefas burocráticas e corre o risco de perder dinheiro por falta de controle. Um software de gestão profissional traz:</p>
    <ul>
        <li><strong>Organização:</strong> Tudo o que você precisa a um clique de distância.</li>
        <li><strong>Produtividade:</strong> Processos automatizados (como lembretes) liberam sua equipe para focar no atendimento.</li>
        <li><strong>Segurança:</strong> Backups automáticos garantem que você nunca perca os dados dos seus pacientes.</li>
    </ul>

    <h2>O Diferencial do DentiHub</h2>
    <p>Enquanto sistemas comuns apenas guardam dados, o DentiHub utiliza Inteligência Artificial para ajudar você a escrever prontuários e analisar sua clínica. É a evolução da gestão odontológica, pensada para quem quer crescer com tecnologia.</p>

    <h2>Conclusão</h2>
    <p>Um sistema de gestão não é um luxo, é a base para qualquer clínica que deseja ser lucrativa e profissional. Se você ainda usa papel ou sistemas lentos, está na hora de conhecer o DentiHub.</p>',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2070',
    'Equipe DentiHub'
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();
