// main.js  (ES module)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// --- 0) Supabase client ---
const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- 1) Utilities ---
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function renderCards(container, rows) {
  container.innerHTML = rows.map(r => {
    const avatar = r.image_url || 'images/default-avatar.png';
    const name = r.name || [r.first_name, r.last_name].filter(Boolean).join(' ') || 'Unnamed';
    const role = r.role || '';
    const endorsements = r.endorsements ?? 0;
    const availability = r.availability || '';
    const interests = Array.isArray(r.interests) ? r.interests.join(', ') : (r.interests || '');

    return `
      <div class="card" role="listitem">
        <div class="card-header">
          <img src="${avatar}" alt="${name}" class="avatar" />
          <div>
            <div class="card-title">${name}</div>
            <div class="card-subtitle">${role}</div>
          </div>
        </div>
        <div class="card-body">
          <div><strong>Endorsements:</strong> ${endorsements}</div>
          ${availability ? `<div><strong>Availability:</strong> ${availability}</div>` : ''}
          ${interests ? `<div><strong>Interests:</strong> ${interests}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// --- 2) Data loaders ---
let leaderboardLoaded = false;

async function loadLeaderboard() {
  const target = $('#leaderboard-rows');
  if (!target) return;

  // Adjust the select list to match your real columns
  const { data, error } = await supabase
    .from('community')
    .select('name, role, endorsements')
    .order('endorsements', { ascending: false })
    .limit(15);

  if (error) {
    console.error('[Leaderboard error]', error);
    target.innerHTML = `<div class="error">Could not load leaderboard.</div>`;
    return;
  }

  target.innerHTML = (data || []).map((r, i) =>
    `<div class="row"><span>${i + 1}.</span> <strong>${r.name || 'Unnamed'}</strong> — ${r.endorsements ?? 0}</div>`
  ).join('');
}

async function searchByName(name) {
  const out = $('#cardContainer');
  const noRes = $('#noResults');
  const matchNote = $('#matchNotification');
  if (!out) return;

  out.innerHTML = '';
  noRes.style.display = 'none';
  matchNote.style.display = 'none';

  // Try matching first_name/last_name and fallback to a single "name" column if that’s your schema
  let data = [];
  let error = null;

  // Attempt 1: combined "name" column
  ({ data, error } = await supabase
    .from('community')
    .select('id,name,role,endorsements,availability,image_url,interests')
    .ilike('name', `%${name}%`)
    .limit(50));

  // If your schema instead has first_name / last_name, try OR filter:
  if (!error && data && data.length === 0) {
    const resp = await supabase
      .from('community')
      .select('id,first_name,last_name,role,endorsements,availability,image_url,interests,name') // include "name" in case it exists
      .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
      .limit(50);
    if (!resp.error && resp.data) data = resp.data;
  }

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

  const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
  if (skills.length === 0) return;

  // If your "skills" column is TEXT[] use .contains; if it’s TEXT, fallback to ilike ANY
  // Attempt array `contains`:
  let { data, error } = await supabase
    .from('community')
    .select('id,name,role,endorsements,availability,image_url,interests,skills')
    .contains('skills', skills);

  // Fallback: simple ilike on a text column called "skills"
  if ((!data || data.length === 0) && !error) {
    const clauses = skills.map(s => `skills.ilike.%${s}%`).join(',');
    const resp = await supabase
      .from('community')
      .select('id,name,role,endorsements,availability,image_url,interests,skills')
      .or(clauses);
    data = resp.data;
    error = resp.error;
  }

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

// --- 3) Tabs wiring + first load ---
function showTab(tabId) {
  $$('.tab-content-pane').forEach(p => p.classList.remove('active-tab-pane'));
  $$('.tab-button').forEach(b => b.classList.remove('active'));

  const pane = document.getElementById(tabId);
  const btn = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
  if (pane) pane.classList.add('active-tab-pane');
  if (btn) btn.classList.add('active');

  // Trigger loads when tabs are shown
  if (tabId === 'leaderboard' && !leaderboardLoaded) {
    leaderboardLoaded = true;
    loadLeaderboard();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  $$('.tab-button').forEach(b => {
    b.addEventListener('click', () => showTab(b.getAttribute('data-tab')));
  });

  // Default tab
  showTab('profile');

  // Search actions
  const searchNameBtn = $('#search-name-btn');
  const nameInput = $('#nameInput');
  if (searchNameBtn && nameInput) {
    searchNameBtn.addEventListener('click', () => searchByName(nameInput.value.trim()));
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchByName(nameInput.value.trim()); });
  }

  const findTeamBtn = $('#find-team-btn');
  const teamSkillsInput = $('#teamSkillsInput');
  if (findTeamBtn && teamSkillsInput) {
    findTeamBtn.addEventListener('click', () => searchBySkills(teamSkillsInput.value.trim()));
  }
});
