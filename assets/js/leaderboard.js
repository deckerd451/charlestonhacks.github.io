// leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

export async function loadLeaderboard(limit = 10) {
  try {
    // Query endorsements with the skill name + counts
    const { data, error } = await supabaseClient
      .from('endorsements')
      .select('skill')
    
    if (error) throw error;

    // Count totals per skill
    const skillCounts = {};
    data.forEach(row => {
      if (row.skill) {
        skillCounts[row.skill] = (skillCounts[row.skill] || 0) + 1;
      }
    });

    // Sort by descending count
    const sortedSkills = Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);

    // Render leaderboard
    DOMElements.leaderboardRows.innerHTML = '';
    if (sortedSkills.length === 0) {
      DOMElements.leaderboardRows.innerHTML = '<p>No endorsements yet.</p>';
      return;
    }

    sortedSkills.forEach(([skill, count], index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <span class="leaderboard-rank">#${index + 1}</span>
        <span class="leaderboard-skill">${skill}</span>
        <span class="leaderboard-count">${count}</span>
      `;
      DOMElements.leaderboardRows.appendChild(row);
    });
  } catch (err) {
    console.error('[Leaderboard]', err);
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
