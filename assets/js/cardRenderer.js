// cardRenderer.js
import { supabaseClient } from './supabaseClient.js';

/**
 * Generate the HTML for a user card.  This helper fetches the
 * endorsement counts for each skill so that the chips can display
 * up‑to‑date numbers.  It returns a string of markup; the caller
 * should insert it into the DOM and then attach any event handlers
 * (e.g. for opening the endorsement modal or direct endorse).
 *
 * @param {Object} user – record from the `community` table
 * @returns {string} HTML for the card
 */
export async function generateUserCardHTML(user) {
  // Fetch endorsements for this user
  const { data: endorsements } = await supabaseClient
    .from('endorsements')
    .select('skill, count')
    .eq('endorsee_id', user.id);

  // Build skills list with endorsement counts
  let skillsHTML = '';
  if (user.skills && user.skills.length > 0) {
    const userSkills = Array.isArray(user.skills)
      ? user.skills
      : user.skills.split(',').map((s) => s.trim());

    skillsHTML = userSkills
      .map((skill) => {
        const record = endorsements?.find((e) => e.skill === skill);
        const count = record ? record.count : 0;
        return `
          <span class="skill-chip">
            <span>${skill}</span>
            <span class="endorsement-count">${count}</span>
            <button 
              class="endorse-btn" 
              data-user-id="${user.id}" 
              data-skill="${skill}"
              aria-label="Endorse ${user.name} for ${skill}"
            >+</button>
          </span>
        `;
      })
      .join('');
  }

  return `
    <div class="user-card">
      <img 
        src="${user.image_url || 'images/default-avatar.png'}" 
        alt="${user.name ? user.name + '\'s photo' : 'User photo'}" 
        class="user-avatar"
      >
      <h3>${user.name || 'Unnamed'}</h3>
      <p><strong>Email:</strong> ${user.email || ''}</p>
      <p>${user.role || ''}</p>
      <p class="availability">${user.availability || ''}</p>
      <p class="bio">${user.bio || ''}</p>

      <div class="skills-list">
        ${skillsHTML || '<p>No skills listed.</p>'}
      </div>
    </div>
  `;
}
