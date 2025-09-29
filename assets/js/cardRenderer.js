// assets/js/cardRenderer.js
import { supabaseClient } from './supabaseClient.js';

/**
 * Normalize a skills field into an array of clean strings.
 */
function toSkillArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(s => s && s.toString().trim()).filter(Boolean);
  }
  return raw
    .toString()
    .split(/[,;|]/) // handle commas, semicolons, pipes
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Generate the HTML for a user card. Fetches endorsements,
 * aggregates per skill, and renders chips.
 *
 * @param {Object} user – record from the `community` table
 * @returns {string} HTML string
 */
export async function generateUserCardHTML(user) {
  // 🗂 Fetch all endorsements for this user
  const { data: endorsements, error } = await supabaseClient
    .from('endorsements')
    .select('skill, count')
    .eq('endorsed_user_id', user.id);

  if (error) {
    console.warn('[CardRenderer] Endorsements fetch error:', error.message);
  }

  // 📊 Build totals per skill
  const skillTotals = {};
  (endorsements || []).forEach(({ skill, count }) => {
    if (!skill) return;
    const key = skill.trim();
    skillTotals[key] = (skillTotals[key] || 0) + (count || 0);
  });

  // 🎨 Render skills as chips
  const userSkills = toSkillArray(user.skills);
  const skillsHTML = userSkills.length
    ? userSkills
        .map((skill) => {
          const total = skillTotals[skill] || 0;
          return `
            <span class="skill-chip">
              <span class="skill-name">${skill}</span>
              <span class="endorsement-count">${total}</span>
              <button
                class="endorse-btn"
                data-user-id="${user.id}"
                data-skill="${skill}"
                aria-label="Endorse ${user.name || 'this user'} for ${skill}"
              >+</button>
            </span>
          `;
        })
        .join('')
    : '<p class="no-skills">No skills listed.</p>';

  // 🧑 User card
  return `
    <div class="user-card">
      <img
        src="${user.image_url || 'images/default-avatar.png'}"
        alt="${user.name ? user.name + '\'s photo' : 'User photo'}"
        class="user-avatar"
      >
      <h3>${user.name || 'Unnamed'}</h3>
      <p><strong>Email:</strong> ${user.email || ''}</p>
      ${user.role ? `<p>${user.role}</p>` : ''}
      ${user.availability ? `<p class="availability">${user.availability}</p>` : ''}
      ${user.bio ? `<p class="bio">${user.bio}</p>` : ''}

      <div class="skills-list">
        ${skillsHTML}
      </div>
    </div>
  `;
}
