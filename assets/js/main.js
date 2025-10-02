// assets/js/main.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { initSynapseView } from './synapse.js';
import { initProfileForm } from './profile.js';

/* =========================================================
0) Helpers
========================================================= */
let SKILL_SUGGESTIONS = [];

function debounce(fn, ms = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
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
    if (error) return console.warn("[Suggest] load error:", error.message);

    const bag = new Set();
    (data || []).forEach(r => {
      const allVals = [].concat(r.skills || []).concat(r.interests || []);
      allVals.forEach(val => {
        if (!val) return;
        String(val).split(/[,;|]/).map(s => s.trim().toLowerCase()).filter(Boolean).forEach(skill => bag.add(skill));
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
  if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';

  const closeBox = () => { box.innerHTML = ''; box.style.display = 'none'; };
  const openBox  = () => { box.style.display = 'block'; };

  const render = debounce(() => {
    const parts = (input.value || '').split(',');
    const lastRaw = parts[parts.length - 1].trim().toLowerCase();
    if (!lastRaw) return closeBox();

    const matches = SKILL_SUGGESTIONS.filter(s => s.startsWith(lastRaw)).slice(0, 8);
    if (!matches.length) return closeBox();

    box.innerHTML = matches.map(s => `<div class="autocomplete-item" data-skill="${s}">${s}</div>`).join('');
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

/* =========================================================
1) Auth
========================================================= */
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
      if (!email) return showNotification('Enter a valid email.', 'error');

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) showNotification('Failed to send magic link.', 'error');
      else showNotification('Magic link sent! Check your inbox.', 'success');
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
    userBadge?.classList.add('hidden');
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) setLoggedInUI(user);
  else if (error) setLoggedOutUI();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) setLoggedInUI(session.user);
    else setLoggedOutUI();
  });

  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showNotification('Signed out.', 'success');
    setLoggedOutUI();
    document.getElementById('skills-form')?.reset();
  });
}
/* =========================================================
2) Connections (Mutual Requests)
========================================================= */
async function getMyProfileId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('community')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) return null;
  return profile.id;
}

async function connectToUser(targetId) {
  const me = await getMyProfileId();
  if (!me) return showNotification('Login required.', 'error');
  if (me === targetId) return showNotification('Cannot connect to yourself.', 'error');

  const { error } = await supabase.from('connections').insert({
    from_user_id: me,
    to_user_id: targetId,
    status: 'pending',
    type: 'manual'
  });

  if (error) {
    console.error('[Connect] Insert error:', error);
    showNotification('Request already exists or failed.', 'warning');
  } else {
    showNotification('Connection request sent!', 'success');
  }
}

/* =========================================================
3) Notifications Dropdown 🔔
========================================================= */
async function initNotifications() {
  const btn = document.getElementById('notifications-btn');
  const badge = document.getElementById('notifications-badge');
  const dropdown = document.getElementById('notifications-dropdown');
  const list = document.getElementById('notifications-list');
  if (!btn || !badge || !dropdown || !list) return;

  btn.addEventListener('click', () => dropdown.classList.toggle('hidden'));

  async function loadNotifications() {
    const me = await getMyProfileId();
    if (!me) { 
      badge.classList.add('hidden'); 
      list.textContent = 'Login required'; 
      return; 
    }

    // look for requests sent TO me
    const { data, error } = await supabase
      .from('connections')
      .select('id, from_user_id')
      .eq('to_user_id', me)
      .eq('status', 'pending');

    if (error || !data?.length) {
      badge.classList.add('hidden');
      list.textContent = 'No new requests';
      return;
    }

    badge.textContent = data.length;
    badge.classList.remove('hidden');

    const ids = data.map(r => r.from_user_id);
    const { data: users } = await supabase
      .from('community')
      .select('id, name, email')
      .in('id', ids);

    const names = {};
    users?.forEach(u => { names[u.id] = u.name || u.email; });

    list.innerHTML = '';
    data.forEach(req => {
      const el = document.createElement('div');
      el.className = 'notif-item';
      el.innerHTML = `
        <span>${names[req.from_user_id] || req.from_user_id}</span>
        <button class="accept-btn" data-id="${req.id}">Accept</button>
        <button class="decline-btn" data-id="${req.id}">Decline</button>
      `;
      list.appendChild(el);
    });

    list.querySelectorAll('.accept-btn').forEach(btn => {
      btn.onclick = async () => {
        await supabase.from('connections')
          .update({ status: 'accepted' })
          .eq('id', btn.dataset.id);
        showNotification('Connection accepted!', 'success');
        loadNotifications();
        loadLeaderboard('connectors');
      };
    });

    list.querySelectorAll('.decline-btn').forEach(btn => {
      btn.onclick = async () => {
        await supabase.from('connections')
          .delete()
          .eq('id', btn.dataset.id);
        showNotification('Request declined.', 'info');
        loadNotifications();
      };
    });
  }

  loadNotifications();
  setInterval(loadNotifications, 30000);
}

