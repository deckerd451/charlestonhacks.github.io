// neuralInteractive.js
// Personalized neuron network with Supabase auth and skill-based clustering

import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections } from './loadConnections.js';

window.supabase = supabase; // expose globally for console access

const DEFAULT_NEURONS = [
  { name: "You", skills: ["Explorer"], interests: ["AI", "Networks"], availability: "online", endorsements: 3 },
  { name: "Ada", skills: ["Mentor"], interests: ["Math", "Logic"], availability: "offline", endorsements: 11 },
  { name: "Grace", skills: ["Peer"], interests: ["Coding", "Music"], availability: "online", endorsements: 7 },
  { name: "Alan", skills: ["Partner"], interests: ["AI", "Art"], availability: "online", endorsements: 5 },
  { name: "Linus", skills: ["Peer"], interests: ["Open Source"], availability: "offline", endorsements: 2 }
];

let neurons = [], connections = [], selectedNeuron = null;
let canvas, ctx, tooltip, user, userId;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;
let initialized = false;
let animationStarted = false;
let hoverNeuron = null;
let loginStatus = null;

function setAuthStatus(msg, isError = false) {
  const statusEl = document.getElementById('auth-status');
  statusEl.textContent = msg;
  statusEl.className = isError ? 'error' : 'success';
}

function showAuthUI(show) {
  document.getElementById('auth-pane').style.display = show ? '' : 'none';
  const canvas = document.getElementById('neural-canvas');
  canvas.style.display = show ? 'none' : 'block';
  canvas.style.width = '100%';
  canvas.style.height = '800px';
  const tagline = document.getElementById('tagline');
  if (tagline) tagline.style.display = show ? '' : 'none';
}

async function logout() {
  await supabase.auth.signOut();
  if (loginStatus) loginStatus.textContent = '';
  showAuthUI(true);
  window.location.reload();
}

// CLICK TO CONNECT HANDLER
canvas?.addEventListener('click', async (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const clicked = neurons.find(n => Math.hypot(n.x - x, n.y - y) < n.radius);
  if (!clicked) return selectedNeuron = null;

  if (!selectedNeuron) {
    if (!clicked.owned) return;
    selectedNeuron = clicked;
    console.log('🎯 Select source neuron:', clicked.meta.name);
  } else if (clicked !== selectedNeuron) {
    const { error } = await supabase.from('connections').insert({
      from_id: selectedNeuron.meta.id,
      to_id: clicked.meta.id
    });
    if (!error) {
      console.log(`🔗 Connection made: ${selectedNeuron.meta.name} → ${clicked.meta.name}`);
      connections.push({ from: selectedNeuron, to: clicked });
      selectedNeuron = null;
    }
  }
});

// DOMContentLoaded + login handling restored
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 1400;
  canvas.height = 800;
  window.canvas = canvas;
  window.ctx = ctx;

  const loginStatusDiv = document.createElement('div');
  loginStatusDiv.id = 'login-status';
  loginStatusDiv.style.color = '#0ff';
  loginStatusDiv.style.textAlign = 'center';
  loginStatusDiv.style.margin = '10px auto';
  loginStatusDiv.style.fontWeight = 'bold';
  loginStatusDiv.style.fontSize = '16px';
  document.body.insertBefore(loginStatusDiv, document.body.firstChild);
  loginStatus = loginStatusDiv;

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logout-btn';
  logoutBtn.textContent = 'Sign Out';
  logoutBtn.onclick = logout;
  logoutBtn.style.display = 'none';
  document.getElementById('auth-pane').appendChild(logoutBtn);

  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.onclick = async () => {
      const email = document.getElementById('email').value.trim();
      if (!email) return setAuthStatus("Please enter your email.", true);
      setAuthStatus("Sending magic link...");
      const redirectTo = `${window.location.origin}/neural.html?source=neuron`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });
      setAuthStatus(error ? "Error: " + error.message : "Check your email for the login link!", !!error);
    };
  } else {
    console.warn("⚠️ Login button not found in DOM.");
  }

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user && !initialized) {
      initialized = true;
      user = session.user;
      userId = user.id;
      loginStatus.textContent = `Welcome back, ${user.email}`;
      showAuthUI(false);
      logoutBtn.style.display = '';
      await loadOrCreatePersonalNeurons();
    } else if (!session?.user) {
      showAuthUI(true);
      logoutBtn.style.display = 'none';
      loginStatus.textContent = '';
    }
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    user = session.user;
    userId = user.id;

    if (!initialized) {
      initialized = true;
      loginStatus.textContent = `Welcome back, ${user.email}`;
      showAuthUI(false);
      document.getElementById('logout-btn').style.display = '';
    }
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
