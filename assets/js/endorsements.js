// endorsements.js
import { supabaseClient } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { attachEndorseButtons } from './endorsements.js';
import { DOMElements } from './globals.js';

/**
 * Attach click handlers to all endorsement (+) buttons on user cards.
 * Must be re-run after cards are rendered.
 */
export function attachEndorseButtons() {
  document.querySelectorAll('.endorse-btn').forEach(btn => {
    btn.removeEventListener('click', handleClick); // prevent duplicate binding
    btn.addEventListener('click', handleClick);
  });
}

/**
 * Handle endorsement button click → open modal and populate.
 */
function handleClick(e) {
  const btn = e.currentTarget;
  const endorseeId = btn.getAttribute('data-user-id');
  const skill = btn.getAttribute('data-skill');

  const modal = document.getElementById('endorseSkillModal');
  const list = document.getElementById('endorse-skill-list');

  // Fill modal with the one skill being endorsed
  list.innerHTML = `
    <div class="skill-endorse-item">
      <span>${skill}</span>
      <button class="endorse-specific-skill-btn" 
              data-user-id="${endorseeId}" 
              data-skill="${skill}">
        Confirm Endorse
      </button>
    </div>
  `;

  modal.style.display = 'block';

  // Close button
  modal.querySelector('.close-button').onclick = () => {
    modal.style.display = 'none';
  };

  // Confirm endorsement
  list.querySelector('.endorse-specific-skill-btn').onclick = async () => {
    await handleEndorsementSelection(endorseeId, skill);
    modal.style.display = 'none';
  };
}

/**
 * Insert/update endorsement count in normalized endorsements table.
 */
export async function handleEndorsementSelection(endorseeId, skill) {
  try {
    // Check if record exists
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('count')
      .eq('endorsee_id', endorseeId)
      .eq('skill', skill)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // Update existing endorsement count
      await supabaseClient
        .from('endorsements')
        .update({ count: data.count + 1 })
        .eq('endorsee_id', endorseeId)
        .eq('skill', skill);
    } else {
      // Insert new row
      await supabaseClient
        .from('endorsements')
        .insert({ endorsee_id: endorseeId, skill, count: 1 });
    }

    showNotification(`Endorsed ${skill}!`, 'success');

    // Refresh leaderboard
    loadLeaderboard();
  } catch (err) {
    console.error('[Dex] Endorsement failed', err);
    showNotification('Endorsement failed.', 'error');
  }
}
