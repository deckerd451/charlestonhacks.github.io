// main.js (Entry point for the modular app)
import { initCardFlip } from './cardFlip.js';
import { setupProfileHandlers } from './profile.js';
import { setupAutocompleteHandlers } from './autocomplete.js';
import { setupSearchHandlers } from './search.js';
import { setupTeamBuilderHandlers } from './team.js';
import { setupEndorsementHandlers } from './endorsements.js';
import { fetchUniqueSkills, loadLeaderboard, updateProfileProgress } from './utils.js';
import { initializeDiscordBubble } from './chat.js';

document.addEventListener('DOMContentLoaded', () => {
  // Setup individual features
  setupProfileHandlers();
  setupAutocompleteHandlers();
  setupSearchHandlers();
  setupTeamBuilderHandlers();
  setupEndorsementHandlers();

  // Load initial data
  fetchUniqueSkills();
  loadLeaderboard();
  updateProfileProgress();

  // Load the draggable Discord chat bubble
  initializeDiscordBubble();
});
