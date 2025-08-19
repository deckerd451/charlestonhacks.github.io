// main.js (CharlestonHacks Innovation Engine)
// Tailored to your "community" table schema

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- 0) Supabase client ---
const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1) Helpers ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function renderCards(container, rows) {
  container.innerHTML = rows
    .map((r) => {
      const avatar = r.image_url || 'images/default-avatar.png';
      const skills = Array.isArray(r.skills) ? r.skills.join(', ') : '';
      const interests = Array.isArray(r.interests) ? r.interests.join(', ') : '';

      return `
        <div class="card" role="listitem">
          <div class="card-header">
            <img src="${avatar}" alt="${r.name}" class="avatar" />
            <div>
              <div class="card-title">${r.name || 'Unnamed'}</div>
              <div class="card-subtitle">${r.role || ''}</div>
            </div>
          </div>
          <div class="card-body">
            ${r.bio ? `<p>${r.bio}</p>` : ''}
            ${skills ? `<div><strong>Skills:</strong> ${skills}</div>` : ''}
            ${interests ? `<div><strong>Interests:</strong> ${interests}</div>` : ''}
            ${r.availability ? `<div><strong>Availability:</strong> ${r.availability}</div>` : ''}
            <div><strong>Endorsements:</strong> ${r.endorsements ?? 0}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

// --- 2) Data loaders ---
let leaderboardLoaded = false;

async function loadLeaderboard() {
  const target = $('#leaderboard-rows');
  if (!target) return;

  const { data, error } = await supabase
    .from('community')
    .select('name, endorsements, image_url')
    .order('endorsements', { ascending: false })
    .limit(10);

  if (error) {
    console.error('[Leaderboard error]', error);
    target.innerHTML = `<div class="error">Could not load leaderboard.</div>`;
    return;
  }

  target.innerHTML = (data || [])
    .map(
      (r, i) => `
      <div class="row">
        <span>${i + 1}.</span>
        <img src="${r.image_url || 'images/default-avatar.png'}" alt="${r.name}" class="avatar-small" />
        <strong>${r.name || 'Unnamed'}</strong> — ${r.endorsements ?? 0}
      </div>`
    )
    .join('');
}

async function searchByName(name) {
  const out = $('#cardContainer');
  const noRes = $('#noResults');
  const matchNote = $('#matchNotification');

  out.innerHTML = '';
  noRes.style.display = 'none';
  matchNote.style.display = 'none';

  const { data, error } = await supabase
    .from('community')
    .select('id,name,skills,interests,availability,image_url,endorsements,bio')
    .ilike('name', `%${name}%`)
    .limit(50);

  if (error) {
    console.error('[Search by name error]', error);
    out.innerHTML = `<div class="error">Search failed.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    noRes.textContent = 'No matching people found.';
    noRes.style.display = 'block';
    return;
  }

  renderCards(out, data);
  matchNote.textContent = `Found ${data.length} match${data.length === 1 ? '' : 'es'}.`;
  matchNote.style.display = 'block';
}

async function searchBySkills(skillsInput) {
  const out = $('#cardContainer');
  const noRes = $('#noResults');
  const matchNote = $('#matchNotification');

  out.innerHTML = '';
  noRes.style.display = 'none';
  matchNote.style.display = 'none';

  const skills = skillsInput.split(',').map((s) => s.trim()).filter(Boolean);
  if (skills.length === 0) return;

  const { data, error } = await supabase
    .from('community')
    .select('id,name,skills,interests,availability,image_url,endorsements,bio')
    .contains('skills', skills); // ARRAY search

  if (error) {
    console.error('[Search by skills error]', error);
    out.innerHTML = `<div class="error">Search failed.</div>`;
    return;
  }

  if (!data || data.length === 0) {
    noRes.textContent = 'No matching people found for those skills.';
    noRes.style.display = 'block';
    return;
  }

  renderCards(out, data);
  matchNote.textContent = `Found ${data.length} match${data.length === 1 ? '' : 'es'}.`;
  matchNote.style.display = 'block';
}

// --- 3) Tabs wiring ---
function showTab(tabId) {
  $$('.tab-content-pane').forEach((p) => p.classList.remove('active-tab-pane'));
  $$('.tab-button').forEach((b) => b.classList.remove('active'));

  const pane = document.getElementById(tabId);
  const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  if (pane) pane.classList.add('active-tab-pane');
  if (btn) btn.classList.add('active');

  if (tabId === 'leaderboard' && !leaderboardLoaded) {
    leaderboardLoaded = true;
    loadLeaderboard();
  }
}

// --- 4) Initialize ---
window.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  $$('.tab-button').forEach((b) => {
    b.addEventListener('click', () => showTab(b.getAttribute('data-tab')));
  });

  // Default tab
  showTab('profile');

  // Search actions
  $('#search-name-btn')?.addEventListener('click', () =>
    searchByName($('#nameInput').value.trim())
  );
  $('#find-team-btn')?.addEventListener('click', () =>
    searchBySkills($('#teamSkillsInput').value.trim())
  );
});
