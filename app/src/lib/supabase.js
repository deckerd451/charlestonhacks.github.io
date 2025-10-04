// Shared Supabase client - reuses existing instance if available
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

// Reuse legacy client if it exists, otherwise create new one
export const supabase = (() => {
  if (typeof window !== 'undefined' && window.__dexSupabase) {
    console.log('[Supabase] Reusing existing client from legacy code');
    return window.__dexSupabase;
  }

  console.log('[Supabase] Creating new client');
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      storageKey: 'sb-hvmotpzhliufzomewzfl-auth-token',
    },
  });

  // Expose to window for legacy code compatibility
  if (typeof window !== 'undefined') {
    window.__dexSupabase = client;
    client.storageUrl = `${SUPABASE_URL}/storage/v1`;
  }

  return client;
})();
