import { supabase } from './supabase';
import type { BlogPost } from '@/types/blog';

const POSTS_PER_PAGE = 12;

export async function getPublishedPosts(page = 1): Promise<{ posts: BlogPost[]; total: number }> {
  const from = (page - 1) * POSTS_PER_PAGE;
  const to   = from + POSTS_PER_PAGE - 1;

  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[blog] getPublishedPosts error:', error.message);
    return { posts: [], total: 0 };
  }
  return { posts: (data ?? []) as BlogPost[], total: count ?? 0 };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[blog] getPostBySlug error:', error.message);
    return null;
  }
  return data as BlogPost | null;
}

export async function getRelatedPosts(post: BlogPost, limit = 3): Promise<BlogPost[]> {
  const query = supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, cover_image_url, cover_alt, published_at, lottery, reading_time_min, tags')
    .eq('status', 'published')
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (post.lottery) query.eq('lottery', post.lottery);

  const { data } = await query;
  return (data ?? []) as BlogPost[];
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const { data } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export const LOTTERY_LABELS: Record<string, string> = {
  megasena:   'Mega-Sena',
  lotofacil:  'Lotofácil',
  quina:      'Quina',
  lotomania:  'Lotomania',
  duplasena:  'Dupla Sena',
  milionaria: '+Milionária',
  timemania:  'Timemania',
  diadesorte: 'Dia de Sorte',
  supersete:  'Super Sete',
  loteca:     'Loteca',
  federal:    'Federal',
};
