// leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

export async function loadLeaderboard() {
  try {
    // Get aggregated counts per skill
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('skill, count:skill', { count: 'exact' });

    if (error) throw error;

    // Transform results into skill -> count map
    const skillCounts = {};
    data.forEach(row => {
      skillCounts[row.skill] = (skillCounts[row.skill] || 0) + 1;
    });

    // Sort by most endorsed
    const sortedSkills = Object.entries(skillCounts).sort(([,a],[,b]) => b - a);

    // Clear and render
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
    console.error('[Leaderboard Error]', err);
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
