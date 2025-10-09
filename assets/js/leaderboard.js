// ===============================
// UPDATED FILE: assets/js/leaderboard.js
// ===============================
// Builds and updates the leaderboard with three tabs:
//  - Top Skills
//  - Top Connectors
//  - Rising Stars (based on updated_at timestamps)
//
// Depends on: supabaseClient.js, utils.js (showNotification)
// ===============================

import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

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
        if (type === 'skills') {
          await renderTopSkills(lbRows);
        } else if (type === 'connectors') {
          await renderTopConnectors(lbRows);
        } else if (type === 'rising') {
          await renderRisingStars(lbRows);
        }
      } catch (err) {
        console.error(`[Leaderboard] Error loading ${type}:`, err);
        lbRows.innerHTML = '<p style="text-align:center;color:#f55;">Error loading leaderboard.</p>';
      }
    });
  });

  // Load default tab (Top Skills)
  lbTabs[0].click();
}

// ===============================
// TOP SKILLS TAB
// ===============================
async function renderTopSkills(container) {
  const { data, error } = await supabase
    .from('community')
    .select('skills')
    .not('skills', 'is', null);

  if (error) {
    console.error('[Leaderboard] Top Skills error:', error);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading skills data.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#ccc;">No skill data available.</p>';
    return;
  }

  const frequency = {};
  data.forEach((row) => {
    row.skills
      ?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s)
      .forEach((s) => {
        frequency[s] = (frequency[s] || 0) + 1;
      });
  });

  const sortedSkills = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  container.innerHTML = sortedSkills
    .map(
      ([skill, count]) => `
      <div class="leaderboard-entry">
        <div><strong>${skill}</strong></div>
        <div>${count} member${count === 1 ? '' : 's'}</div>
      </div>`
    )
    .join('');

  console.log('[Leaderboard] Rendered Top Skills');
}

// ===============================
// TOP CONNECTORS TAB
// ===============================
async function renderTopConnectors(container) {
  const { data, error } = await supabase
    .from('community')
    .select('name, image_url, endorsements')
    .order('endorsements', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[Leaderboard] Connectors error:', error);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading connectors data.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#ccc;">No connector data available.</p>';
    return;
  }

  container.innerHTML = data
    .map(
      (p) => `
      <div class="leaderboard-entry">
        <div style="display:flex;align-items:center;">
          <img src="${p.image_url || 'images/default-avatar.png'}" alt="${p.name}" />
          <strong>${p.name || 'Unnamed'}</strong>
        </div>
        <div>${p.endorsements || 0} connection${p.endorsements === 1 ? '' : 's'}</div>
      </div>`
    )
    .join('');

  console.log('[Leaderboard] Rendered Top Connectors');
}

// ===============================
// RISING STARS TAB (based on updated_at)
// ===============================
async function renderRisingStars(container) {
  const { data, error } = await supabase
    .from('community')
    .select('name, image_url, updated_at')
    .not('updated_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[Leaderboard] Rising Stars error:', error);
    container.innerHTML = '<p style="text-align:center;color:#f55;">Error loading Rising Stars.</p>';
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#ccc;">No recent updates found.</p>';
    return;
  }

  container.innerHTML = data
    .map((p) => {
      const dateStr = new Date(p.updated_at).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `
        <div class="leaderboard-entry">
          <div style="display:flex;align-items:center;">
            <img src="${p.image_url || 'images/default-avatar.png'}" alt="${p.name}" />
            <strong>${p.name || 'Unnamed'}</strong>
          </div>
          <div>Updated ${dateStr}</div>
        </div>`;
    })
    .join('');

  console.log('[Leaderboard] Rendered Rising Stars');
  showNotification('✨ Rising Stars updated based on recent profile changes.', 'info');
}
export { initLeaderboard as loadLeaderboard };

