/**
 * Gerador de artigos de blog usando Groq (llama-3.3-70b) — rápido, barato, bom.
 * Fallback: Anthropic Claude se ANTHROPIC_API_KEY disponível.
 *
 * Segurança: executa EXCLUSIVAMENTE no servidor (Node.js runtime).
 * Nenhuma API key é exposta ao cliente.
 */

import Groq from 'groq-sdk';
import path from 'path';
import { existsSync } from 'fs';
import sharp from 'sharp';
import { slugify, LOTTERY_LABELS } from './blog';
import { supabase } from './supabase';
import * as opentype from 'opentype.js';
import { CARD_FONT_B64 } from './card-font';

// Fonte ArchivoBlack carregada 1x. O texto do card é renderizado como PATHS (vetores),
// NÃO como <text> — assim NÃO depende de fonte instalada no servidor. O Vercel/Linux não
// tem Arial nem fontes do sistema → <text> virava quadradinhos (tofu). Path resolve de vez.
const _fontBuf = Buffer.from(CARD_FONT_B64, 'base64');
const CARD_FONT = opentype.parse(
  _fontBuf.buffer.slice(_fontBuf.byteOffset, _fontBuf.byteOffset + _fontBuf.byteLength)
);

/** Texto → <path> SVG vetorizado (independe de fonte no servidor). */
function tPath(
  text: string, x: number, y: number, size: number, fill: string,
  anchor: 'start' | 'middle' | 'end' = 'start', opacity = 1, letterSpacing = 0,
): string {
  let adv = CARD_FONT.getAdvanceWidth(text, size);
  if (letterSpacing) adv += letterSpacing * Math.max(0, text.length - 1);
  let dx = x;
  if (anchor === 'middle') dx = x - adv / 2;
  else if (anchor === 'end') dx = x - adv;
  if (letterSpacing) {
    let cx = dx, d = '';
    for (const ch of [...text]) {
      d += CARD_FONT.getPath(ch, cx, y, size).toPathData(2);
      cx += CARD_FONT.getAdvanceWidth(ch, size) + letterSpacing;
    }
    return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
  }
  const d = CARD_FONT.getPath(text, dx, y, size).toPathData(2);
  return `<path d="${d}" fill="${fill}" opacity="${opacity}"/>`;
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Geração de texto JSON do artigo. Cadeia: OpenAI (PRINCIPAL, se houver
 * OPENAI_API_KEY; modelo OPENAI_TEXT_MODEL, default gpt-4o) → Groq
 * (llama-3.3-70b) como fallback. Os dois usam response_format json_object.
 * Nunca quebra: se a OpenAI faltar/falhar, cai pro Groq exatamente como antes.
 */
async function generateArticleJSON(system: string, user: string): Promise<string> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const model = process.env.OPENAI_TEXT_MODEL || 'gpt-4o';
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.6,
          max_tokens: 3000,
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) {
        const d = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        const t = d.choices?.[0]?.message?.content;
        if (t) { console.log(`[ai-text] ✓ OpenAI ${model}`); return t; }
      } else {
        console.warn('[ai-text] ✗ OpenAI', res.status, (await res.text().catch(() => '')).slice(0, 160));
      }
    } catch (err) {
      console.warn('[ai-text] ✗ OpenAI erro:', (err as Error).message);
    }
  }
  // Fallback: Groq (comportamento original)
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.6,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });
  return completion.choices[0]?.message?.content ?? '{}';
}

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

  const raw = await generateArticleJSON(SYSTEM_PROMPT, userPrompt);
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

/**
 * Google Imagen 3 via Gemini API — PRIMÁRIO (100 imagens/dia GRÁTIS com Google AI Studio)
 * Requer GOOGLE_AI_KEY obtida em: https://aistudio.google.com/apikey (login com Gmail)
 * Qualidade: fotorrealista, SynthID watermark, melhor suporte a texto em imagem.
 */
