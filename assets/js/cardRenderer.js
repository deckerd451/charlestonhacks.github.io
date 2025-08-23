// cardRenderer.js
import { supabaseClient } from './supabaseClient.js';

/**
 * Generate the HTML for a user card.  This helper fetches all
 * endorsement records for the user, sums the counts for each skill,
 * and then renders chips showing the total endorsements per skill.
 *
 * @param {Object} user – record from the `community` table
 * @returns {string} HTML for the card
 */
export async function generateUserCardHTML(user) {
  // Fetch all endorsements for this user (across all endorsers)
  const { data: endorsements } = await supabaseClient
    .from('endorsements')
    .select('skill, count')
    .eq('endorsed_user_id', user.id);

  // Build a map of total counts per skill
  const skillTotals = {};
  if (endorsements) {
    endorsements.forEach(({ skill, count }) => {
      skillTotals[skill] = (skillTotals[skill] || 0) + (count || 0);
    });
  }

  // Build skills list with aggregated endorsement counts
  let skillsHTML = '';
  if (user.skills && user.skills.length > 0) {
    const userSkills = Array.isArray(user.skills)
      ? user.skills
      : user.skills.split(',').map((s) => s.trim());

    skillsHTML = userSkills
      .map((skill) => {
        const total = skillTotals[skill] || 0;
        return `
          <span class="skill-chip">
            <span>${skill}</span>
            <span class="endorsement-count">${total}</span>
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
