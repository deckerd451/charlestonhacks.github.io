// eventListeners.js
import { DOMElements } from './globals.js';
import { findMatchingUsers, searchUserByName } from './formHandlers.js';
import { showEndorseSkillModal } from './endorsements.js';
import { supabaseClient } from './supabaseClient.js';
import { fetchUniqueSkills } from './skillsFetcher.js';
import { loadLeaderboard } from './leaderboard.js';
import { updateProfileProgress } from './profileProgress.js';

export function setupEventListeners() {
  DOMElements.findTeamBtn.addEventListener('click', findMatchingUsers);
  DOMElements.searchNameBtn.addEventListener('click', searchUserByName);

  DOMElements.cardContainer.addEventListener('click', async (event) => {
    const endorseButton = event.target.closest('.endorse-btn');
    if (endorseButton && !endorseButton.disabled) {
      const emailToEndorse = endorseButton.dataset.email;
      const { data, error } = await supabaseClient
        .from('skills')
        .select('*')
        .eq('email', emailToEndorse)
        .single();
      if (!error && data) {
        showEndorseSkillModal(data.email, data.first_name, data.last_name, data.skills);
      }
    }
  });

  fetchUniqueSkills();
  loadLeaderboard();
  updateProfileProgress();
}
