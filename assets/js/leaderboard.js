// leaderboard.js
import { supabaseClient } from './supabaseClient.js';

export async function loadLeaderboard() {
  try {
    const { data, error } = await supabaseClient
      .from("endorsements")
      .select("skill, count");

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn("[Leaderboard] No endorsement data found.");
      return;
    }

    // Aggregate totals per skill
    const skillCounts = {};
    data.forEach(row => {
      skillCounts[row.skill] = (skillCounts[row.skill] || 0) + (row.count || 0);
    });

    const leaderboardContainer = document.getElementById("leaderboard-rows");
    if (!leaderboardContainer) {
      console.warn("[Leaderboard] No container found in DOM.");
      return;
    }

    leaderboardContainer.innerHTML = "";

    Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .forEach(([skill, total], idx) => {
        const row = document.createElement("div");
        row.className = "leaderboard-row";
        row.innerHTML = `
          <span class="leaderboard-rank">${idx + 1}.</span>
          <span class="leaderboard-skill">${skill}</span>
          <span class="leaderboard-count">${total}</span>
        `;
        leaderboardContainer.appendChild(row);
      });

  } catch (err) {
    console.error("[Leaderboard] Supabase error:", err.message);
  }
}
