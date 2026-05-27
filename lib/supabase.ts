import { createClient } from '@supabase/supabase-js';

const url  = process.env.SUPABASE_URL ?? '';
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!url || !key) {
  console.error('[supabase] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não estão definidas. Verifique as env vars.');
}

/** Client server-side com service_role — NUNCA expor ao browser */
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder', {
  auth: { persistSession: false },
});
