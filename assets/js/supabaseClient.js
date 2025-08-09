// assets/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Your Supabase project credentials
export const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

// Create the Supabase client with explicit auth settings
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,                          // keep the user logged in
    autoRefreshToken: true,                        // refresh tokens automatically
    detectSessionInUrl: true,                      // process magic link/callback URLs
    storageKey: 'sb-hvmotpzhliufzomewzfl-auth-token' // unique storage key for this project
  }
});
