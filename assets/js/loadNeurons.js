// loadNeurons.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

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
