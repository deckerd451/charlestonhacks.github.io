// leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

export async function loadLeaderboard() {
  try {
    // 1. Aggregate skills + total counts
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('skill, count');

    if (error) throw error;

    // 2. Sum counts per skill
    const skillCounts = {};
    data.forEach(row => {
      skillCounts[row.skill] = (skillCounts[row.skill] || 0) + (row.count || 1);
    });

    // 3. Sort by total count
    const sortedSkills = Object.entries(skillCounts).sort(([, a], [, b]) => b - a);

    // 4. Render leaderboard
    DOMElements.leaderboardRows.innerHTML = '';
    sortedSkills.forEach(([skill, total], index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <span class="leaderboard-rank">${index + 1}.</span>
        <span class="leaderboard-skill">${skill}</span>
        <span class="leaderboard-count">${total}</span>
      `;
      DOMElements.leaderboardRows.appendChild(row);
    });

  } catch (err) {
    console.error('[Leaderboard error]', err);
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
