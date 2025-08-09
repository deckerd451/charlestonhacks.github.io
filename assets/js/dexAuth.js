// assets/js/dexAuth.js
import { supabaseClient as supabase } from './supabaseClient.js';

const PROJECT_REF = 'hvmotpzhliufzomewzfl';
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

function getHashParams() {
  const h = new URLSearchParams(location.hash.slice(1));
  return {
    type: h.get('type'),
    access_token: h.get('access_token'),
    refresh_token: h.get('refresh_token'),
    hasAll: !!(h.get('access_token') && h.get('refresh_token'))
  };
}

function isExpired(session) {
  if (!session?.expires_at) return true;
  const now = Math.floor(Date.now() / 1000);
  return Number(session.expires_at) <= now + 15; // small skew
}

async function hydrateFromHashIfPresent() {
  const hp = getHashParams();
  if (hp.type === 'magiclink' && hp.hasAll) {
    const { data, error } = await supabase.auth.setSession({
      access_token: hp.access_token,
      refresh_token: hp.refresh_token
    });
    // Clean URL so tokens aren’t re‑used
    history.replaceState(null, '', location.pathname + location.search);
    return { data, error, source: 'hash_tokens' };
  }
  return { data: null, error: null, source: 'none' };
}

async function ensureFreshSession() {
  // 1) Try current session
  const { data: sessData } = await supabase.auth.getSession();
  if (sessData?.session && !isExpired(sessData.session)) {
    return sessData.session;
  }

  // 2) If expired or missing, try refresh via SDK
  const raw = localStorage.getItem(STORAGE_KEY);
  let refresh_token = null;
  try { refresh_token = raw ? JSON.parse(raw).refresh_token : null; } catch {}

  if (refresh_token) {
    // prefer refreshSession if available, else setSession({ refresh_token })
    if (typeof supabase.auth.refreshSession === 'function') {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token });
      if (!error && data?.session) return data.session;
    }
    const { data, error } = await supabase.auth.setSession({ refresh_token });
    if (!error && data?.session) return data.session;
  }

  // 3) No session we can refresh; return null
  return null;
}

export async function initDexAuth() {
  // A) If we arrived via magic link (#access_token/#refresh_token), hydrate from hash
  await hydrateFromHashIfPresent();

  // B) Make sure we have a fresh session (auto‑refresh if needed)
  const session = await ensureFreshSession();

  // C) Optional: log and expose helpers for debugging
  window.dexAuth = {
    getSession: () => supabase.auth.getSession(),
    getUser:     () => supabase.auth.getUser(),
    signOut:     () => supabase.auth.signOut()
  };

  // D) Listen for auth changes (helpful for UI updates)
  supabase.auth.onAuthStateChange((_event, _session) => {
    // console.log('[DEX] auth event:', _event, _session);
  });

  return session;
}
