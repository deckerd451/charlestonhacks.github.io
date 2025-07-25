// leaderboard.js
import { supabaseClient } from './supabaseClient.js';
import { DOMElements } from './globals.js';

export async function loadLeaderboard() {
  try {
    const { data } = await supabaseClient.from('skills').select('endorsements');
    const skillCounts = {};
    data.forEach(user => {
      if (user.endorsements) {
        const endorsements = JSON.parse(user.endorsements);
        for (const skill in endorsements) {
          skillCounts[skill] = (skillCounts[skill] || 0) + endorsements[skill];
        }
      }
    });

    const sortedSkills = Object.entries(skillCounts).sort(([, a], [, b]) => b - a);
    DOMElements.leaderboardRows.innerHTML = '';
    sortedSkills.forEach(([skill, count], index) => {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = \`
        <span class="leaderboard-rank">\${index + 1}.</span>
        <span class="leaderboard-skill">\${skill}</span>
        <span class="leaderboard-count">\${count}</span>
      \`;
      DOMElements.leaderboardRows.appendChild(row);
    });
  } catch {
    DOMElements.leaderboardRows.innerHTML = '<p>Failed to load leaderboard.</p>';
  }
}
