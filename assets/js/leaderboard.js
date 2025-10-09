// ===============================
// UPDATED FILE: assets/js/leaderboard.js
// ===============================
// Unified structure using correct Supabase tables:
// - Top Skills → endorsements.skill
// - Top Connectors → connections (accepted mutuals)
// - Rising Stars → endorsements growth
// ===============================

import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { SKILL_SYNONYMS } from './skillsDictionary.js';

export function initLeaderboard() {
  const lbTabs = document.querySelectorAll('.lb-tab');
  const lbRows = document.getElementById('leaderboard-rows');
  if (!lbTabs || !lbRows) return;

  lbTabs.forEach((tab) => {
    tab.addEventListener('click', async () => {
      lbTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      lbRows.innerHTML = '<p style="text-align:center;color:#aaa;">Loading...</p>';

      const type = tab.dataset.type;
      console.log(`[Leaderboard] Loading ${type} leaderboard`);

      try {
        if (type === 'skills') await renderTopSkills(lbRows);
        else if (type === 'connectors') await renderTopConnectors(lbRows);
        else if (type === 'rising') await renderRisingStars(lbRows);
      } catch (err) {
        console.error(`[Leaderboard] Error loading ${type}:`, err);
        lbRows.innerHTML = '<p style="text-align:center;color:#f55;">Error loading leaderboard.</p>';
      }
    });
  });

  lbTabs[0].click(); // default tab
}

// ===============================
// TOP SKILLS TAB (endorsements table)
// ===============================
async function renderTopSkills(container) {
  const { data, error } = await supabase
    .from('endorsements')
    .select('skill, created_at, endorsed_user_id')
    .not('endorsed_user_id', 'is', null);

  if (error) {
    console.error('[Leaderboard] Skills error:', error);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading skills data.</p>';
    return;
  }

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
        if (!totals[normalized.key]) totals[normalized.key] = { count: 0, label: normalized.label };
        totals[normalized.key].count++;
      });
  });

  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);

  container.innerHTML = sorted
    .map(([key, value]) => `
      <div class="leaderboard-entry">
        <div><strong>${value.label}</strong></div>
        <div>${value.count} endorsement${value.count === 1 ? '' : 's'}</div>
      </div>`)
    .join('');

  console.log('[Leaderboard] Rendered Top Skills');
}

// ===============================
// TOP CONNECTORS TAB (connections table)
// ===============================
async function renderTopConnectors(container) {
  const { data, error } = await supabase
    .from('connections')
    .select('from_user_id, to_user_id, created_at, status')
    .eq('status', 'accepted');

  if (error) {
    console.error('[Leaderboard] Connectors error:', error);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading connectors.</p>';
    return;
  }

  const totals = {};
  data?.forEach(row => {
    if (row.from_user_id) totals[row.from_user_id] = (totals[row.from_user_id] || 0) + 1;
    if (row.to_user_id) totals[row.to_user_id] = (totals[row.to_user_id] || 0) + 1;
  });

  const users = await fetchUserNames(Object.keys(totals));
  const sorted = Object.entries(totals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  container.innerHTML = sorted
    .map(([userId, count]) => `
      <div class="leaderboard-entry">
        <div style="display:flex;align-items:center;">
          <img src="${users[userId]?.image_url || 'images/default-avatar.png'}" alt="${users[userId]?.name || 'User'}" />
          <strong>${users[userId]?.name || 'User'}</strong>
        </div>
        <div>${count} connection${count === 1 ? '' : 's'}</div>
      </div>`)
    .join('');

  console.log('[Leaderboard] Rendered Top Connectors');
}

// ===============================
// RISING STARS TAB (endorsements growth)
// ===============================
async function renderRisingStars(container) {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

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

  if (err1 || err2) {
    console.error('[Leaderboard] Rising Stars error:', err1 || err2);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading Rising Stars.</p>';
    return;
  }

  const lastWeekCounts = {};
  prev?.forEach(r => {
    lastWeekCounts[r.endorsed_user_id] = (lastWeekCounts[r.endorsed_user_id] || 0) + 1;
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
  const sorted = Object.entries(growth)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  container.innerHTML = sorted
    .map(([userId, delta]) => `
      <div class="leaderboard-entry">
        <div style="display:flex;align-items:center;">
          <img src="${users[userId]?.image_url || 'images/default-avatar.png'}" alt="${users[userId]?.name || 'User'}" />
          <strong>${users[userId]?.name || 'User'}</strong>
        </div>
        <div>+${delta} new endorsement${delta === 1 ? '' : 's'}</div>
      </div>`)
    .join('');

  console.log('[Leaderboard] Rendered Rising Stars');
  showNotification('✨ Rising Stars updated based on recent endorsement activity.', 'info');
}

// ===============================
// Helper Functions
// ===============================
function normalizeSkill(raw) {
  if (!raw) return null;
  let skill = raw.toString().trim().replace(/^[{\["']+|[}\]"']+$/g, "").toLowerCase();
  skill = skill.replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
  if (!skill) return null;
  if (SKILL_SYNONYMS[skill]) {
    return { key: SKILL_SYNONYMS[skill].toLowerCase(), label: SKILL_SYNONYMS[skill] };
  }
  const display = skill.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return { key: skill, label: display };
}

async function fetchUserNames(ids) {
  if (!ids || ids.length === 0) return {};
  const { data, error } = await supabase
    .from('community')
    .select('id, name, image_url, email')
    .in('id', ids)
    .not('name', 'eq', 'Anonymous User');
  if (error) {
    console.error('[Leaderboard] Error fetching users:', error);
    return {};
  }
  const map = {};
  data?.forEach(u => {
    if (!u || !u.id) return;
    map[u.id] = {
      name: u.name?.trim() || u.email || `User ${u.id}`,
      image_url: u.image_url || 'images/default-avatar.png'
    };
  });
  return map;
}

export { initLeaderboard as loadLeaderboard };
