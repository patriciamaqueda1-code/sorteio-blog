/**
 * Gerador de artigos de blog usando Groq (llama-3.3-70b) — rápido, barato, bom.
 * Fallback: Anthropic Claude se ANTHROPIC_API_KEY disponível.
 *
 * Segurança: executa EXCLUSIVAMENTE no servidor (Node.js runtime).
 * Nenhuma API key é exposta ao cliente.
 */

import Groq from 'groq-sdk';
import { slugify, LOTTERY_LABELS } from './blog';
import { supabase } from './supabase';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface GeneratedArticle {
  title: string;
  slug: string;
  meta_description: string;
  excerpt: string;
  content_html: string;
  tags: string[];
  reading_time_min: number;
  cover_alt: string;
}

export interface ArticleInput {
  lottery: string;
  concurso_number: number;
  draw_date: string;          // ISO
  winning_numbers: number[];
  prize_main: number;         // R$ valor do prêmio principal
  winners_count: number;      // número de ganhadores do prêmio principal
  accumulated: boolean;
  next_prize_estimate: number;
  hot_numbers?: number[];     // dezenas quentes (alta frequência)
  cold_numbers?: number[];    // dezenas frias (em atraso)
  source_context?: string;    // trechos de notícias para basear o artigo
}

const SYSTEM_PROMPT = `Você é um jornalista especialista em loterias brasileiras e análise estatística.
Escreva artigos em português do Brasil, tom profissional mas acessível, baseados em dados reais.
NUNCA prometa ganhos ou garanta resultados — use linguagem de probabilidade.
NUNCA invente números ou dados — use apenas o que é fornecido.
Cite sempre a Caixa Econômica Federal como fonte oficial.
Tamanho ideal: 700–900 palavras.
Formato do conteúdo: HTML semântico com h2, h3, p, ul, strong. Sem html/head/body — apenas o conteúdo interno.
Responda SEMPRE em JSON válido com os campos: title, meta_description, excerpt, content_html, tags, slug.`;

export async function generateLotteryArticle(input: ArticleInput): Promise<GeneratedArticle> {
  const lotteryName = LOTTERY_LABELS[input.lottery] ?? input.lottery;
  const dateFormatted = new Date(input.draw_date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const prizeFormatted = input.prize_main.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  });
  const nextPrizeFormatted = input.next_prize_estimate.toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
  });

  const userPrompt = `
Escreva um artigo completo sobre o resultado da ${lotteryName}, concurso ${input.concurso_number}.

DADOS DO SORTEIO:
- Data: ${dateFormatted}
- Números sorteados: ${input.winning_numbers.join(', ')}
- Prêmio principal: ${prizeFormatted}
- Ganhadores: ${input.winners_count === 0 ? 'Nenhum (acumulou)' : input.winners_count}
- ${input.accumulated ? `Próximo prêmio estimado: ${nextPrizeFormatted} (acumulado)` : `Prêmio dividido entre ${input.winners_count} ganhador(es)`}
${input.hot_numbers?.length ? `- Dezenas mais frequentes nos últimos 90 concursos: ${input.hot_numbers.join(', ')}` : ''}
${input.cold_numbers?.length ? `- Dezenas em atraso (alta lacuna, estatisticamente relevantes): ${input.cold_numbers.join(', ')}` : ''}
${input.source_context ? `\nCONTEXTO DE NOTÍCIAS REAIS (use como referência):\n${input.source_context}` : ''}

ESTRUTURA OBRIGATÓRIA:
1. Introdução com o resultado principal e impacto
2. Análise dos números sorteados (frequência, padrões)
3. Seção sobre dezenas quentes e frias (se fornecidos)
4. Informações sobre o próximo sorteio
5. Dicas de estratégia baseadas em dados (sem promessas de ganho)
6. CTA sutil para análise estatística em sorteiobilionario.com.br

Retorne JSON com exatamente estes campos:
{
  "title": "título SEO com loteria, concurso e data",
  "slug": "slug-url-amigavel",
  "meta_description": "150-160 chars informativos",
  "excerpt": "2 frases resumindo o artigo",
  "content_html": "<h2>...</h2><p>...</p> (700-900 palavras em HTML semântico)",
  "tags": ["tag1", "tag2", "..."]
}
`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try { parsed = JSON.parse(raw); } catch { parsed = {}; }

  const title = parsed.title ?? `${lotteryName} Concurso ${input.concurso_number} — Resultado e Análise`;
  const content = parsed.content_html ?? parsed.content ?? '<p>Artigo em processamento.</p>';
  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;

  return {
    title,
    slug: slugify(`${lotteryName}-${input.concurso_number}-${dateFormatted.split(',')[0]}`),
    meta_description: parsed.meta_description ?? `Resultado da ${lotteryName} concurso ${input.concurso_number}. Análise estatística completa das dezenas sorteadas.`,
    excerpt: parsed.excerpt ?? title,
    content_html: content,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [lotteryName, 'loteria', 'resultado'],
    reading_time_min: Math.max(1, Math.ceil(wordCount / 200)),
    cover_alt: `Resultado ${lotteryName} concurso ${input.concurso_number} — Análise Estatística Sorteio Bilionário IA`,
  };
}

