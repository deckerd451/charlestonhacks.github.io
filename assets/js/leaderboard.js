// assets/js/leaderboard.js
import { supabaseClient as supabase } from './supabaseClient.js';

export async function loadLeaderboard() {
  try {
    const leaderboardContainer = document.getElementById("leaderboard-rows");
    if (!leaderboardContainer) {
      console.warn("[Leaderboard] No container found in DOM.");
      return;
    }

    // 🔎 Get endorsements from normalized table
    const { data, error } = await supabase
      .from("endorsements")
      .select("skill, endorsement_count")
      .order("endorsement_count", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Leaderboard] Supabase error:", error.message);
      leaderboardContainer.innerHTML =
        `<p class="error">Error loading leaderboard.</p>`;
      return;
    }

    if (!data || data.length === 0) {
      leaderboardContainer.innerHTML =
        `<p class="empty">No endorsements yet. Be the first to endorse!</p>`;
      return;
    }

    // 📊 Group by skill
    const skillMap = {};
    data.forEach(row => {
      if (!row.skill) return;
      if (!skillMap[row.skill]) skillMap[row.skill] = 0;
      skillMap[row.skill] += row.endorsement_count || 0;
    });

    // Sort by count (desc)
    const sorted = Object.entries(skillMap).sort((a, b) => b[1] - a[1]);

    // 🏆 Render top skills
    leaderboardContainer.innerHTML = sorted
      .map(([skill, count], idx) => `
        <div class="leaderboard-row">
          <span class="rank">#${idx + 1}</span>
          <span class="skill">${skill}</span>
          <span class="count">${count}</span>
        </div>
      `)
      .join("");

  } catch (err) {
    console.error("[Leaderboard error]", err);
    const leaderboardContainer = document.getElementById("leaderboard-rows");
    if (leaderboardContainer) {
      leaderboardContainer.innerHTML =
        `<p class="error">Unexpected error loading leaderboard.</p>`;
    }
  }
}

// Ensure leaderboard loads only when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
});
