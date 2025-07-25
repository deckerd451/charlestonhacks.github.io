// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
export const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
