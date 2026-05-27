/**
 * GET /api/blog/cron
 * Busca os últimos resultados de cada loteria na API da Caixa e gera artigos.
 *
 * Acionado pelo Vercel Cron (3× ao dia: 8h, 14h, 20h UTC).
 * Autenticado via CRON_SECRET no header Authorization.
 * Idempotente — reentrante sem duplicar artigos.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { generateLotteryArticle, buildImagePrompt } from '@/lib/ai-generator';
import { slugify } from '@/lib/blog';

function validateSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Loterias suportadas pela API da Caixa (path param)
const LOTTERIES = [
  'megasena',
  'lotofacil',
  'quina',
  'lotomania',
  'duplasena',
  'milionaria',
  'timemania',
  'diadesorte',
  'supersete',
] as const;

const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';

interface CaixaResultado {
  numero: number;
  dataApuracao: string;           // "DD/MM/YYYY"
  listaDezenas: string[];         // ordem de sorteio
  dezenasSorteadasOrdemSorteio?: string[];
  premiacoes: Array<{
    descricao: string;
    faixa: number;
    numeroDeGanhadores: number;
    valorPremio: number;
  }>;
  acumulado: boolean;
  valorEstimadoProximoConcurso: number;
  numeroConcursoAnterior?: number;
}

async function fetchLatestResult(lottery: string): Promise<CaixaResultado | null> {
  try {
    const res = await fetch(`${CAIXA_BASE}/${lottery}/`, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; SorteioBilionario-blog/1.0)',
        'Origin': 'https://loterias.caixa.gov.br',
        'Referer': 'https://loterias.caixa.gov.br/',
      },
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (!res.ok) {
      console.warn(`[cron] ${lottery}: HTTP ${res.status}`);
      return null;
    }
    return await res.json() as CaixaResultado;
  } catch (err: any) {
    console.warn(`[cron] ${lottery}: fetch error — ${err.message}`);
    return null;
  }
}

function parseBrDate(brDate: string): string {
  // "DD/MM/YYYY" → "YYYY-MM-DD"
  const [d, m, y] = brDate.split('/');
  return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  if (!validateSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Array<{
    lottery: string;
    concurso?: number;
    status: string;
    slug?: string;
    error?: string;
  }> = [];

  let newPostsCount = 0;

  for (const lottery of LOTTERIES) {
    try {
      // 1. Buscar resultado mais recente
      const resultado = await fetchLatestResult(lottery);
      if (!resultado) {
        results.push({ lottery, status: 'fetch_failed' });
        continue;
      }

      const {
        numero,
        dataApuracao,
        listaDezenas,
        dezenasSorteadasOrdemSorteio,
        premiacoes,
        acumulado,
        valorEstimadoProximoConcurso,
      } = resultado;

      // 2. Verificar idempotência
      const { data: existing } = await supabase
        .from('blog_posts')
        .select('id, slug')
        .eq('lottery', lottery)
        .eq('concurso_number', numero)
        .maybeSingle();

      if (existing) {
        results.push({ lottery, concurso: numero, status: 'already_exists', slug: existing.slug });
        continue;
      }

      // 3. Extrair números sorteados
      const winningNumbers = (listaDezenas || dezenasSorteadasOrdemSorteio || [])
        .map(Number)
        .filter((n) => !isNaN(n));

      if (winningNumbers.length < 5) {
        results.push({ lottery, concurso: numero, status: 'invalid_numbers' });
        continue;
      }

      // 4. Extrair prêmio e ganhadores do 1.º prêmio (faixa 1)
      const prizeRow = premiacoes?.find((p) => p.faixa === 1) ?? premiacoes?.[0];
      const prizeMain = prizeRow?.valorPremio ?? 0;
      const winnersCount = prizeRow?.numeroDeGanhadores ?? 0;

      // 5. Gerar artigo com IA
      const article = await generateLotteryArticle({
        lottery,
        concurso_number: numero,
        draw_date: parseBrDate(dataApuracao),
        winning_numbers: winningNumbers,
        prize_main: prizeMain,
        winners_count: winnersCount,
        accumulated: acumulado,
        next_prize_estimate: valorEstimadoProximoConcurso ?? 0,
      });

      // 6. Garantir slug único
      const baseSlug = article.slug || slugify(`${lottery}-${numero}`);
      let slug = baseSlug;
      let attempt = 0;
      while (true) {
        const { data: collision } = await supabase
          .from('blog_posts')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();
        if (!collision) break;
        slug = `${baseSlug}-${++attempt}`;
      }

      // 7. Schema.org
      const now = new Date().toISOString();
      const schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.meta_description,
        datePublished: now,
        author: { '@type': 'Organization', name: 'Sorteio Bilionário IA' },
        publisher: {
          '@type': 'Organization',
          name: 'Sorteio Bilionário IA',
          logo: { '@type': 'ImageObject', url: 'https://sorteiobilionario.com.br/icons/icon-512.png' },
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `https://sorteiobilionario.com.br/blog/${slug}`,
        },
      };

      // 8. Salvar no Supabase (status=published automático via cron)
      const { data: row, error: insertError } = await supabase
        .from('blog_posts')
        .insert({
          slug,
          title: article.title,
          meta_description: article.meta_description,
          content_html: article.content_html,
          excerpt: article.excerpt,
          cover_image_url: null,
          cover_alt: article.cover_alt,
          lottery,
          concurso_number: numero,
          tags: article.tags,
          reading_time_min: article.reading_time_min,
          source_urls: [],
          schema_json: schema,
          image_prompt: buildImagePrompt(lottery, numero),
          status: 'published',
          published_at: now,
          created_at: now,
        })
        .select('id, slug')
        .single();

      if (insertError) {
        console.error(`[cron] ${lottery} insert error:`, insertError.message);
        results.push({ lottery, concurso: numero, status: 'insert_failed', error: insertError.message });
        continue;
      }

      newPostsCount++;
      results.push({ lottery, concurso: numero, status: 'published', slug: row.slug });

      // Notificar Google Search Console via IndexNow (se configurado)
      if (process.env.INDEXNOW_KEY) {
        void pingIndexNow(slug);
      }

    } catch (err: any) {
      console.error(`[cron] ${lottery} unexpected error:`, err.message);
      results.push({ lottery, status: 'error', error: err.message });
    }
  }

  // Invalidar cache de artigos se gerou novos
  // Second arg = stale-while-revalidate window ('hours' = up to 5m stale while regenerating)
  if (newPostsCount > 0) {
    revalidateTag('blog-posts', 'hours');
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    new_posts: newPostsCount,
    total_processed: results.length,
    results,
  });
}

// ─── IndexNow ping para Google/Bing indexar artigo imediatamente ─────────────
async function pingIndexNow(slug: string) {
  const key = process.env.INDEXNOW_KEY!;
  const url = `https://sorteiobilionario.com.br/blog/${slug}`;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'sorteiobilionario.com.br',
        key,
        keyLocation: `https://sorteiobilionario.com.br/${key}.txt`,
        urlList: [url],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    console.log(`[cron] IndexNow ping: ${url}`);
  } catch {
    // não-crítico
  }
}
