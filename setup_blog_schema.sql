
-- ============================================================================
-- TABELA DE BLOG E POLÍTICAS DE SEGURANÇA
-- ============================================================================

-- 1. Criar Tabela
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL amigável (ex: tecnologia-na-odontologia)
    excerpt TEXT, -- Resumo curto para o card
    content TEXT NOT NULL, -- Conteúdo completo (pode ser HTML básico ou texto)
    image_url TEXT, -- URL da imagem de capa
    author_name TEXT DEFAULT 'Equipe DentiHub',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(slug)
);

-- 2. Habilitar Segurança (RLS)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 3. Política de Leitura Pública
DROP POLICY IF EXISTS "Public read blog posts" ON public.blog_posts;
CREATE POLICY "Public read blog posts" ON public.blog_posts
    FOR SELECT
    USING (true);

-- 4. Política de Escrita (Apenas Super Admin)
-- Utiliza a função is_super_admin() criada anteriormente
DROP POLICY IF EXISTS "Super Admin manage blog" ON public.blog_posts;
CREATE POLICY "Super Admin manage blog" ON public.blog_posts
    FOR ALL
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 5. Índice para busca rápida por slug
CREATE INDEX IF NOT EXISTS idx_blog_slug ON public.blog_posts(slug);
