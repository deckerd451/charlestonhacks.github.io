// /assets/js/leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

/**
 * Load leaderboard of most endorsed skills
 */
export async function loadLeaderboard() {
  try {
    // Query endorsements grouped by skill
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('skill, count:skill', { count: 'exact' });

    if (error) throw error;

    // Supabase doesn't automatically return grouped counts, so we use RPC or JS aggregation
    // Alternative approach: use a Postgres function or raw SQL. For now, aggregate manually:
    const skillCounts = {};
    data.forEach(row => {
      const skill = row.skill;
      if (!skill) return;
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    });

    // Sort skills by endorsement count
    const sortedSkills = Object.entries(skillCounts).sort(([, a], [, b]) => b - a);

    // Render leaderboard
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

    if (sortedSkills.length === 0) {
      DOMElements.leaderboardRows.innerHTML = '<p>No endorsements yet.</p>';
    }
  } catch (err) {
    console.error('[Dex] leaderboard error', err);
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
