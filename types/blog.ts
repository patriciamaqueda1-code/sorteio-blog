export type LotteryKey =
  | 'megasena' | 'lotofacil' | 'quina' | 'lotomania'
  | 'duplasena' | 'milionaria' | 'timemania' | 'diadesorte'
  | 'supersete'  | 'loteca'    | 'federal';

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  meta_description: string;
  content_html: string;
  excerpt: string;
  cover_image_url: string | null;
  cover_alt: string;
  lottery: LotteryKey | null;
  concurso_number: number | null;
  tags: string[];
  reading_time_min: number;
  published_at: string;
  created_at: string;
  status: 'draft' | 'published' | 'archived';
  schema_json: object | null;
  source_urls: string[];
}
