// /assets/js/main.js  — Vanilla (no jQuery), safe guards, shared Supabase client
// Tailored to your "community" table schema

// 0) Use your shared client to avoid multiple GoTrue instances
import { supabaseClient as supabase } from './supabaseClient.js';

// 1) Small DOM helpers
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// 2) Card renderer (null-safe)
function renderCards(container, rows) {
  if (!container) return;
  container.innerHTML = (rows || [])
    .map((r) => {
      const avatar = r.image_url || 'https://placehold.co/64x64';
      const skills = Array.isArray(r.skills) ? r.skills.join(', ') : '';
      const interests = Array.isArray(r.interests) ? r.interests.join(', ') : '';
      return `
        <div class="card" role="listitem" style="
          border:1px solid rgba(0,0,0,.12);
          border-radius:12px; padding:.75rem .9rem; background:var(--card-bg, rgba(0,0,0,.03));
        ">
          <div class="card-header" style="display:flex;gap:.65rem;align-items:center;">
            <img src="${avatar}" alt="${r.name || 'Member'}" class="avatar" width="48" height="48" style="border-radius:50%;object-fit:cover;" />
            <div>
              <div class="card-title" style="font-weight:600">${r.name || 'Unnamed'}</div>
              <div class="card-subtitle" style="opacity:.8;font-size:.9rem">${r.role || ''}</div>
            </div>
          </div>
          <div class="card-body" style="margin-top:.5rem;font-size:.95rem;line-height:1.35;">
            ${r.bio ? `<p style="margin:.25rem 0 .5rem">${r.bio}</p>` : ''}
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

// 3) Data loaders (with guards)
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
      <div class="row" style="display:flex;align-items:center;gap:.5rem;padding:.25rem 0;">
        <span style="width:1.5rem;text-align:right;">${i + 1}.</span>
        <img src="${r.image_url || 'https://placehold.co/32x32'}" alt="${r.name || 'Member'}"
             class="avatar-small" width="24" height="24" style="border-radius:50%;object-fit:cover;" />
        <strong style="flex:1 1 auto;">${r.name || 'Unnamed'}</strong>
        <span>${r.endorsements ?? 0}</span>
      </div>`
    )
    .join('');
}

async function searchByName(name) {
  const out = $('#cardContainer');
  const noRes = $('#noResults');
  const matchNote = $('#matchNotification');
  if (!out || !noRes || !matchNote) return;

  out.innerHTML = '';
  noRes.style.display = 'none';
  matchNote.style.display = 'none';

  const { data, error } = await supabase
    .from('community')
    .select('id,name,skills,interests,availability,image_url,endorsements,bio,role')
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
  if (!out || !noRes || !matchNote) return;

  out.innerHTML = '';
  noRes.style.display = 'none';
  matchNote.style.display = 'none';

  const skills = (skillsInput || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (skills.length === 0) return;

  // AND behavior (row must contain all listed skills):
  const { data, error } = await supabase
    .from('community')
    .select('id,name,skills,interests,availability,image_url,endorsements,bio,role')
    .contains('skills', skills);

  // If you want OR behavior instead, ask me—I’ll drop that version in.

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

// 4) Tabs wiring (with guards)
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

// 5) Boot
window.addEventListener('DOMContentLoaded', () => {
  // Tab buttons
  $$('.tab-button').forEach((b) => {
    b.addEventListener('click', () => showTab(b.getAttribute('data-tab')));
  });

  // Default tab if present
  if (document.getElementById('profile')) showTab('profile');

  // Search actions
  $('#search-name-btn')?.addEventListener('click', () =>
    searchByName($('#nameInput')?.value?.trim() || '')
  );
  $('#find-team-btn')?.addEventListener('click', () =>
    searchBySkills($('#teamSkillsInput')?.value?.trim() || '')
  );
});

// 6) (Optional) Mount the Step-2 suggestions UI
//    Requires you to have created /assets/js/matchEngine.js from the previous step.
import { attachSuggestionsUI } from './matchEngine.js';
document.addEventListener('DOMContentLoaded', () => {
  attachSuggestionsUI(); // will mount into #dex-suggestions-host or #app
});
