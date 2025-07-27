// loadConnections.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function fetchConnections() {
  const { data, error } = await supabase
    .from('connections')
    .select('from_id, to_id');

  if (error) {
    console.error('❌ Error loading connections:', error.message);
    return [];
  }

  console.log('✅ Loaded connections:', data);
  return data;
}
