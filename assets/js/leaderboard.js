// leaderboard.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { SKILL_SYNONYMS } from './skillsDictionary.js';

export async function loadLeaderboard(type = "skills", range = "month") {
  try {
    let data, error;

    if (type === "skills") {
      // --- Top Skills Leaderboard ---
      let query = supabase.from('endorsements')
        .select('skill, created_at, endorsed_user_id')
        .not('endorsed_user_id', 'is', null);

      query = applyRangeFilter(query, range);
      ({ data, error } = await query);
      if (error) throw error;

      const totals = {};
      data?.forEach(row => {
        if (!row.skill) return;

        row.skill
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .forEach(s => {
            const normalized = normalizeSkill(s);
            if (!normalized) return;
            if (!totals[normalized.key]) {
              totals[normalized.key] = { count: 0, label: normalized.label };
            }
            totals[normalized.key].count++;
          });
      });

      renderLeaderboard(totals, "skill");
    } else if (type === "connectors") {
      // --- Top Connectors Leaderboard ---
      let query = supabase.from('connections')
        .select('user_a, created_at')
        .not('user_a', 'is', null)
        .eq('status', 'accepted'); // only count accepted connections

      query = applyRangeFilter(query, range);
      ({ data, error } = await query);
      if (error) throw error;

      const totals = {};
      data?.forEach(row => {
        if (!row.user_a) return;
        totals[row.user_a] = (totals[row.user_a] || 0) + 1;
      });

      const users = await fetchUserNames(Object.keys(totals));
      renderLeaderboard(totals, "user", users);
    } else if (type === "rising") {
      const now = new Date();
      const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7);
      const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(now.getDate() - 14);

      const { data: recent, error: err1 } = await supabase
        .from('endorsements')
        .select('endorsed_user_id, created_at')
        .not('endorsed_user_id', 'is', null)
        .gte('created_at', weekAgo.toISOString());

      const { data: prev, error: err2 } = await supabase
        .from('endorsements')
        .select('endorsed_user_id, created_at')
        .not('endorsed_user_id', 'is', null)
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', weekAgo.toISOString());

      if (err1 || err2) throw (err1 || err2);

      const lastWeekCounts = {};
      prev?.forEach(r => {
        lastWeekCounts[r.endorsed_user_id] =
          (lastWeekCounts[r.endorsed_user_id] || 0) + 1;
      });

      const growth = {};
      recent?.forEach(r => {
        const before = lastWeekCounts[r.endorsed_user_id] || 0;
        const delta = 1 - before;
        if (delta > 0) {
          growth[r.endorsed_user_id] = (growth[r.endorsed_user_id] || 0) + delta;
        }
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
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return query.gte('created_at', weekAgo.toISOString());
  }
  if (range === "month") {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return query.gte('created_at', monthAgo.toISOString());
  }
  return query;
}

function normalizeSkill(raw) {
  if (!raw) return null;

  let skill = raw
    .toString()
    .trim()
    .replace(/^[{\["']+|[}\]"']+$/g, "")
    .toLowerCase();

  skill = skill.replace(/[-_]/g, " ");
  skill = skill.replace(/\b(developer|engineer|specialist|programmer)\b/g, "").trim();
  skill = skill.replace(/\b(programming|coding|tech|technology)\b/g, "").trim();
  skill = skill.replace(/\s+/g, " ");

  if (!skill) return null;

  if (SKILL_SYNONYMS[skill]) {
    return { key: SKILL_SYNONYMS[skill].toLowerCase(), label: SKILL_SYNONYMS[skill] };
  }

  const display = skill
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return { key: skill, label: display };
}

async function fetchUserNames(ids) {
  if (!ids || ids.length === 0) return {};
  const { data, error } = await supabase
    .from('community')
    .select('id, name, email')
    .in('id', ids)
    .not('name', 'eq', 'Anonymous User');
  if (error) {
    console.error('[Leaderboard] Error fetching user names:', error);
    return {};
  }
  const map = {};
  data?.forEach(u => {
    if (!u || !u.id) return;
    if (u.name?.trim() === "Anonymous User") return;
    map[u.id] = u.name?.trim() || u.email || `User ${u.id}`;
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
    .sort(([, a], [, b]) => {
      const countA = typeof a === 'object' ? a.count : a;
      const countB = typeof b === 'object' ? b.count : b;
      return countB - countA;
    })
    .forEach(([key, value], index) => {
      let display, total;
      if (type === "skill") {
        display = value.label || key;
        total = value.count;
      } else {
        display = userMap[key] || null;
        if (!display) return;
        total = value;
      }

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

// Tab event listener
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('lb-tab')) {
    document.querySelectorAll('.lb-tab').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    const type = e.target.dataset.type;
    loadLeaderboard(type);
  }
});

// Load default leaderboard
loadLeaderboard("skills");
