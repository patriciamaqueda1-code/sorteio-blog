import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !key) {
  throw new Error('[supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
}

/** Client server-side com service_role — NUNCA expor ao browser */
export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});
