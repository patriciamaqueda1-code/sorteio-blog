/**
 * POST /api/blog/backfill-images
 *
 * Gera imagens de capa para artigos que ainda não têm cover_image_url.
 * Protegido pelo mesmo CRON_SECRET do cron de artigos.
 *
 * Uso único: chamar uma vez para preencher os 9 artigos publicados antes
 * da integração com Pollinations.ai (commits anteriores a 27c16a2).
 *
 * Processa no máximo `limit` artigos por chamada (default 5) para evitar
 * timeout de 30s do Vercel (cada imagem leva ~30-90s).
 *
 * Exemplo:
 *   curl -X POST https://blog.sorteiobilionario.com.br/api/blog/backfill-images \
 *     -H "Authorization: Bearer SEU_CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"limit": 3}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { generateLotteryImage, buildImagePrompt } from '@/lib/ai-generator';

function validateSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Limite por chamada para não estourar timeout do Vercel (30s max)
  let limit = 5;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body?.limit === 'number' && body.limit > 0 && body.limit <= 20) {
      limit = body.limit;
    }
  } catch { /* usa default */ }

  // Busca artigos publicados sem imagem (cover_image_url IS NULL)
  const { data: posts, error: fetchError } = await supabase
    .from('blog_posts')
    .select('id, slug, lottery, concurso_number, image_prompt')
    .eq('status', 'published')
    .is('cover_image_url', null)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!posts || posts.length === 0) {
    return NextResponse.json({ ok: true, message: 'Nenhum artigo sem imagem encontrado.', processed: 0 });
  }

  const results: Array<{ id: string; slug: string; status: string; url?: string }> = [];

  for (const post of posts) {
    // Usa image_prompt salvo no artigo, ou gera um novo a partir do slug
    const prompt = post.image_prompt || buildImagePrompt(post.lottery ?? 'loteria', post.concurso_number ?? 0);

    const imageUrl = await generateLotteryImage(prompt, post.lottery ?? undefined);

    if (!imageUrl) {
      results.push({ id: post.id, slug: post.slug, status: 'image_failed' });
      continue;
    }

    const { error: updateError } = await supabase
      .from('blog_posts')
      .update({ cover_image_url: imageUrl })
      .eq('id', post.id);

    if (updateError) {
      results.push({ id: post.id, slug: post.slug, status: 'update_failed' });
      continue;
    }

    results.push({ id: post.id, slug: post.slug, status: 'ok', url: imageUrl });
  }

  // Invalida cache para os artigos aparecerem com a imagem nova
  const successCount = results.filter((r) => r.status === 'ok').length;
  if (successCount > 0) {
    revalidateTag('blog-posts', { expire: 0 });
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    success: successCount,
    failed: results.length - successCount,
    results,
  });
}
