import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  loading: true,

  // Initialize auth state
  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session, user: session?.user ?? null, loading: false });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });

        // Sync to legacy code
        if (typeof window !== 'undefined') {
          if (window.appState) {
            window.appState.session = session;
            window.appState.user = session?.user ?? null;
          }
          // Emit event for legacy code
          window.dispatchEvent(new CustomEvent('auth:changed', {
            detail: { user: session?.user, session }
          }));
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ loading: false });
    }
  },

  // Sign in with OAuth
  signInWithOAuth: async (provider) => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/app/auth/callback`,
      }
    });
    if (error) throw error;
    return data;
  },

  // Sign in with magic link
  signInWithMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/app/auth/callback`,
      }
    });
    if (error) throw error;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, session: null });
  },
}));
