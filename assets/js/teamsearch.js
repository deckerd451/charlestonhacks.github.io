// src/teamSearch.js

import { supabaseClient } from './supabaseClient.js';
import { generateUserCardHTML } from './cardRenderer.js';
import { showNotification } from './notifications.js';
import { DOMElements } from './domElements.js';

export async function findMatchingUsers() {
  const skillsInput = DOMElements.teamSkillsInput.value.trim();
  if (!skillsInput) {
    showNotification('Please enter at least one skill.', 'warning');
    DOMElements.cardContainer.innerHTML = '';
    return;
  }
  const requiredSkills = skillsInput.toLowerCase().split(',').map(skill => skill.trim()).filter(Boolean);

  try {
    const { data, error } = await supabaseClient.from('skills').select('*');
    if (error) throw error;

    const isFuzzyMatch = (userSkill, requiredSkill) => {
      const cleanedUserSkill = userSkill.toLowerCase().replace(/\(.*?\)/, '');
      const req = requiredSkill.toLowerCase();
      return cleanedUserSkill.includes(req) || req.includes(cleanedUserSkill) || cleanedUserSkill === req;
    };

    const matchedUsers = data.filter(user => {
      const userSkillsRaw = user.skills.split(',').map(s => s.trim());
      return requiredSkills.every(skill =>
        userSkillsRaw.some(us => isFuzzyMatch(us, skill))
      );
    });

    DOMElements.cardContainer.innerHTML = matchedUsers.map(generateUserCardHTML).join('');

    if (matchedUsers.length > 0) {
      showNotification(`Found ${matchedUsers.length} matching user(s).`, 'success');
    } else {
      DOMElements.noResults.textContent = 'No matching users found.';
      DOMElements.noResults.style.display = 'block';
    }
  } catch (error) {
    console.error("Error finding matching users:", error);
    showNotification('Error fetching user data. Please try again.', 'error');
    DOMElements.cardContainer.innerHTML = '<span style="color:red;">Error fetching data.</span>';
  }
}
