/**
 * POST /api/blog/generate
 * Gera e salva um artigo de blog a partir dos dados de um sorteio.
 *
 * Segurança:
 *   - Autenticado via CRON_SECRET no header Authorization
 *   - Rate limiting: máx 20 requisições/hora
 *   - Input validado antes de chamar a IA
 *   - Conteúdo sanitizado antes de salvar
 *   - Sem dados do usuário final envolvidos
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateLotteryArticle, buildImagePrompt, type ArticleInput } from '@/lib/ai-generator';
import { slugify } from '@/lib/blog';

const ALLOWED_LOTTERIES = [
  'megasena','lotofacil','quina','lotomania','duplasena',
  'milionaria','timemania','diadesorte','supersete','loteca','federal',
];

function validateSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  // 1. Auth
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse + validação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const {
    lottery, concurso_number, draw_date, winning_numbers,
    prize_main, winners_count, accumulated, next_prize_estimate,
    hot_numbers, cold_numbers, source_context,
    auto_publish = false,
  } = body;

  if (!ALLOWED_LOTTERIES.includes(lottery))
    return NextResponse.json({ error: 'Loteria inválida' }, { status: 400 });
  if (!Number.isInteger(concurso_number) || concurso_number < 1)
    return NextResponse.json({ error: 'concurso_number inválido' }, { status: 400 });
  if (!Array.isArray(winning_numbers) || winning_numbers.length < 6)
    return NextResponse.json({ error: 'winning_numbers inválido (min 6)' }, { status: 400 });
  if (typeof prize_main !== 'number' || prize_main < 0)
    return NextResponse.json({ error: 'prize_main inválido' }, { status: 400 });

  // 3. Idempotência: não regerar se já existe artigo para esse concurso
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id, slug, status')
    .eq('lottery', lottery)
    .eq('concurso_number', concurso_number)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true, skipped: true, reason: 'already_exists',
      id: existing.id, slug: existing.slug, status: existing.status,
    });
  }

  // 4. Gerar artigo com IA
  const input: ArticleInput = {
    lottery, concurso_number, draw_date, winning_numbers,
    prize_main, winners_count, accumulated, next_prize_estimate,
    hot_numbers, cold_numbers,
    source_context: typeof source_context === 'string'
      ? source_context.slice(0, 3000)  // limite de contexto injetado
      : undefined,
  };

  const article = await generateLotteryArticle(input);

  // 5. Garantir slug único
  const baseSlug = article.slug || slugify(`${lottery}-${concurso_number}`);
  let slug = baseSlug;
  let attempt = 0;
  while (true) {
    const { data: collision } = await supabase
      .from('blog_posts')
      .select('id').eq('slug', slug).maybeSingle();
    if (!collision) break;
    slug = `${baseSlug}-${++attempt}`;
  }

  // 6. Schema.org para o artigo
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title,
    'description': article.meta_description,
    'datePublished': new Date().toISOString(),
    'author': { '@type': 'Organization', 'name': 'Sorteio Bilionário IA' },
    'publisher': {
      '@type': 'Organization',
      'name': 'Sorteio Bilionário IA',
      'logo': { '@type': 'ImageObject', 'url': 'https://sorteiobilionario.com.br/icons/icon-512.png' },
    },
    'mainEntityOfPage': { '@type': 'WebPage', '@id': `https://blog.sorteiobilionario.com.br/${slug}` },
  };

  // 7. Salvar no Supabase
  const now = new Date().toISOString();
  const { data: row, error: insertError } = await supabase
    .from('blog_posts')
    .insert({
      slug,
      title: article.title,
      meta_description: article.meta_description,
      content_html: article.content_html,
      excerpt: article.excerpt,
      cover_image_url: null,            // gerada separadamente via /api/blog/cover
      cover_alt: article.cover_alt,
      lottery,
      concurso_number,
      tags: article.tags,
      reading_time_min: article.reading_time_min,
      source_urls: body.source_urls ?? [],
      schema_json: schema,
      status: auto_publish ? 'published' : 'draft',
      published_at: auto_publish ? now : null,
      created_at: now,
      image_prompt: buildImagePrompt(lottery, concurso_number),
    })
    .select('id, slug, status')
    .single();

  if (insertError) {
    console.error('[blog/generate] erro ao salvar:', insertError.message);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: row.id, slug: row.slug, status: row.status });
}
