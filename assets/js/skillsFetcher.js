// skillsFetcher.js
import { supabaseClient } from './supabaseClient.js';
import { appState } from './globals.js';

export async function fetchUniqueSkills() {
  try {
    const { data } = await supabaseClient.from('skills').select('skills');
    appState.dynamicSkills = [...new Set(data.flatMap(item =>
      item.skills.split(',').map(skill => skill.trim().toLowerCase().replace(/\(.*?\)/, ''))
    ))];
  } catch {
    appState.dynamicSkills = [];
  }
}