function initNotificationsRealtime() {
  supabase.channel('connections-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
      initNotifications();
    })
    .subscribe();
}

/* =========================================================
4) Tabs + Search
========================================================= */
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

function initSearch() {
  const root = document.getElementById('search');
  if (!root) return;

  const findTeamBtn = root.querySelector('#find-team-btn');
  const searchNameBtn = root.querySelector('#search-name-btn');
  const skillsInput = root.querySelector('#teamSkillsInput');

  if (findTeamBtn && skillsInput) {
    findTeamBtn.addEventListener('click', async () => {
      const required = parseRequiredSkills(skillsInput.value);
      if (!required.length) return;

      const ors = [
        `skills.ov.{${required.join(',')}}`,
        `interests.ov.{${required.join(',')}}`
      ].join(',');

      const { data, error } = await supabase
        .from('community')
        .select('*')
        .or(ors);

      if (error) return console.error('[Search] Supabase error:', error);

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

      if (error) return console.error('[Search] Name error:', error);
      await renderResults(data);
    });
  }

  attachAutocomplete('search', 'teamSkillsInput', '#autocomplete-team-skills');
}
async function renderResults(data) {
  const cardContainer = document.getElementById('cardContainer');
  const noResults = document.getElementById('noResults');
  const matchNotification = document.getElementById('matchNotification');

  if (!cardContainer || !noResults || !matchNotification) return;

  // reset display
  cardContainer.innerHTML = '';
  noResults.classList.add('hidden');
  matchNotification.classList.add('hidden');

  if (!data || data.length === 0) {
    noResults.textContent = 'No matching users found.';
    noResults.classList.remove('hidden');
    return;
  }

  matchNotification.textContent = `Found ${data.length} result(s).`;
  matchNotification.classList.remove('hidden');

  data.forEach(person => {
    const card = document.createElement('div');
    card.className = 'user-card';

    const avatar = person.image_url || 'https://via.placeholder.com/80';
    const name = person.name || 'Anonymous User';
    const email = person.email || '';
    const availability = person.availability || 'Unknown';
    const skills = person.skills ? person.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    card.innerHTML = `
      <img src="${avatar}" alt="${name}" class="user-avatar">
      <h3>${name}</h3>
      ${email ? `<p class="email">${email}</p>` : ''}
      <p class="availability">Availability: ${availability}</p>
      <div class="skills-list">
        ${skills.map(skill => `
          <div class="skill-chip">
            <span>${skill}</span>
            <button class="endorse-btn" data-user-id="${person.id}" data-skill="${skill}">+</button>
          </div>`).join('')}
      </div>
      <button class="connect-btn" data-user-id="${person.id}">🤝 Connect</button>
    `;

    // Endorse buttons
    card.querySelectorAll('.endorse-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-user-id');
        const skill = btn.getAttribute('data-skill');
        await endorseSkill(targetId, skill);
      });
    });

    // Connect button
    card.querySelectorAll('.connect-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-user-id');
        await connectToUser(targetId);
      });
    });

    cardContainer.appendChild(card);
  });
}

/* =========================================================
5) Bootstrap
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Main] App Initialized');

  await initAuth();
  initTabs();
  initSynapseView();
  initProfileForm();

  loadLeaderboard();
  await loadSkillSuggestions();
  initSearch();

  initNotifications();
  initNotificationsRealtime();
});
