<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:sorteio-blog-rules -->
# Sorteio Blog — Regras Críticas (erros já cometidos, NUNCA repetir)

## Stack
Next.js 16.2.6 + React 19 + Tailwind v4 + `cacheComponents: true` (PPR).
Supabase: projeto `wcokgzjsnssyvyrwacwf` (MESMO do app principal — nunca misturar com Agendai `liuvivijppnbpjiflcyd`).

## ❌ PROIBIDO — causa build error imediato
- `export const dynamic = ...` em qualquer route (incompatível com cacheComponents)
- `export const dynamicParams = ...` em qualquer route (idem)
- `'use cache'` diretamente em Route Handlers que retornam `Response`/`NextResponse` (mover para função interna)
- `await params` sem `generateStaticParams()` em páginas dinâmicas

## ❌ URL de artigos — NUNCA usar /blog/:slug
Artigos ficam em `app/[slug]/page.tsx` → URL `blog.sorteiobilionario.com.br/:slug`.
**NUNCA** mover para `app/blog/[slug]` — duplicaria "blog" na URL (domínio já tem `blog.`).
Redirect 301 de `/blog/:slug` → `/:slug` existe em `next.config.ts` — NÃO remover.

## Padrão correto de página (params são Promise no Next.js 16)
```tsx
// Página NÃO async + Suspense + wrapper
export default function ArticlePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton />}>
      <ArticleContentWrapper paramsPromise={params} />
    </Suspense>
  );
}
async function ArticleContentWrapper({ paramsPromise }) {
  const { slug } = await paramsPromise;
  return <ArticleContent slug={slug} />;
}
async function ArticleContent({ slug }) {
  'use cache';
  cacheLife('days');
  cacheTag(`blog-post-${slug}`, 'blog-posts');
  // buscar dados...
}
```

## Cache invalidation
- **CORRETO:** `revalidateTag('blog-posts', { expire: 0 })` — invalidação imediata
- **ERRADO:** `revalidateTag('blog-posts', 'hours')` — blog mostra vazio na 1ª visita após cron

## Groq JSON mode
O prompt DEVE conter a palavra "JSON" no system prompt E no user prompt.
Senão Groq retorna 400: `'messages' must contain the word 'json'`.

## API da Caixa — geobloqueada no Vercel US
Usar SEMPRE o mirror: `loteriascaixa-api.herokuapp.com/api/{lottery}/latest`
`milionaria` → slug `maismilionaria` no mirror (ver MIRROR_SLUG em cron/route.ts).

## Todos os links internos — absolutamente sem /blog/
- `app/blog/page.tsx` → links de artigos: `href={\`/${post.slug}\``}`
- `app/sitemap.ts` → `${base}/${slug}` (não `/blog/${slug}`)
- `app/feed.xml/route.ts` → `${BASE_URL}/${post.slug}`
- JSON-LD `@id` → `blog.sorteiobilionario.com.br/${slug}`
<!-- END:sorteio-blog-rules -->