/**
 * Gera imagem de capa com fallback chain:
 *   1. NVIDIA NIM FLUX.1-schnell — alta qualidade, requer NVIDIA_API_KEY
 *   2. NVIDIA NIM SDXL           — qualidade sólida, requer NVIDIA_API_KEY
 *   3. Pollinations.ai "flux"    — gratuito, sem API key
 *   4. Pollinations.ai "turbo"   — gratuito, sem API key (último recurso)
 *
 * Se um provedor falhar, passa automaticamente para o próximo.
 * Upload do buffer resultante para Supabase Storage "blog-images".
 */

// ── Paleta de cores por loteria ─────────────────────────────────────────────

const LOTTERY_COLORS: Record<string, { primary: string; accent: string; balls: string }> = {
  megasena:       { primary: '#009933', accent: '#00cc44', balls: 'vibrant green spheres' },
  lotofacil:      { primary: '#930089', accent: '#cc00bb', balls: 'deep purple spheres' },
  quina:          { primary: '#260085', accent: '#4400cc', balls: 'royal blue spheres' },
  lotomania:      { primary: '#f97f02', accent: '#ffaa44', balls: 'bright orange spheres' },
  timemania:      { primary: '#00985e', accent: '#00cc7a', balls: 'emerald green spheres' },
  duplasena:      { primary: '#a4121a', accent: '#dd2233', balls: 'crimson red spheres' },
  diadesorte:     { primary: '#8a4100', accent: '#c86000', balls: 'warm amber spheres' },
  maismilionaria: { primary: '#4f008a', accent: '#7700cc', balls: 'deep violet spheres' },
  supersete:      { primary: '#a8006e', accent: '#dd0099', balls: 'hot pink spheres' },
  loteca:         { primary: '#005ca9', accent: '#0080ee', balls: 'electric blue spheres' },
  federal:        { primary: '#003380', accent: '#0055cc', balls: 'navy blue spheres' },
};

// ── Helpers internos ────────────────────────────────────────────────────────

async function _nvidiaFlux(prompt: string): Promise<Buffer> {
  console.log('[ai-image] NVIDIA NIM FLUX.1-schnell…');
  const res = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux.1-schnell',
      prompt, n: 1, width: 1024, height: 1024, response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`);
  const data = await res.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new Error('sem imagem na resposta');
  return Buffer.from(base64, 'base64');
}

async function _nvidiaSdxl(prompt: string): Promise<Buffer> {
  console.log('[ai-image] NVIDIA NIM SDXL…');
  const res = await fetch('https://integrate.api.nvidia.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      prompt, n: 1, width: 1024, height: 1024, response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 120)}`);
  const data = await res.json() as { data?: Array<{ b64_json?: string }>; artifacts?: Array<{ base64?: string }> };
  const base64 = data.data?.[0]?.b64_json ?? data.artifacts?.[0]?.base64;
  if (!base64) throw new Error('sem imagem na resposta');
  return Buffer.from(base64, 'base64');
}

