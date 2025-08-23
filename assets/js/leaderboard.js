// leaderboard.js
import { supabaseClient as supabase } from './supabaseClient.js';

/**
 * Query all endorsements and render the leaderboard.
 * Groups by skill, sums counts, sorts descending, then updates
 * #leaderboard-rows in the DOM.
 */
export async function loadLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('endorsements')
      .select('skill, count');

    if (error) throw error;
    if (!data || data.length === 0) {
      console.warn('[Leaderboard] No endorsement data found.');
      return;
    }

    const totals = {};
    data.forEach(({ skill, count }) => {
      totals[skill] = (totals[skill] || 0) + (count || 0);
    });

    const container = document.getElementById('leaderboard-rows');
    if (!container) {
      console.warn('[Leaderboard] No container found in DOM.');
      return;
    }
    container.innerHTML = '';

    Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .forEach(([skill, total], index) => {
        const row = document.createElement('div');
        row.className = 'leaderboard-row';
        row.innerHTML = `
          <span class="leaderboard-rank">${index + 1}.</span>
          <span class="leaderboard-skill">${skill}</span>
          <span class="leaderboard-count">${total}</span>
        `;
        container.appendChild(row);
      });
  } catch (err) {
    console.error('[Leaderboard] Supabase error:', err);
  }
}
