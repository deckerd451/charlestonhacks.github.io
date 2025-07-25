// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { generateUserCardHTML } from './utils.js';
import { DOMElements, appState } from './globals.js';

export async function handleEndorsementSelection(emailToEndorse, skillToEndorse) {
  DOMElements.endorseModal.style.display = 'none';
  try {
    const { data, error } = await supabaseClient
      .from('skills')
      .select('endorsements')
      .eq('email', emailToEndorse)
      .single();

    if (error || !data) throw new Error("User not found or database error.");

    let endorsements = {};
    try {
      endorsements = data.endorsements ? JSON.parse(data.endorsements) : {};
    } catch {
      endorsements = {};
    }

    endorsements[skillToEndorse] = (endorsements[skillToEndorse] || 0) + 1;

    const { error: updateError } = await supabaseClient
      .from('skills')
      .update({ endorsements: JSON.stringify(endorsements) })
      .eq('email', emailToEndorse);
    if (updateError) throw updateError;

    showNotification(\`Skill "\${skillToEndorse}" endorsed successfully!\`, "success");
    loadLeaderboard();
  } catch (error) {
    showNotification(\`Failed to endorse: \${error.message}\`, 'error');
  }
}
