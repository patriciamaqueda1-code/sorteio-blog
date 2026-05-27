-- ============================================================
-- Tabela: blog_posts
-- Projeto: Sorteio Bilionário IA (wcokgzjsnssyvyrwacwf)
-- Criada: 2026-05-27
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id                  BIGSERIAL     PRIMARY KEY,
  slug                TEXT          NOT NULL UNIQUE,
  title               TEXT          NOT NULL,
  meta_description    TEXT,
  content_html        TEXT,
  excerpt             TEXT,
  cover_image_url     TEXT,
  cover_alt           TEXT,
  lottery             TEXT,                    -- 'megasena', 'lotofacil', etc.
  concurso_number     INTEGER,
  tags                TEXT[]        NOT NULL DEFAULT '{}',
  reading_time_min    INTEGER       NOT NULL DEFAULT 1,
  source_urls         TEXT[]        NOT NULL DEFAULT '{}',
  schema_json         JSONB,                   -- Schema.org Article JSON-LD
  image_prompt        TEXT,                    -- prompt para gerar capa via DALL-E / Ideogram
  status              TEXT          NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Índices para queries comuns
CREATE INDEX IF NOT EXISTS idx_blog_posts_status
  ON public.blog_posts (status);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
  ON public.blog_posts (published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_blog_posts_lottery
  ON public.blog_posts (lottery);

CREATE INDEX IF NOT EXISTS idx_blog_posts_lottery_concurso
  ON public.blog_posts (lottery, concurso_number);

-- Full-text search em português
CREATE INDEX IF NOT EXISTS idx_blog_posts_fts
  ON public.blog_posts
  USING gin (
    to_tsvector('portuguese',
      COALESCE(title, '') || ' ' ||
      COALESCE(meta_description, '') || ' ' ||
      COALESCE(excerpt, '')
    )
  );

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Leitura pública apenas de artigos publicados
CREATE POLICY "blog_posts_public_select"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- service_role bypassa RLS automaticamente — não precisa de policy para INSERT/UPDATE
-- (nunca expor service_role key ao client-side)

-- ─── Comentário da tabela ─────────────────────────────────────────────────────

COMMENT ON TABLE public.blog_posts IS
  'Artigos de blog gerados por IA a partir de resultados das loterias brasileiras.';
