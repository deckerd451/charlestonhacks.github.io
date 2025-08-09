// assets/js/dexAuth.js
import { supabaseClient as supabase } from './supabaseClient.js';

const PROJECT_REF = 'hvmotpzhliufzomewzfl';
const STORAGE_KEY = `sb-${PROJECT_REF}-auth-token`;

// Expose quick helpers immediately (useful for console/debugging)
window.dexAuth = {
  getSession: () => supabase.auth.getSession(),
  getUser:     () => supabase.auth.getUser(),
  signOut:     () => supabase.auth.signOut()
};

// ---- utils --------------------------------------------------------------

const withTimeout = (p, ms = 6000) =>
  Promise.race([ p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)) ]);

const nowSec = () => Math.floor(Date.now() / 1000);

const isExpired = (session) => {
  if (!session?.expires_at) return true;
  return Number(session.expires_at) <= nowSec() + 15; // small clock skew
};

const getHashParams = () => {
  const h = new URLSearchParams(location.hash.slice(1));
  return {
    type: h.get('type'),                         // e.g., "magiclink"
    access_token: h.get('access_token'),
    refresh_token: h.get('refresh_token'),
    expires_in: h.get('expires_in'),
    token_type: h.get('token_type'),
  };
};

// ---- flows --------------------------------------------------------------

async function hydrateFromHashIfPresent() {
  const hp = getHashParams();
  const hasTokens = !!(hp.access_token && hp.refresh_token);

  if (!hasTokens) return { ok: false, source: 'none' };

  // Some providers don’t set type="magiclink"; accept tokens if present.
  try {
    const { data, error } = await withTimeout(
      supabase.auth.setSession({
        access_token: hp.access_token,
        refresh_token: hp.refresh_token
      }),
      6000
    );

    // Clean the URL so tokens aren’t re-used on back/forward nav
    history.replaceState(null, '', location.pathname + location.search);

    return { ok: !!data?.session && !error, source: 'hash_tokens', data, error };
  } catch (e) {
    // Still clean the URL to avoid loops even if it failed
    history.replaceState(null, '', location.pathname + location.search);
    return { ok: false, source: 'hash_tokens', error: e };
  }
}

async function ensureFreshSession() {
  // 1) Try current session, but never hang here
  try {
    const res = await withTimeout(supabase.auth.getSession(), 6000);
    const session = res?.data?.session || null;
    if (session && !isExpired(session)) return session;
  } catch { /* swallow timeout */ }

  // 2) Try to refresh using stored refresh_token
  let refresh_token = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    refresh_token = raw ? JSON.parse(raw).refresh_token : null;
  } catch { /* ignore parse errors */ }

  if (refresh_token) {
    // Prefer refreshSession if available, otherwise setSession({ refresh_token })
    if (typeof supabase.auth.refreshSession === 'function') {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.refreshSession({ refresh_token }),
          6000
        );
        if (!error && data?.session) return data.session;
      } catch { /* timeout or network error */ }
    }
    try {
      const { data, error } = await withTimeout(
        supabase.auth.setSession({ refresh_token }),
        6000
      );
      if (!error && data?.session) return data.session;
    } catch { /* timeout or network error */ }
  }

  // 3) Nothing we can hydrate
  return null;
}

// ---- public -------------------------------------------------------------

export async function initDexAuth() {
  // A) If we arrived with #access_token/#refresh_token, hydrate from hash first
  await hydrateFromHashIfPresent();

  // B) Make sure we have a fresh session (auto-refresh if needed)
  const session = await ensureFreshSession();

  // C) (Optional) react to auth state changes for UI code to hook into
  supabase.auth.onAuthStateChange((_event, _session) => {
    // no-op here; page code already listens if needed
  });

  return session;
}
