// loadConnections.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function fetchConnections() {
  const { data, error } = await supabase
    .from('connections')
    .select('from_id, to_id');

  if (error) {
    console.error('Error loading connections:', error.message);
    return [];
  }

  return data;
}
