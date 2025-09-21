// assets/js/main.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { initDocsModal } from './docsModal.js';
import { loadLeaderboard } from './leaderboard.js';
import { generateUserCardHTML } from './cardRenderer.js';

/* =========================================================
   0) Skill helpers + autocomplete (Search & Team Builder)
   ========================================================= */
let SKILL_SUGGESTIONS = [];

function debounce(fn, ms = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function normaliseArray(a) {
  if (!a) return [];
  const arr = Array.isArray(a) ? a : a.toString().split(',');
  return arr.map(s => s && s.toString().trim().toLowerCase()).filter(Boolean);
}

function parseRequiredSkills(raw) {
  return (raw || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

// Returns only people whose (skills ∪ interests) ⊇ requiredSkills
function filterAllOfRequired(candidates, requiredSkills) {
  return (candidates || []).filter(p => {
    const have = new Set([...normaliseArray(p.skills), ...normaliseArray(p.interests)]);
    return requiredSkills.every(req => have.has(req));
  });
}

async function loadSkillSuggestions() {
  try {
    const { data, error } = await supabase.from("community").select("skills, interests");
    if (error) {
      console.warn("[Suggest] load error:", error.message);
      return;
    }

    const bag = new Set();
    (data || []).forEach(r => {
      // Normalize both arrays and comma-joined strings
      const allVals = []
        .concat(r.skills || [])
        .concat(r.interests || []);

      allVals.forEach(val => {
        if (!val) return;
        // if it's a string like "leadership, additive manufacturing"
        String(val)
          .split(/[,;|]/) // split on commas/semicolons/pipes
          .map(s => s.trim().toLowerCase())
          .filter(Boolean)
          .forEach(skill => bag.add(skill));
      });
    });

    SKILL_SUGGESTIONS = Array.from(bag).sort();
  } catch (e) {
    console.warn("[Suggest] unexpected:", e);
  }
}


/**
 * Scoped autocomplete under a given root so identical IDs in
 * different tabs don't clash. `boxSelector` should be "#autocomplete-team-skills".
 */
function attachAutocomplete(rootId, inputId, boxSelector) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const input = root.querySelector(`#${inputId}`);
  const box = root.querySelector(boxSelector);
  if (!input || !box) return;

  // ensure the parent is positioned for absolute dropdown
  const wrapper = input.parentElement;
  if (getComputedStyle(wrapper).position === 'static') {
    wrapper.style.position = 'relative';
  }

  const closeBox = () => { box.innerHTML = ''; box.style.display = 'none'; };
  const openBox  = () => { box.style.display = 'block'; };

  const render = debounce(() => {
    const parts = (input.value || '').split(',');
    const lastRaw = parts[parts.length - 1].trim().toLowerCase();

    if (!lastRaw) { closeBox(); return; }

    const matches = SKILL_SUGGESTIONS
      .filter(s => s.startsWith(lastRaw))
      .slice(0, 8);

    if (matches.length === 0) { closeBox(); return; }

    box.innerHTML = matches
      .map(s => `<div class="autocomplete-item" data-skill="${s}">${s}</div>`)
      .join('');
    openBox();

    box.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('click', () => {
        parts[parts.length - 1] = ' ' + el.dataset.skill;
        // normalise spacing and add trailing comma-space for continued typing
        input.value = parts.map(p => p.trim()).filter(Boolean).join(', ') + ', ';
        input.focus();
        closeBox();
      });
    });
  }, 120);

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('blur', () => setTimeout(closeBox, 120));
}

/* ============================================
   1) AUTH & UI TOGGLE (matches 2card.html IDs)
   ============================================ */
async function initAuth() {
  const loginForm = document.getElementById('login-form');
  const loginSection = document.getElementById('login-section');
  const profileSection = document.getElementById('profile-section');
  const logoutBtn = document.getElementById('logout-btn');
  const userBadge = document.getElementById('user-badge');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      if (!email) {
        showNotification('Please enter a valid email.', 'error');
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) {
        console.error('[Login] Error:', error.message);
        showNotification('Failed to send magic link.', 'error');
      } else {
        showNotification('Magic link sent! Check your inbox.', 'success');
      }
    });
  }

  function setLoggedInUI(user) {
    loginSection?.classList.add('hidden');
    profileSection?.classList.remove('hidden');
    logoutBtn?.classList.remove('hidden');
    if (userBadge) {
      userBadge.textContent = `Signed in as ${user.email}`;
      userBadge.classList.remove('hidden');
    }
  }

  function setLoggedOutUI() {
    loginSection?.classList.remove('hidden');
    profileSection?.classList.add('hidden');
    logoutBtn?.classList.add('hidden');
    if (userBadge) {
      userBadge.textContent = '';
      userBadge.classList.add('hidden');
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) setLoggedInUI(user);
  else if (error) setLoggedOutUI();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) setLoggedInUI(session.user);
    else setLoggedOutUI();
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      showNotification('Signed out.', 'success');
      setLoggedOutUI();
      document.getElementById('skills-form')?.reset();
    });
  }
}

