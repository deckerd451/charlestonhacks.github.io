import { supabaseClient as supabase } from './supabaseClient.js';

/**
 * Load leaderboard by type.
 * @param {string} type - "skills" | "connectors" | "rising"
 * @param {string} range - "week" | "month" | "all"
 */
export async function loadLeaderboard(type = "skills", range = "month") {
  try {
    let data, error;

    if (type === "skills") {
      // Aggregate by skill
      let query = supabase.from('endorsements').select('skill, created_at');
      query = applyRangeFilter(query, range);
      ({ data, error } = await query);
      if (error) throw error;

      const totals = {};
      data?.forEach(row => {
        if (!row.skill) return;
        totals[row.skill] = (totals[row.skill] || 0) + 1;
      });

      renderLeaderboard(totals, "skill");

    } else if (type === "connectors") {
      // Count who created the most connections
      let query = supabase.from('connections').select('from_user_id, created_at');
      query = applyRangeFilter(query, range);
      ({ data, error } = await query);
      if (error) throw error;

      const totals = {};
      data?.forEach(row => {
        if (!row.from_user_id) return;
        totals[row.from_user_id] = (totals[row.from_user_id] || 0) + 1;
      });

      const users = await fetchUserNames(Object.keys(totals));
      renderLeaderboard(totals, "user", users);

    } else if (type === "rising") {
      // Rising Stars = endorsements gained this week vs last week
      const now = new Date();
      const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(now.getDate() - 14);

      const { data: recent, error: err1 } = await supabase
        .from('endorsements')
        .select('endorsed_user_id, created_at')
        .gte('created_at', weekAgo.toISOString());

      const { data: prev, error: err2 } = await supabase
        .from('endorsements')
        .select('endorsed_user_id, created_at')
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      if (err1 || err2) throw (err1 || err2);

      const growth = {};
      const lastWeekCounts = {};
      prev?.forEach(r => lastWeekCounts[r.endorsed_user_id] = (lastWeekCounts[r.endorsed_user_id] || 0) + 1);
      recent?.forEach(r => {
        const before = lastWeekCounts[r.endorsed_user_id] || 0;
        const delta = 1 - before;
        growth[r.endorsed_user_id] = (growth[r.endorsed_user_id] || 0) + delta;
      });

      const users = await fetchUserNames(Object.keys(growth));
      renderLeaderboard(growth, "user", users);
    }
  } catch (err) {
    console.error('[Leaderboard] Error loading leaderboard:', err);
    renderEmpty();
  }
}

function applyRangeFilter(query, range) {
  if (range === "week") {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return query.gte('created_at', weekAgo.toISOString());
  }
  if (range === "month") {
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    return query.gte('created_at', monthAgo.toISOString());
  }
  return query;
}

/**
 * Fetch user names from the community table.
 * @param {string[]} ids
 * @returns {Promise<Object>} mapping { id: "First Last" }
 */
async function fetchUserNames(ids) {
  if (!ids || ids.length === 0) return {};
  const { data, error } = await supabase
    .from('community')
    .select('id, first_name, last_name')
    .in('id', ids);

  if (error) {
    console.error('[Leaderboard] Error fetching user names:', error);
    return {};
  }

  const map = {};
  data?.forEach(u => {
    map[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || `User ${u.id}`;
  });
  return map;
}

function renderLeaderboard(totals, type, userMap = {}) {
  const container = document.getElementById('leaderboard-rows');
  if (!container) return;
  container.innerHTML = '';

  if (!totals || Object.keys(totals).length === 0) {
    renderEmpty();
    return;
  }

  Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .forEach(([key, total], index) => {
      const display = (type === "skill")
        ? key
        : userMap[key] || `User ${key}`;
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.innerHTML = `
        <span class="leaderboard-rank">${index + 1}.</span>
        <span class="leaderboard-key">${display}</span>
        <span class="leaderboard-count">${total}</span>
      `;
      container.appendChild(row);
    });
}

function renderEmpty() {
  const container = document.getElementById('leaderboard-rows');
  if (!container) return;
  container.innerHTML = `<div class="leaderboard-row">No data yet</div>`;
}

// Tab control
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('lb-tab')) {
    document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    const type = e.target.dataset.type;
    loadLeaderboard(type);
  }
});

// Default load
loadLeaderboard("skills");
