// loadConnections.js
import { supabaseClient as supabase } from './supabaseClient.js'; // ✅ use shared instance

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
