// leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

/**
 * Load leaderboard from normalized endorsements table.
 */
export async function loadLeaderboard() {
  try {
    // Fetch all endorsements
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('skill, count');

    if (error) throw error;

    // Aggregate counts by skill
    const skillCounts = {};
    data.forEach(row => {
      skillCounts[row.skill] = (skillCounts[row.skill] || 0) + row.count;
    });

    // Sort descending
    const sortedSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a);

    // Render
    DOMElements.leaderboardRows.innerHTML = '';
    sortedSkills.forEach(([skill, count], index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <span class="leaderboard-rank">${index + 1}.</span>
        <span class="leaderboard-skill">${skill}</span>
        <span class="leaderboard-count">${count}</span>
      `;
      DOMElements.leaderboardRows.appendChild(row);
    });
  } catch (err) {
    console.error('[Dex] Leaderboard load error', err);
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
