import { supabaseClient } from './supabaseClient.js';
import { DOMElements, showNotification, renderUserCards } from './utils.js';

/**
 * Searches and displays users by first or last name.
 */
export async function searchUserByName() {
  const nameInput = DOMElements.nameInput.value.trim().toLowerCase();
  if (!nameInput) {
    showNotification('Please enter a name to search.', 'warning');
    DOMElements.cardContainer.innerHTML = '';
    return;
  }

  try {
    const { data, error } = await supabaseClient.from('skills').select('*');
    if (error) throw error;

    const matchedUsers = data.filter(user => {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      return fullName.includes(nameInput) ||
             user.first_name.toLowerCase().includes(nameInput) ||
             user.last_name.toLowerCase().includes(nameInput);
    });

    renderUserCards(matchedUsers, DOMElements.cardContainer);
    if (matchedUsers.length > 0) {
      showNotification(`Found ${matchedUsers.length} user(s) matching "${nameInput}".`, 'success');
    }
  } catch (error) {
    console.error("Error searching by name:", error);
    showNotification('Error fetching user data. Please try again.', 'error');
    DOMElements.cardContainer.innerHTML = '<span style="color:red;">Error fetching data.</span>';
  }
}

/**
 * Searches users by skills input
 */
export async function findMatchingUsers() {
  const skillsInput = DOMElements.teamSkillsInput.value.trim();
  DOMElements.cardContainer.innerHTML = '';

  if (!skillsInput) {
    showNotification('Please enter at least one skill.', 'warning');
    return;
  }

  const requiredSkills = skillsInput.toLowerCase().split(',').map(skill => skill.trim());

  try {
    const { data, error } = await supabaseClient.from('skills').select('*');
    if (error) throw error;

    const matchedUsers = data.filter(user => {
      const userSkillsRaw = user.skills.split(',').map(s => s.trim());
      return requiredSkills.every(skill =>
        userSkillsRaw.some(us => us.toLowerCase().includes(skill))
      );
    });

    renderUserCards(matchedUsers, DOMElements.cardContainer);
    if (matchedUsers.length === 0) {
      showNotification('No matching users found.', 'warning');
    }
  } catch (err) {
    console.error('Error fetching data:', err);
    showNotification('Error fetching user data.', 'error');
  }
}

/**
 * Sets up event listeners for the buttons
 */
export function setupSearchHandlers() {
  DOMElements.findTeamBtn.addEventListener('click', findMatchingUsers);
  DOMElements.searchNameBtn.addEventListener('click', searchUserByName);
}

