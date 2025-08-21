// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { DOMElements, appState } from './globals.js';

export async function handleEndorsementSelection(emailToEndorse, skillToEndorse) {
  DOMElements.endorseModal.style.display = 'none';

  try {
    // 1. Look up the user being endorsed
    const { data: userRow, error: userError } = await supabaseClient
      .from('community')
      .select('id')
      .eq('email', emailToEndorse)
      .single();

    if (userError || !userRow) throw new Error("User not found.");

    const endorsedUserId = userRow.id;

    // 2. The endorser is the logged-in user
    const endorsedByUserId = appState?.session?.user?.id;

    if (!endorsedByUserId) throw new Error("You must be signed in to endorse.");

    // 3. Insert or update the endorsement
    const { error: upsertError } = await supabaseClient
      .from('endorsements')
      .upsert(
        {
          endorsed_user_id: endorsedUserId,
          endorsed_by_user_id: endorsedByUserId,
          skill: skillToEndorse,
          count: 1
        },
        {
          onConflict: 'endorsed_user_id, endorsed_by_user_id, skill'
        }
      );

    if (upsertError) throw upsertError;

    showNotification(`Skill "${skillToEndorse}" endorsed successfully!`, "success");

    // 4. Refresh leaderboard
    loadLeaderboard();
  } catch (error) {
    console.error(error);
    showNotification(`Failed to endorse: ${error.message}`, 'error');
  }
}
