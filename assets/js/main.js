// assets/js/main.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { initSynapseView } from './synapse.js';
import { initProfileForm } from './profile.js';

/* =========================================================
0) Skill helpers + autocomplete
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
      const allVals = []
        .concat(r.skills || [])
        .concat(r.interests || []);

      allVals.forEach(val => {
        if (!val) return;
        String(val)
          .split(/[,;|]/)
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

function attachAutocomplete(rootId, inputId, boxSelector) {
  const root = document.getElementById(rootId);
  if (!root) return;
  const input = root.querySelector(`#${inputId}`);
  const box = root.querySelector(boxSelector);
  if (!input || !box) return;

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
AUTH & UI TOGGLE
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
3) Card Rendering-Generate User Card
============================================ */
async function generateUserCardHTML(person) {
  const avatar = person.image_url || 'https://via.placeholder.com/80';
  const name = person.name || 'Anonymous';
  const availability = person.availability || 'Unknown';
  const bio = person.bio || 'No bio provided';
  const skillsArr = normaliseArray(person.skills);
  const interestsArr = normaliseArray(person.interests);
  const allSkills = [...new Set([...skillsArr, ...interestsArr])];

  // Fetch endorsements
  const { data: endorsements } = await supabase
    .from('endorsements')
    .select('skill, count')
    .eq('endorsed_user_id', person.id);

  const endorsementMap = {};
  (endorsements || []).forEach(e => {
    const normalized = e.skill.toLowerCase().trim();
    endorsementMap[normalized] = (endorsementMap[normalized] || 0) + (e.count || 0);
  });

  const skillChips = allSkills.map(skill => {
    const count = endorsementMap[skill] || 0;
    return `
      <div class="skill-chip">
        <span class="skill-name">${skill}</span>
        <span class="endorsement-count">${count}</span>
        <button class="endorse-btn" data-user-id="${person.id}" data-skill="${skill}">+</button>
      </div>
    `;
  }).join('');

  return `
    <div class="card user-card" data-user-id="${person.id}">
      <img src="${avatar}" alt="${name}" class="user-avatar">
      <h3>${name}</h3>
      ${person.email ? `<p class="email">${person.email}</p>` : ""}
      <p class="availability">${availability}</p>
      <p class="bio">${bio}</p>
      <div class="skills-list">${skillChips}</div>
      <button class="connect-btn" data-user-id="${person.id}">🤝 Connect</button>
    </div>
  `;
}
/* ============================================
Render Results (Search / Cards)
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

      // Card click opens endorse modal
      cardEl.addEventListener('click', () => openEndorseModal(person));

      // Endorse buttons
      cardEl.querySelectorAll('.endorse-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const userId = btn.getAttribute('data-user-id');
          const skill = btn.getAttribute('data-skill');
          await endorseSkill(userId, skill);
        });
      });

      // ✅ Connect button
      const connectBtn = cardEl.querySelector('.connect-btn');
      if (connectBtn) {
        connectBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetId = connectBtn.getAttribute('data-user-id');
          await connectToUser(targetId);
        });
      }

      cardContainer.appendChild(cardEl);
    } catch (err) {
      console.error('[RenderResults] Error rendering card:', err);
    }
  }
}

/* ============================================
4) Search
============================================ */
function initSearch() {
  const root = document.getElementById('search');
  if (!root) return;
  const findTeamBtn = root.querySelector('#find-team-btn');
  const searchNameBtn = root.querySelector('#search-name-btn');
  const skillsInput = root.querySelector('#teamSkillsInput');

  if (findTeamBtn && skillsInput) {
    findTeamBtn.addEventListener('click', async () => {
      const required = parseRequiredSkills(skillsInput.value);
      if (required.length === 0) return;

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

  attachAutocomplete('search', 'teamSkillsInput', '#autocomplete-team-skills');
}

/* ============================================
5) Endorsement Modal
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

    const { data: profile, error: profileError } = await supabase
      .from('community')
      .select('id')
      .eq('email', currentUser.email)
      .single();

    if (profileError || !profile) {
      showNotification('Please create your profile before endorsing others.', 'error');
      return;
    }

    const endorserId = profile.id;

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
Connections
============================================ */
async function connectToUser(targetUserId) {
  try {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (!currentUser || userError) {
      showNotification('Please log in to connect.', 'error');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('community')
      .select('id')
      .eq('email', currentUser.email)
      .single();

    if (profileError || !profile) {
      showNotification('Please create your profile before connecting.', 'error');
      return;
    }

    const fromUserId = profile.id;

    const { error: insertError } = await supabase
      .from('connections')
      .insert({
        from_user_id: fromUserId,
        to_user_id: targetUserId,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[Connections] Insert error:', insertError);
      showNotification('Connection failed.', 'error');
    } else {
      showNotification('Connection created!', 'success');
    }
  } catch (err) {
    console.error('[Connections] Unexpected:', err);
    showNotification('Unexpected error creating connection.', 'error');
  }
}

/* ============================================
6) Team Builder
============================================ */
async function buildBestTeam() {
  const skillsInput = document.getElementById('team-skills-input');
  const teamSizeInput = document.getElementById('teamSize');
  const container = document.getElementById('bestTeamContainer');
  if (!skillsInput || !container) return;

  const required = parseRequiredSkills(skillsInput.value);
  if (required.length === 0) {
    showNotification('Please enter required team skills.', 'error');
    return;
  }

  const teamSize = teamSizeInput ? parseInt(teamSizeInput.value, 10) || 3 : 3;

  try {
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

        // endorse
        cardEl.querySelectorAll('.endorse-btn').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute('data-user-id');
            const skill = btn.getAttribute('data-skill');
            await endorseSkill(userId, skill);
          });
        });

        // connect
        const connectBtn = cardEl.querySelector('.connect-btn');
        if (connectBtn) {
          connectBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const targetId = connectBtn.getAttribute('data-user-id');
            await connectToUser(targetId);
          });
        }

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
globalThis.buildBestTeam = buildBestTeam;

/* ============================================
7) Bootstrap
============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Main] App Initialized');
  await initAuth();
  initTabs();
  initSynapseView();
  loadLeaderboard();
  await loadSkillSuggestions();
  initSearch();

  const teamBtn = document.getElementById('buildTeamBtn');
  if (teamBtn) {
    teamBtn.addEventListener('click', () => buildBestTeam());
  }

  attachAutocomplete('team-builder', 'team-skills-input', '#autocomplete-team-builder');
  attachAutocomplete('profile', 'skills-input', '#autocomplete-skills-input');

  // Initialize profile form
  initProfileForm();
});
