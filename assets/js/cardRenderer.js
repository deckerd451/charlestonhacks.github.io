// cardRenderer.js
import { supabaseClient } from './supabaseClient.js';

export async function generateUserCardHTML(user) {
  const { data: endorsements } = await supabaseClient
    .from('endorsements')
    .select('skill, count')
    .eq('endorsee_id', user.id);

  let skillsHTML = '';
  if (user.skills && user.skills.length > 0) {
    const userSkills = Array.isArray(user.skills)
      ? user.skills
      : user.skills.split(',').map(s => s.trim());

    skillsHTML = userSkills.map(skill => {
      const record = endorsements?.find(e => e.skill === skill);
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
    }).join('');
  }

  return `
    <div class="user-card">
      <img 
        src="${user.image_url || 'images/default-avatar.png'}" 
        alt="${user.name}'s photo" 
        class="user-avatar"
      >
      <h3>${user.name}</h3>
      <p>${user.role || ''}</p>
      <p class="availability">${user.availability || ''}</p>
      <p class="bio">${user.bio || ''}</p>
      <div class="skills-list">
        ${skillsHTML || '<p>No skills listed.</p>'}
      </div>
    </div>
  `;
}
