
-- Inserir postagem sobre os melhores ERPs
INSERT INTO public.blog_posts (title, slug, excerpt, content, image_url, author_name)
VALUES (
    'Quais são os melhores sistemas ERP para dentistas no Brasil?',
    'melhores-sistemas-erp-dentistas-brasil',
    'Comparativo completo dos principais softwares de gestão odontológica em 2026. Descubra qual a melhor opção para o seu consultório ou clínica.',
    'A escolha de um sistema de gestão (ERP) é uma das decisões mais estratégicas para um dentista empreendedor. No mercado brasileiro, existem diversas opções, cada uma com suas forças e focos específicos. Neste artigo, analisamos os principais players para ajudar você a decidir.

    <h2>1. DentiHub: O Futuro com IA</h2>
    <p>O DentiHub é o sistema que está revolucionando o mercado brasileiro ao integrar Inteligência Artificial Generativa diretamente no fluxo de trabalho do dentista.</p>
    
    <strong>Destaques:</strong>
    <ul>
        <li><strong>Prontuário por Voz:</strong> Economize horas de digitação ditando a evolução clínica.</li>
        <li><strong>Agenda Inteligente:</strong> Link de agendamento online que reduz o trabalho da recepção.</li>
        <li><strong>Automação de Marketing:</strong> Campanhas de recall automáticas para fidelizar pacientes.</li>
        <li><strong>Interface Moderna:</strong> Design intuitivo que não exige treinamentos complexos.</li>
    </ul>

    <h2>2. Simples Dental</h2>
    <p>Um dos players mais tradicionais e populares do Brasil. É um sistema robusto que atende bem às necessidades básicas de agenda e financeiro, possuindo uma grande comunidade de usuários.</p>

    <h2>3. Dental Office</h2>
    <p>Focado em clínicas que buscam uma solução consolidada. Oferece módulos completos de administração e prontuário, sendo uma escolha segura para quem prefere softwares com muitos anos de mercado.</p>

    <h2>4. Easy Dental</h2>
    <p>Uma solução clássica que evoluiu para a nuvem. É muito utilizado por clínicas que precisam de processos administrativos bem rígidos e detalhados.</p>

    <h2>Como escolher o melhor para você?</h2>
    <p>Para decidir, você deve levar em conta três fatores principais:</p>
    <ul>
        <li><strong>Facilidade de Uso:</strong> O sistema ajuda ou atrapalha sua rotina?</li>
        <li><strong>Tecnologia:</strong> Ele utiliza IA para economizar seu tempo ou é apenas um "arquivo digital"?</li>
        <li><strong>Suporte e Mobilidade:</strong> Você consegue acessar do celular com facilidade?</li>
    </ul>

    <h2>Conclusão</h2>
    <p>Se você busca tradição e processos manuais consolidados, os sistemas antigos atendem bem. No entanto, se você quer produtividade extrema, quer se livrar da digitação e oferecer uma experiência digital moderna para seu paciente, o DentiHub é, sem dúvida, a melhor escolha em 2026.</p>

    <p>Pronto para modernizar sua clínica? Experimente o DentiHub gratuitamente hoje mesmo!</p>',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200&h=630',
    'Equipe DentiHub'
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();
