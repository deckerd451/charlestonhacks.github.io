// /assets/js/globals.js
import { appState as stateFromStateJs } from './state.js';

export const appState = stateFromStateJs;

export const DOMElements = {
  // Add refs you actually use on dex.html (leave others out or add later)
  cardContainer: document.getElementById('cardContainer'),
  bestTeamContainer: document.getElementById('bestTeamContainer'),
  leaderboardRows: document.getElementById('leaderboard-rows'),
};

export function showNotification(message, { type = 'info' } = {}) {
  console.log(`[notify:${type}]`, message);
  // Replace later with an on-page toast if you want
}
