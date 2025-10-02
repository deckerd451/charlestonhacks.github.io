// assets/js/main.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { loadLeaderboard } from './leaderboard.js';
import { initSynapseView } from './synapse.js';
import { initProfileForm } from './profile.js';

let SKILL_SUGGESTIONS = [];

/* =========================================================
0) Helpers
========================================================= */
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

  const { data: profile } = await supabase
    .from('community')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return profile?.id || null;
}

async function connectToUser(targetId) {
  const me = await getMyProfileId();
  if (!me) return showNotification('Login required.', 'error');
  if (me === targetId) return showNotification('Cannot connect to yourself.', 'error');

  const { error } = await supabase.from('connections').insert({
    from_id: me,
    to_id: targetId,
    status: 'pending',
    context: 'manual'
  });

  if (error) {
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

  // Toggle dropdown visibility
  btn.addEventListener('click', () => dropdown.classList.toggle('hidden'));

  async function loadNotifications() {
    const me = await getMyProfileId();
    if (!me) {
      badge.classList.add('hidden');
      list.textContent = 'Login required';
      return;
    }

    // Fetch pending requests directed to the current user
    const { data, error } = await supabase
      .from('connections')
      .select('id, from_id')
      .eq('to_id', me)
      .eq('status', 'pending');

    if (error || !data?.length) {
      badge.classList.add('hidden');
      list.textContent = 'No new requests';
      return;
    }

    // Update badge count
    badge.textContent = data.length;
    badge.classList.remove('hidden');

    // Fetch names of senders
    const ids = data.map(r => r.from_id);
    const { data: users } = await supabase
      .from('community')
      .select('id, name, email')
      .in('id', ids);

    const names = {};
    users?.forEach(u => {
      names[u.id] = u.name || u.email || `User ${u.id}`;
    });

    // Build dropdown items
    list.innerHTML = '';
    data.forEach(req => {
      const el = document.createElement('div');
      el.className = 'notif-item';
      el.innerHTML = `
        <span>${names[req.from_id] || req.from_id}</span>
        <button class="accept-btn" data-id="${req.id}">Accept</button>
        <button class="decline-btn" data-id="${req.id}">Decline</button>
      `;
      list.appendChild(el);
    });

    // Accept button handler
    list.querySelectorAll('.accept-btn').forEach(btn => {
      btn.onclick = async () => {
        await supabase
          .from('connections')
          .update({ status: 'accepted' })
          .eq('id', btn.dataset.id);

        showNotification('Connection accepted!', 'success');
        loadNotifications();
        loadLeaderboard('connectors');
      };
    });

    // Decline button handler
    list.querySelectorAll('.decline-btn').forEach(btn => {
      btn.onclick = async () => {
        await supabase
          .from('connections')
          .delete()
          .eq('id', btn.dataset.id);

        showNotification('Request declined.', 'info');
        loadNotifications();
      };
    });
  }

  // Initial load + polling
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
4) Bootstrap
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Main] App Initialized');

  await initAuth();
  initTabs();               // Your existing tab switching logic
  initSynapseView();        // Graph canvas
  loadLeaderboard();        // Default skills leaderboard
  await loadSkillSuggestions();
  initSearch();             // Search/autocomplete logic
  initProfileForm();        // Profile onboarding form

  initNotifications();      // Notifications dropdown
  initNotificationsRealtime(); // Realtime sync
});
