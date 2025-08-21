// /assets/js/endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { DOMElements, appState } from './globals.js';

/**
 * Endorse a user for a specific skill
 * @param {string} endorsedUserId - community.id of the user being endorsed
 * @param {string} skillToEndorse - the skill name
 */
export async function handleEndorsementSelection(endorsedUserId, skillToEndorse) {
  DOMElements.endorseModal.style.display = 'none';

  try {
    // Make sure we have the current logged in user
    const currentUser = appState.session?.user;
    if (!currentUser) {
      showNotification("You must be signed in to endorse skills.", "error");
      return;
    }

    // Look up this user's community row
    const { data: endorserCommunity, error: endorserError } = await supabaseClient
      .from('community')
      .select('id')
      .eq('user_id', currentUser.id)
      .single();

    if (endorserError || !endorserCommunity) {
      throw new Error("Could not resolve your community profile. Please complete your profile first.");
    }

    const endorsedByUserId = endorserCommunity.id;

    // Insert a new endorsement row
    const { error: insertError } = await supabaseClient
      .from('endorsements')
      .insert([{
        endorsed_user_id: endorsedUserId,
        endorsed_by_user_id: endorsedByUserId,
        skill: skillToEndorse
      }]);

    if (insertError) {
      if (insertError.code === "23505") { 
        // unique violation
        showNotification(`You have already endorsed this user for "${skillToEndorse}".`, "warning");
      } else {
        throw insertError;
      }
    } else {
      showNotification(`Skill "${skillToEndorse}" endorsed successfully!`, "success");
      loadLeaderboard();
    }

  } catch (error) {
    console.error("[Dex] endorsement error", error);
    showNotification(`Failed to endorse: ${error.message}`, "error");
  }
}