async function _pollinations(prompt: string, model: string): Promise<Buffer> {
  const encoded = encodeURIComponent(prompt);
  const seed    = Math.floor(Math.random() * 9_999);
  const url     = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&model=${model}&seed=${seed}&nologo=true&enhance=false`;
  console.log(`[ai-image] Pollinations model="${model}"…`);
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000), headers: { Accept: 'image/*' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // resposta muito pequena = erro silencioso (página de erro em HTML/JSON)
  if (buf.length < 2_000) throw new Error(`resposta inválida (${buf.length} bytes)`);
  return buf;
}

// ── Função principal ────────────────────────────────────────────────────────

export async function generateLotteryImage(imagePrompt: string): Promise<string | null> {
  let imgBuffer: Buffer | null = null;

  // 1. NVIDIA NIM FLUX.1-schnell — primário, maior qualidade
  if (!imgBuffer && process.env.NVIDIA_API_KEY) {
    try {
      imgBuffer = await _nvidiaFlux(imagePrompt);
      console.log(`[ai-image] ✓ NVIDIA NIM FLUX.1-schnell (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ NVIDIA NIM FLUX.1-schnell:', (err as Error).message);
    }
  }

  // 2. NVIDIA NIM SDXL — secundário NVIDIA
  if (!imgBuffer && process.env.NVIDIA_API_KEY) {
    try {
      imgBuffer = await _nvidiaSdxl(imagePrompt);
      console.log(`[ai-image] ✓ NVIDIA NIM SDXL (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ NVIDIA NIM SDXL:', (err as Error).message);
    }
  }

  // 3. Pollinations.ai "flux" — fallback gratuito
  if (!imgBuffer) {
    try {
      imgBuffer = await _pollinations(imagePrompt, 'flux');
      console.log(`[ai-image] ✓ Pollinations "flux" (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Pollinations "flux":', (err as Error).message);
    }
  }

  // 4. Pollinations.ai "turbo" — último recurso
  if (!imgBuffer) {
    try {
      imgBuffer = await _pollinations(imagePrompt, 'turbo');
      console.log(`[ai-image] ✓ Pollinations "turbo" (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Pollinations "turbo":', (err as Error).message);
    }
  }

  if (!imgBuffer) {
    console.warn('[ai-image] todos os provedores falharam — artigo salvo sem imagem');
    return null;
  }

  // Upload para Supabase Storage
  try {
    const fileName = `cover-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, imgBuffer, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });

    if (uploadError) {
      console.warn('[ai-image] Supabase Storage upload falhou:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(fileName);
    console.log(`[ai-image] salvo: ${urlData.publicUrl.slice(0, 80)}…`);
    return urlData.publicUrl;
  } catch (err) {
    console.warn('[ai-image] upload falhou:', (err as Error).message);
    return null;
  }
}

/**
 * Prompt de imagem de capa específico por loteria.
 * Usa as cores e identidade visual oficial de cada loteria brasileira.
 */
export function buildImagePrompt(lottery: string, concurso: number): string {
  const name    = LOTTERY_LABELS[lottery] ?? lottery;
  const palette = LOTTERY_COLORS[lottery] ?? { primary: '#260085', accent: '#f6d27a', balls: 'golden spheres' };

  return `Dramatic lottery draw moment for "${name} Concurso ${concurso}". \
${palette.balls} floating dramatically against ultra-dark background, \
cinematic volumetric light beams in ${palette.primary}, bokeh depth of field, \
lottery machine glass sphere visible, golden number display showing lucky numbers, \
photorealistic 8K render, sharp focus, professional photography lighting. \
Color palette: ${palette.primary}, ${palette.accent}, deep black, gold accents. \
No text, no people, no faces. Pure abstract drama.`;
}