async function _googleImagen(prompt: string): Promise<Buffer> {
  console.log('[ai-image] Google Imagen 3 (Gemini API)…');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${process.env.GOOGLE_AI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          safetyFilterLevel: 'block_only_high',
          personGeneration: 'dont_allow',
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json() as { predictions?: Array<{ bytesBase64Encoded?: string }> };
  const base64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!base64) throw new Error('Imagen 3: sem imagem na resposta');
  return Buffer.from(base64, 'base64');
}

/** Together AI — FLUX.1-schnell-Free (gratuito, qualidade excelente) */
/**
 * OpenAI gpt-image-1-mini — PRIMÁRIO. Melhor aderência ao tema da loteria
 * (cores/bolas corretas), ~US$0.01/imagem (low quality). Requer OPENAI_API_KEY.
 */
async function _openaiImage(prompt: string): Promise<Buffer> {
  console.log('[ai-image] OpenAI gpt-image-1-mini…');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1-mini',
      prompt,
      size: '1536x1024',    // paisagem 3:2 — ideal pra capa de blog
      quality: 'medium',    // qualidade nítida/profissional (~US$0,04/img). 'low' embaçava.
      n: 1,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new Error('OpenAI gpt-image-1-mini: sem imagem na resposta');
  return Buffer.from(base64, 'base64');
}

async function _togetherAI(prompt: string): Promise<Buffer> {
  console.log('[ai-image] Together AI FLUX.1-schnell-Free…');
  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell-Free',
      prompt,
      width: 1280,
      height: 720,
      steps: 4,
      n: 1,
      response_format: 'b64_json',
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json() as { data?: Array<{ b64_json?: string }> };
  const base64 = data.data?.[0]?.b64_json;
  if (!base64) throw new Error('Together AI: sem imagem na resposta');
  return Buffer.from(base64, 'base64');
}

/** fal.ai — FLUX.1-schnell (pago ~$0.003/img, velocidade e qualidade máximas) */
async function _falAI(prompt: string): Promise<Buffer> {
  console.log('[ai-image] fal.ai FLUX.1-schnell…');
  const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
      num_inference_steps: 4,
      enable_safety_checker: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const data = await res.json() as { images?: Array<{ url?: string }> };
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) throw new Error('fal.ai: sem URL de imagem na resposta');
  const dl = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!dl.ok) throw new Error(`fal.ai download HTTP ${dl.status}`);
  return Buffer.from(await dl.arrayBuffer());
}

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

// ── Composição de logo da loteria ────────────────────────────────────────────

/**
 * Composta o logo oficial da loteria no canto inferior esquerdo da imagem gerada.
 * Adiciona um fundo semi-transparente arredondado para garantir contraste em qualquer cena.
 * Se o logo não existir, retorna o buffer original sem alteração (fail-safe).
 */
async function compositeLotteryLogo(imgBuffer: Buffer, lottery: string): Promise<Buffer> {
  const logosDir = path.join(process.cwd(), 'public', 'logos');
  const logoPath = path.join(logosDir, `${lottery}.png`);

  if (!existsSync(logoPath)) {
    console.log(`[ai-image] logo não encontrado para "${lottery}" — pulando composição`);
    return imgBuffer;
  }

  try {
    const LOGO_MAX_W = 210;
    const LOGO_MAX_H = 95;
    const PADDING    = 24;

    // Redimensionar logo mantendo proporção
    const { data: logoData, info: logoInfo } = await sharp(logoPath)
      .resize({ width: LOGO_MAX_W, height: LOGO_MAX_H, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });

    const lw = logoInfo.width;
    const lh = logoInfo.height;

    // Detectar dimensões reais da imagem base
    const meta  = await sharp(imgBuffer).metadata();
    const imgH  = meta.height ?? 1024;

    // Fundo arredondado semi-transparente atrás do logo
    const bgW   = lw + 24;
    const bgH   = lh + 16;
    const bgSvg = Buffer.from(
      `<svg width="${bgW}" height="${bgH}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${bgW}" height="${bgH}" rx="12" fill="rgba(0,0,0,0.62)"/>` +
      `</svg>`,
    );

    const bgLeft   = PADDING - 12;
    const bgTop    = imgH - lh - PADDING - 8;
    const logoLeft = PADDING;
    const logoTop  = imgH - lh - PADDING;

    const composited = await sharp(imgBuffer)
      .composite([
        { input: bgSvg,    left: bgLeft,   top: bgTop,   blend: 'over' },
        { input: logoData, left: logoLeft, top: logoTop, blend: 'over' },
      ])
      .jpeg({ quality: 92 })
      .toBuffer();

    console.log(`[ai-image] ✓ logo "${lottery}" composto (${lw}×${lh}px)`);
    return composited;
  } catch (err) {
    console.warn(`[ai-image] composição de logo falhou (${lottery}):`, (err as Error).message);
    return imgBuffer; // fail-safe: retorna original
  }
}

