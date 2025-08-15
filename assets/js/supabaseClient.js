// /assets/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY = '...your anon key...';

export const supabaseClient = (() => {
  if (!globalThis.__dexSupabase) {
    globalThis.__dexSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, storageKey: 'sb-hvmotpzhliufzomewzfl-auth-token' }
    });
    // add storageUrl so legacy code can build public file URLs
    globalThis.__dexSupabase.storageUrl = `${SUPABASE_URL}/storage/v1`;
  }
  return globalThis.__dexSupabase;
})();
