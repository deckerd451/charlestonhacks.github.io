// src/search.js

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

/ 
export function setupSearchHandlers() {
  DOMElements.findTeamBtn.addEventListener('click', findMatchingUsers);
  DOMElements.searchNameBtn.addEventListener('click', searchUserByName);
}

