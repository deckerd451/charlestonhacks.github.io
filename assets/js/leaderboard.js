// leaderboard.js
import { supabaseClient as supabase } from './supabaseClient.js';

/**
 * Load leaderboard grouped by skill.
 * @param {string} range - "week" | "month" | "all"
 */
export async function loadLeaderboard(range = "month") {  // 👈 Default is "month"
  try {
    // Build date filter if needed
    let query = supabase.from('endorsements').select('skill, created_at');

    if (range === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte('created_at', weekAgo.toISOString());
    } else if (range === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query = query.gte('created_at', monthAgo.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn(`[Leaderboard] No endorsements found for range: ${range}`);
      renderEmpty();
      return;
    }

    // Aggregate counts by skill
    const totals = {};
    data.forEach(row => {
      if (!row.skill) return;
      totals[row.skill] = (totals[row.skill] || 0) + 1;
    });

    // Render leaderboard
    renderLeaderboard(totals);
  } catch (err) {
    console.error('[Leaderboard] Error loading leaderboard:', err);
  }
}

function renderLeaderboard(totals) {
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
}

function renderEmpty() {
  const container = document.getElementById('leaderboard-rows');
  if (!container) return;
  container.innerHTML = `<div class="leaderboard-row">No endorsements yet</div>`;
}
