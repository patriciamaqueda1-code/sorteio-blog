/**
 * Gerador de artigos de blog usando Groq (llama-3.3-70b) — rápido, barato, bom.
 * Fallback: Anthropic Claude se ANTHROPIC_API_KEY disponível.
 *
 * Segurança: executa EXCLUSIVAMENTE no servidor (Node.js runtime).
 * Nenhuma API key é exposta ao cliente.
 */

import Groq from 'groq-sdk';
import { slugify, LOTTERY_LABELS } from './blog';

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
 * Gera imagem hiper-realista usando fal.ai FLUX Schnell.
 * Requer FAL_API_KEY no Vercel env.
 * Retorna a URL da imagem gerada, ou null se não configurado / falhar.
 */
export async function generateLotteryImage(imagePrompt: string): Promise<string | null> {
  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    console.warn('[ai-image] FAL_API_KEY não configurado — pulando geração de imagem.');
    return null;
  }
  try {
    const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: imagePrompt,
        image_size: 'landscape_16_9',  // 1360x768 — ideal para blog OG
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
      }),
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[ai-image] fal.ai ${res.status}: ${body.slice(0, 200)}`);
      return null;
    }
    const data = await res.json() as { images?: Array<{ url: string }> };
    const url = data.images?.[0]?.url ?? null;
    if (url) console.log(`[ai-image] gerado: ${url.slice(0, 80)}…`);
    return url;
  } catch (err: any) {
    console.warn('[ai-image] falhou:', err.message);
    return null;
  }
}

/**
 * Prompt para gerar imagem de capa com DALL-E 3 / Ideogram / Replicate.
 * Retorna o prompt a ser enviado para a API de imagem.
 */
export function buildImagePrompt(lottery: string, concurso: number): string {
  const name = LOTTERY_LABELS[lottery] ?? lottery;
  return `Professional lottery analysis infographic for "${name} Concurso ${concurso}".
Dark background (#07060d), golden lottery balls floating in space, statistical charts with glowing data lines,
Brazilian lottery aesthetic, cinematic lighting, ultra-detailed, 8K, sharp focus.
No text overlay, no people, abstract data visualization theme.
Color palette: deep purple, gold (#f6d27a), emerald green accents.`;
}
