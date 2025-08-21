// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { generateUserCardHTML, attachEndorseButtons } from './cardRenderer.js';
import { DOMElements } from './globals.js';

export async function handleEndorsementSelection(endorseeId, skillToEndorse) {
  // Hide modal
  DOMElements.endorseModal.style.display = 'none';

  try {
    // Insert new endorsement row
    const { error: insertError } = await supabaseClient
      .from('endorsements')
      .insert([{ endorsee_id: endorseeId, skill: skillToEndorse }]);

    if (insertError) throw insertError;

    showNotification(`Skill "${skillToEndorse}" endorsed successfully!`, "success");

    // 🔄 Refresh leaderboard
    loadLeaderboard();

    // 🔄 Refresh the endorsed user's card in-place
    const { data: userData, error: userError } = await supabaseClient
      .from('community')
      .select('*')
      .eq('id', endorseeId)
      .single();

    if (!userError && userData) {
      const oldCard = document.querySelector(`.endorse-btn[data-user-id="${endorseeId}"]`)?.closest('.user-card');
      if (oldCard) {
        const newCardHTML = await generateUserCardHTML(userData);
        oldCard.outerHTML = newCardHTML; // Replace with updated card
        attachEndorseButtons(); // Reattach listeners
      }
    }

  } catch (error) {
    console.error('[Endorsement Error]', error);
    showNotification(`Failed to endorse: ${error.message}`, 'error');
  }
}