// ── Card visual local (sem API) ──────────────────────────────────────────────

/**
 * Gera um card visual profissional com os dados reais do sorteio.
 * 100% local — usa sharp + SVG, zero API, zero custo, nunca falha.
 * Resultado: imagem 1280×720 JPEG com logo da loteria composto.
 */
async function generateBrandedCard(data: CardData): Promise<Buffer> {
  const W = 1280, H = 720;
  const name    = (LOTTERY_LABELS[data.lottery] ?? data.lottery).toUpperCase();
  const palette = LOTTERY_COLORS[data.lottery] ?? { primary: '#260085', accent: '#f6d27a', balls: '' };
  const nums    = data.winning_numbers.slice(0, 10); // máximo 10 dezenas
  const p       = palette.primary;
  const a       = palette.accent;

  // Prêmio formatado
  const prizeStr = data.prize_main
    ? data.prize_main.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : '';

  // Status e cor
  let statusText = '', statusColor = '#ffffff';
  if (data.accumulated) {
    statusText  = 'ACUMULOU!';
    statusColor = '#ffd700';
  } else if (!data.winners_count || data.winners_count === 0) {
    statusText  = 'SEM GANHADORES · ACUMULA';
    statusColor = '#ff9944';
  } else if (data.winners_count === 1) {
    statusText  = '1 GANHADOR!';
    statusColor = '#44ffaa';
  } else {
    statusText  = `${data.winners_count} GANHADORES!`;
    statusColor = '#44ffaa';
  }

  // Bolas numéricas — tamanho adaptável à quantidade de dezenas
  const BALL_R   = nums.length <= 7 ? 46 : nums.length <= 10 ? 38 : nums.length <= 13 ? 32 : 26;
  const BALL_GAP = nums.length <= 7 ? 18 : nums.length <= 10 ? 14 : 10;
  const totalW   = nums.length * (BALL_R * 2 + BALL_GAP) - BALL_GAP;
  const startX   = (W - totalW) / 2 + BALL_R;
  const ballY    = 390;

  const fontSize = Math.max(16, Math.round(BALL_R * 0.62));
  const ballsSvg = nums.map((n, i) => {
    const cx = startX + i * (BALL_R * 2 + BALL_GAP);
    const label = n.toString().padStart(2, '0');
    return `
      <circle cx="${cx}" cy="${ballY}" r="${BALL_R}" fill="${p}" opacity="0.92"/>
      <circle cx="${cx}" cy="${ballY}" r="${BALL_R - 4}" fill="none" stroke="${a}" stroke-width="2.5" opacity="0.55"/>
      <circle cx="${cx}" cy="${ballY - Math.round(BALL_R*0.3)}" r="${Math.round(BALL_R*0.22)}" fill="white" opacity="0.12"/>
      ${tPath(label, cx, ballY + Math.round(fontSize*0.37), fontSize, 'white', 'middle')}`;
  }).join('');

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="#070710"/>
      <stop offset="50%"  stop-color="${p}28"/>
      <stop offset="100%" stop-color="#070710"/>
    </linearGradient>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${p}"/>
      <stop offset="100%" stop-color="${p}00"/>
    </linearGradient>
    <filter id="gl" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="10" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="tgl" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Fundo -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Círculos decorativos de fundo -->
  <circle cx="0"   cy="0"   r="320" fill="${p}" opacity="0.07"/>
  <circle cx="${W}" cy="${H}" r="380" fill="${a}" opacity="0.05"/>
  <circle cx="${W/2}" cy="${H/2}" r="420" fill="${p}" opacity="0.03"/>

  <!-- Barra superior colorida -->
  <rect x="0" y="0" width="${W}" height="100" fill="url(#hdr)" opacity="0.85"/>

  <!-- Nome da loteria -->
  ${tPath(name, 90, 70, 42, 'white')}

  <!-- Concurso no canto superior direito -->
  ${tPath(`Concurso #${data.concurso}`, W - 80, 58, 20, a, 'end', 0.9)}
  ${tPath('RESULTADO OFICIAL', W - 80, 80, 14, 'white', 'end', 0.5)}

  <!-- Linha separadora -->
  <line x1="80" y1="116" x2="${W - 80}" y2="116" stroke="${a}" stroke-width="1" opacity="0.35"/>

  <!-- Label dezenas -->
  ${tPath('DEZENAS SORTEADAS', W/2, 168, 14, a, 'middle', 0.6, 4)}

  <!-- Bolas -->
  <g filter="url(#gl)">${ballsSvg}</g>

  <!-- Linha separadora inferior -->
  <line x1="80" y1="${H - 148}" x2="${W - 80}" y2="${H - 148}" stroke="${a}" stroke-width="1" opacity="0.3"/>

  <!-- Status (ACUMULOU / GANHADORES) -->
  ${tPath(statusText, W/2, H - 100, 32, statusColor, 'middle')}

  <!-- Prêmio -->
  ${prizeStr ? tPath(`${data.accumulated ? 'Próximo prêmio estimado: ' : 'Prêmio: '}${prizeStr}`, W/2, H - 60, 20, 'white', 'middle', 0.85) : ''}

  <!-- Marca bottom right -->
  ${tPath('sorteiobilionario.com.br', W - 80, H - 28, 13, a, 'end', 0.5)}
</svg>`;

  return sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

// ── Função principal ────────────────────────────────────────────────────────

export async function generateLotteryImage(imagePrompt: string, lottery?: string, cardData?: CardData): Promise<string | null> {
  let imgBuffer: Buffer | null = null;

  // 0. OpenAI gpt-image-1-mini — PRIMÁRIO (melhor aderência ao tema da loteria, ~US$0.01/img)
  if (!imgBuffer && process.env.OPENAI_API_KEY) {
    try {
      imgBuffer = await _openaiImage(imagePrompt);
      console.log(`[ai-image] ✓ OpenAI gpt-image-1-mini (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ OpenAI gpt-image-1-mini:', (err as Error).message);
    }
  }

  // 1. Google Imagen 3 — fallback (100/dia grátis com Gmail via Google AI Studio)
  if (!imgBuffer && process.env.GOOGLE_AI_KEY) {
    try {
      imgBuffer = await _googleImagen(imagePrompt);
      console.log(`[ai-image] ✓ Google Imagen 3 (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Google Imagen 3:', (err as Error).message);
    }
  }

  // 2. Together AI FLUX.1-schnell-Free — segunda opção (gratuito)
  if (!imgBuffer && process.env.TOGETHER_API_KEY) {
    try {
      imgBuffer = await _togetherAI(imagePrompt);
      console.log(`[ai-image] ✓ Together AI FLUX.1-schnell-Free (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Together AI:', (err as Error).message);
    }
  }

  // 3. fal.ai FLUX.1-schnell — terceira opção premium
  if (!imgBuffer && process.env.FAL_KEY) {
    try {
      imgBuffer = await _falAI(imagePrompt);
      console.log(`[ai-image] ✓ fal.ai FLUX.1-schnell (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ fal.ai:', (err as Error).message);
    }
  }

  // 4. NVIDIA NIM FLUX.1-schnell
  if (!imgBuffer && process.env.NVIDIA_API_KEY) {
    try {
      imgBuffer = await _nvidiaFlux(imagePrompt);
      console.log(`[ai-image] ✓ NVIDIA NIM FLUX.1-schnell (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ NVIDIA NIM FLUX.1-schnell:', (err as Error).message);
    }
  }

  // 5. NVIDIA NIM SDXL
  if (!imgBuffer && process.env.NVIDIA_API_KEY) {
    try {
      imgBuffer = await _nvidiaSdxl(imagePrompt);
      console.log(`[ai-image] ✓ NVIDIA NIM SDXL (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ NVIDIA NIM SDXL:', (err as Error).message);
    }
  }

  // 6. Pollinations.ai "flux" — fallback emergência
  if (!imgBuffer) {
    try {
      imgBuffer = await _pollinations(imagePrompt, 'flux');
      console.log(`[ai-image] ✓ Pollinations "flux" (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Pollinations "flux":', (err as Error).message);
    }
  }

  // 7. Pollinations.ai "turbo" — último recurso absoluto
  if (!imgBuffer) {
    try {
      imgBuffer = await _pollinations(imagePrompt, 'turbo');
      console.log(`[ai-image] ✓ Pollinations "turbo" (${imgBuffer.length} bytes)`);
    } catch (err) {
      console.warn('[ai-image] ✗ Pollinations "turbo":', (err as Error).message);
    }
  }

  // 8. Card visual local — FALLBACK GARANTIDO (zero API, zero custo, nunca falha)
  if (!imgBuffer && cardData) {
    try {
      imgBuffer = await generateBrandedCard(cardData);
      console.log(`[ai-image] ✓ Card local gerado (${imgBuffer.length} bytes) — sem API externa`);
    } catch (err) {
      console.warn('[ai-image] ✗ Card local:', (err as Error).message);
    }
  }

  if (!imgBuffer) {
    console.warn('[ai-image] todos os provedores falharam — artigo salvo sem imagem');
    return null;
  }

  // Compositar logo da loteria sobre a imagem gerada
  if (lottery) {
    imgBuffer = await compositeLotteryLogo(imgBuffer, lottery);
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

/** Contexto opcional para gerar prompts mais específicos ao sorteio */
export interface ImageContext {
  accumulated?: boolean;
  prize_main?: number;       // valor em R$
  winners_count?: number;
}

/**
 * Dados do sorteio para gerar card visual local (sem API).
 * Passado para generateLotteryImage como fallback garantido.
 */
export interface CardData {
  lottery: string;
  concurso: number;
  winning_numbers: number[];
  prize_main?: number;
  accumulated?: boolean;
  winners_count?: number;
}

/**
 * Prompt de imagem de capa específico por loteria.
 * Usa as cores oficiais da loteria + contexto do sorteio (acumulado, prêmio, ganhadores).
 */
export function buildImagePrompt(lottery: string, concurso: number, ctx?: ImageContext): string {
  const name    = LOTTERY_LABELS[lottery] ?? lottery;
  const palette = LOTTERY_COLORS[lottery] ?? { primary: '#260085', accent: '#f6d27a', balls: 'golden spheres' };

  // Atmosfera conforme o contexto — CONCRETA (não abstrata). Prompts abstratos com
  // hex/god-rays/"glass sphere" geravam imagens escuras e embaçadas. Prompt concreto de
  // "bolas de loteria brilhantes com números" gera fotos nítidas e profissionais.
  let mood = 'dramatic cinematic studio lighting';
  if (ctx?.accumulated) {
    mood = 'triumphant golden glow with abundant golden sparkles and falling coins, celebratory jackpot atmosphere';
  } else if (ctx?.winners_count === 0) {
    mood = 'moody dramatic lighting with deep shadows and a suspenseful atmosphere';
  } else if (ctx?.winners_count && ctx.winners_count > 0) {
    mood = 'festive celebration with confetti and warm golden light beams, joyful winning atmosphere';
  }

  return (
    `Professional commercial product photograph of Brazilian "${name}" lottery balls. ` +
    `A group of glossy ${palette.balls} together with white lottery balls, each with clear bold printed numbers, ` +
    `arranged on a sleek dark reflective surface, golden sparkles and light particles floating in the air, ` +
    `${mood}, shallow depth of field with soft bokeh background, ultra-detailed, crisp sharp focus, ` +
    `vibrant, clean and modern, high-end studio photography, 8K. ` +
    `No text, no words, no numbers as captions, no watermark, no logo, no people, no hands.`
  );
}
