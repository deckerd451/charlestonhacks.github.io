// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { appState } from './globals.js';

// Handle a user endorsing another user's skill
export async function handleEndorsementSelection(endorseeId, skill) {
  try {
    const endorserId = appState.session?.user?.id;
    if (!endorserId) {
      showNotification("You must be logged in to endorse.", "error");
      return;
    }

    // Insert new endorsement row
    const { error } = await supabaseClient
      .from('endorsements')
      .insert([{ endorser_id: endorserId, endorsee_id: endorseeId, skill }]);

    if (error) throw error;

    showNotification(`Endorsed ${skill} successfully!`, 'success');

    // Refresh leaderboard
    loadLeaderboard();
  } catch (err) {
    console.error('[Endorsement Error]', err);
    showNotification(`Failed to endorse: ${err.message}`, 'error');
  }
}
