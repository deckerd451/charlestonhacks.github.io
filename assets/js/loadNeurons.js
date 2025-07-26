// loadNeurons.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function fetchNeurons() {
  const { data, error } = await supabase
    .from('community')
    .select('id, name, role, interests, x, y, image_url');

  if (error) {
    console.error('Error loading neurons:', error.message);
    return [];
  }

  return data.map(member => ({
    id: member.id,
    label: member.name,
    role: member.role,
    interests: member.interests,
    x: member.x,
    y: member.y,
    image: member.image_url || null,
  }));
}
