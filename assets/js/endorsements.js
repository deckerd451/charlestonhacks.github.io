// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';

export async function handleEndorsementSelection(endorserId, endorseeId, skill) {
  try {
    const { error } = await supabaseClient
      .from('endorsements')
      .insert([{ endorser_id: endorserId, endorsee_id: endorseeId, skill }]);

    if (error) throw error;

    showNotification(`Endorsed ${skill} successfully!`, 'success');
    loadLeaderboard(); // refresh leaderboard
  } catch (err) {
    console.error(err);
    showNotification(`Failed to endorse: ${err.message}`, 'error');
  }
}
