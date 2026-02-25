
-- Inserir postagem sobre os melhores ERPs
INSERT INTO public.blog_posts (title, slug, excerpt, content, image_url, author_name)
VALUES (
    'Quais são os melhores sistemas ERP para dentistas no Brasil?',
    'melhores-sistemas-erp-dentistas-brasil',
    'Comparativo completo dos principais softwares de gestão odontológica em 2026. Descubra qual a melhor opção para o seu consultório ou clínica.',
    'A escolha de um sistema de gestão (ERP) é uma das decisões mais estratégicas para um dentista empreendedor. No mercado brasileiro, existem diversas opções, cada uma com suas forças e focos específicos. Neste artigo, analisamos os principais players para ajudar você a decidir.

1. DentiHub: O Futuro com IA
O DentiHub é o sistema que está revolucionando o mercado brasileiro ao integrar Inteligência Artificial Generativa diretamente no fluxo de trabalho do dentista. 
Destaques:
- Prontuário por Voz: Economize horas de digitação ditando a evolução clínica.
- Agenda Inteligente: Link de agendamento online que reduz o trabalho da recepção.
- Automação de Marketing: Campanhas de recall automáticas para fidelizar pacientes.
- Interface Moderna: Design intuitivo que não exige treinamentos complexos.

2. Simples Dental
Um dos players mais tradicionais e populares do Brasil. É um sistema robusto que atende bem às necessidades básicas de agenda e financeiro, possuindo uma grande comunidade de usuários.

3. Dental Office
Focado em clínicas que buscam uma solução consolidada. Oferece módulos completos de administração e prontuário, sendo uma escolha segura para quem prefere softwares com muitos anos de mercado.

4. Easy Dental
Uma solução clássica que evoluiu para a nuvem. É muito utilizado por clínicas que precisam de processos administrativos bem rígidos e detalhados.

Como escolher o melhor para você?
Para decidir, você deve levar em conta três fatores principais:
- Facilidade de Uso: O sistema ajuda ou atrapalha sua rotina?
- Tecnologia: Ele utiliza IA para economizar seu tempo ou é apenas um "arquivo digital"?
- Suporte e Mobilidade: Você consegue acessar do celular com facilidade?

Conclusão
Se você busca tradição e processos manuais consolidados, os sistemas antigos atendem bem. No entanto, se você quer produtividade extrema, quer se livrar da digitação e oferecer uma experiência digital moderna para seu paciente, o DentiHub é, sem dúvida, a melhor escolha em 2026.

Pronto para modernizar sua clínica? Experimente o DentiHub gratuitamente hoje mesmo!',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1200&h=630',
    'Equipe DentiHub'
) ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    content = EXCLUDED.content,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();