/* ===========================
   2) Tabs
   =========================== */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-button');
  const panes = document.querySelectorAll('.tab-content-pane');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      panes.forEach((p) => p.classList.remove('active-tab-pane'));

      btn.classList.add('active');
      const target = btn.dataset.tab;
      document.getElementById(target)?.classList.add('active-tab-pane');
    });
  });
}

/* ============================================
   3) Results rendering (cards)
   ============================================ */
async function renderResults(data) {
  const cardContainer = document.getElementById('cardContainer');
  const noResults = document.getElementById('noResults');
  const matchNotification = document.getElementById('matchNotification');

  if (!cardContainer || !noResults || !matchNotification) return;

  cardContainer.innerHTML = '';
  matchNotification.style.display = 'none';
  noResults.style.display = 'none';

  if (!data || data.length === 0) {
    noResults.style.display = 'block';
    return;
  }

  matchNotification.textContent = `Found ${data.length} result(s).`;
  matchNotification.style.display = 'block';

  for (const person of data) {
    try {
      const cardHTML = await generateUserCardHTML(person);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cardHTML.trim();
      const cardEl = wrapper.firstElementChild;

      // Open modal on card click (excluding clicks on endorse buttons)
      cardEl.addEventListener('click', () => openEndorseModal(person));

      // Attach endorse button handlers (direct endorse via plus button)
      cardEl.querySelectorAll('.endorse-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const userId = btn.getAttribute('data-user-id');
          const skill = btn.getAttribute('data-skill');
          await endorseSkill(userId, skill);
        });
      });

      cardContainer.appendChild(cardEl);
    } catch (err) {
      console.error('[RenderResults] Error rendering card:', err);
    }
  }
}

/* ============================================
   4) Search (strict ALL-OF + suggestions)
   ============================================ */
function initSearch() {
  const root = document.getElementById('search');
  if (!root) return;

  const findTeamBtn = root.querySelector('#find-team-btn');
  const searchNameBtn = root.querySelector('#search-name-btn');
  const skillsInput = root.querySelector('#teamSkillsInput');

  // Strict ALL-OF across skills+interests, typed as "aws, fullstack"
  if (findTeamBtn && skillsInput) {
    findTeamBtn.addEventListener('click', async () => {
      const required = parseRequiredSkills(skillsInput.value);
      if (required.length === 0) return;

      // Broad fetch (ANY overlap), then client-side ALL-OF on union(skills, interests)
      const ors = [
        `skills.ov.{${required.join(',')}}`,
        `interests.ov.{${required.join(',')}}`
      ].join(',');

      const { data, error } = await supabase
        .from('community')
        .select('*')
        .or(ors);

      if (error) { console.error('[Search] Supabase error:', error); return; }

      const strict = filterAllOfRequired(data, required);
      await renderResults(strict);
    });
  }

  // Name search
  if (searchNameBtn) {
    searchNameBtn.addEventListener('click', async () => {
      const name = root.querySelector('#nameInput')?.value.trim();
      if (!name) return;

      const { data, error } = await supabase
        .from('community')
        .select('*')
        .ilike('name', `%${name}%`);

      if (error) { console.error('[Search] Name error:', error); return; }
      await renderResults(data);
    });
  }

  // Autocomplete for Search tab input
  attachAutocomplete('search', 'teamSkillsInput', '#autocomplete-team-skills');
}

/* ============================================
   5) Endorsement modal + actions
   ============================================ */
function openEndorseModal(person) {
  const modal = document.getElementById('endorseSkillModal');
  const list = document.getElementById('endorse-skill-list');
  if (!modal || !list) return;

  list.innerHTML = '';

  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map((s) => s.toString().trim());
    return value.toString().split(',').map((s) => s.trim()).filter(Boolean);
  };

  const skills = [...toArray(person.skills), ...toArray(person.interests)];

  if (skills.length === 0) {
    list.innerHTML = `<p>No skills/interests listed for ${person.name}.</p>`;
  } else {
    skills.forEach((skill) => {
      const item = document.createElement('div');
      item.className = 'skill-endorse-item';
      item.innerHTML = `
        <span>${skill}</span>
        <button class="endorse-specific-skill-btn">Endorse</button>
      `;
      list.appendChild(item);
    });
  }

  list.querySelectorAll('.endorse-specific-skill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const skill = btn.previousElementSibling.textContent.trim();
      await endorseSkill(person.id, skill);
      modal.style.display = 'none';
    });
  });

  modal.style.display = 'block';

  const closeBtn = modal.querySelector('.close-button');
  if (closeBtn) closeBtn.onclick = () => (modal.style.display = 'none');
  window.onclick = (evt) => {
    if (evt.target === modal) modal.style.display = 'none';
  };
}

