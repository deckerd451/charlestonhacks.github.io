// cardRenderer.js
import { supabaseClient } from './supabaseClient.js';
import { handleEndorsementSelection } from './endorsements.js';

// Generate card HTML for a single user
export async function generateUserCardHTML(user) {
  // Query endorsements for this user
  const { data: endorsements, error } = await supabaseClient
    .from('endorsements')
    .select('skill')
    .eq('endorsee_id', user.id);

  if (error) {
    console.error('[CardRenderer] Failed to fetch endorsements', error);
  }

  // Count endorsements per skill
  const skillCounts = {};
  if (endorsements) {
    endorsements.forEach(e => {
      skillCounts[e.skill] = (skillCounts[e.skill] || 0) + 1;
    });
  }

  // Build skills list with endorsement counts + button
  const skillsHTML = (user.skills || []).map(skill => {
    const count = skillCounts[skill] || 0;
    return `
      <div class="skill-chip">
        <span>${skill}</span>
        <span class="endorsement-count">(${count})</span>
        <button 
          class="endorse-btn" 
          data-user-id="${user.id}" 
          data-skill="${skill}"
        >
          + Endorse
        </button>
      </div>
    `;
  }).join('');

  return `
    <div class="user-card">
      <img 
        src="${user.image_url || 'images/default-avatar.png'}" 
        alt="${user.name}" 
        class="user-avatar"
      >
      <h3>${user.name}</h3>
      <p>${user.bio || ''}</p>
      <div class="skills-list">${skillsHTML}</div>
      <p class="availability">${user.availability || 'Unknown'}</p>
    </div>
  `;
}

// Attach endorsement button behavior
export function attachEndorseButtons() {
  document.querySelectorAll('.endorse-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const skill = e.target.dataset.skill;
      const userId = e.target.dataset.userId;
      handleEndorsementSelection(userId, skill);
    });
  });
}