async function endorseSkill(endorsedUserId, skill) {
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (!currentUser || userError) {
      showNotification('You must be logged in to endorse.', 'error');
      return;
    }

    // Lookup endorser's community ID
    const { data: profile, error: profileError } = await supabase
      .from('community')
      .select('id')
      .eq('email', currentUser.email)
      .single();

    if (profileError || !profile) {
      console.warn('[Endorse] Profile lookup failed:', profileError);
      showNotification('Please create your profile before endorsing others.', 'error');
      return;
    }

    const endorserId = profile.id;

    // Existing endorsement?
    const { data: existing, error: selectError } = await supabase
      .from('endorsements')
      .select('count')
      .eq('endorsed_user_id', endorsedUserId)
      .eq('endorsed_by_user_id', endorserId)
      .eq('skill', skill)
      .maybeSingle();

    if (selectError && selectError.code && selectError.code !== 'PGRST116') {
      console.warn('[Endorse] select error:', selectError);
    }

    if (existing) {
      const newCount = (existing.count || 0) + 1;
      const { error: updateError } = await supabase
        .from('endorsements')
        .update({ count: newCount })
        .eq('endorsed_user_id', endorsedUserId)
        .eq('endorsed_by_user_id', endorserId)
        .eq('skill', skill);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('endorsements')
        .insert({
          endorsed_user_id: endorsedUserId,
          endorsed_by_user_id: endorserId,
          skill,
          count: 1,
        });
      if (insertError) throw insertError;
    }

    // Recompute total for this user+skill
    const { data: records } = await supabase
      .from('endorsements')
      .select('count')
      .eq('endorsed_user_id', endorsedUserId)
      .eq('skill', skill);

    const totalCount = (records || []).reduce((acc, r) => acc + (r.count || 0), 0);
    updateCardCount(endorsedUserId, skill, totalCount);
    await loadLeaderboard();
    showNotification(`Endorsed ${skill}!`, 'success');
  } catch (err) {
    console.error('[Endorse] Error:', err);
    showNotification('Failed to endorse.', 'error');
  }
}

function updateCardCount(endorsedUserId, skill, newCount) {
  document
    .querySelectorAll(`.endorse-btn[data-user-id="${endorsedUserId}"][data-skill="${skill}"]`)
    .forEach((btn) => {
      const countSpan = btn.parentElement.querySelector('.endorsement-count');
      if (countSpan) countSpan.textContent = newCount;
    });
}

/* ============================================
   6) Team builder (keeps your behavior; AND logic optional)
   ============================================ */
async function buildBestTeam() {
  const skillsInput = document.getElementById('team-skills-input');
  const teamSizeInput = document.getElementById('teamSize');
  const container = document.getElementById('bestTeamContainer');

  if (!skillsInput || !container) {
    console.warn('[TeamBuilder] Required elements not found.');
    return;
  }

  const required = parseRequiredSkills(skillsInput.value);
  if (required.length === 0) {
    showNotification('Please enter required team skills.', 'error');
    return;
  }

  const teamSize = teamSizeInput ? parseInt(teamSizeInput.value, 10) || 3 : 3;

  try {
    // Broad fetch (ANY overlap), then strict ALL-OF filter on union
    const ors = [
      `skills.ov.{${required.join(',')}}`,
      `interests.ov.{${required.join(',')}}`
    ].join(',');

    const { data, error } = await supabase
      .from('community')
      .select('*')
      .or(ors);

    if (error) {
      console.error('[TeamBuilder] Supabase error:', error);
      showNotification('Error fetching team members.', 'error');
      return;
    }

    const strict = filterAllOfRequired(data, required).slice(0, teamSize);
    container.innerHTML = '';

    if (strict.length === 0) {
      container.innerHTML = '<p>No matching team members found.</p>';
      return;
    }

    for (const person of strict) {
      try {
        const cardHTML = await generateUserCardHTML(person);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = cardHTML.trim();
        const cardEl = wrapper.firstElementChild;

        cardEl.addEventListener('click', () => openEndorseModal(person));
        cardEl.querySelectorAll('.endorse-btn').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute('data-user-id');
            const skill = btn.getAttribute('data-skill');
            await endorseSkill(userId, skill);
          });
        });

        container.appendChild(cardEl);
      } catch (err) {
        console.error('[TeamBuilder] Error rendering team card:', err);
      }
    }
  } catch (err) {
    console.error('[TeamBuilder] Unexpected error:', err);
    showNotification('Unexpected error building team.', 'error');
  }
}

// Expose globally for any non-module listeners (safe for now)
globalThis.buildBestTeam = buildBestTeam;

/* ============================================
   7) Bootstrap
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Main] App Initialized');
  await initAuth();
  initTabs();

  if (document.getElementById('docsModal') || document.getElementById('docs-modal')) {
    initDocsModal();
  }

  loadLeaderboard();

  // Load skill dictionary once, then wire search + autocompletes
  await loadSkillSuggestions();
  initSearch();

  // Team builder button (and attach autocomplete for that tab too)
  const teamBtn = document.getElementById('buildTeamBtn');
  if (teamBtn) teamBtn.addEventListener('click', () => buildBestTeam());
  attachAutocomplete('team-builder', 'team-skills-input', '#autocomplete-team-skills');

  // Note: we do NOT call any profile form init here; login.js/profile.js handle it to avoid double-binding.
});
