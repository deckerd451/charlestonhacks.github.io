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

let neurons = [], connections = [];
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
}

async function logout() {
  await supabase.auth.signOut();
  if (loginStatus) loginStatus.textContent = '';
  showAuthUI(true);
  window.location.reload();
}

async function loadOrCreatePersonalNeurons() {
  if (!userId) {
    console.error("❌ Cannot load neurons — userId is undefined");
    return setAuthStatus("User not authenticated properly.", true);
  }

  const { data, error } = await supabase
    .from('community')
    .select('id, name, skills, interests, availability, endorsements, user_id, x, y')
    .eq('user_id', userId);

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    return setAuthStatus("Supabase error: " + error.message, true);
  }

  console.log("🧠 Neuron fetch result:", data);
  let personalData = data;

  if (data.length === 0) {
    const defaults = DEFAULT_NEURONS.map((n, i) => ({
      ...n,
      user_id: userId,
      x: Math.round(350 + 320 * Math.cos(2 * Math.PI * i / DEFAULT_NEURONS.length)),
      y: Math.round(350 + 220 * Math.sin(2 * Math.PI * i / DEFAULT_NEURONS.length)),
    }));

    const { error: insError } = await supabase.from('community').insert(defaults);
    if (insError) {
      console.error("❌ Supabase insert error:", insError.message);
      return setAuthStatus("Insert failed: " + insError.message, true);
    }

    console.log("✅ Default neurons inserted");

    const { data: reFetched, error: refetchError } = await supabase
      .from('community')
      .select('id, name, skills, interests, availability, endorsements, user_id, x, y')
      .eq('user_id', userId);

    if (refetchError || !reFetched.length) {
      return setAuthStatus("Failed to load inserted neurons.", true);
    }

    personalData = reFetched;
  }

  neurons = personalData.map(u => ({
    x: u.x ?? 0,
    y: u.y ?? 0,
    radius: 18,
    meta: u
  }));
  window.neurons = neurons;
  window.loadOrCreatePersonalNeurons = loadOrCreatePersonalNeurons;

  const connData = await fetchConnections();
  connections = connData.map(({ from_id, to_id }) => {
    const from = neurons.find(n => n.meta.id === from_id);
    const to = neurons.find(n => n.meta.id === to_id);
    return { from, to };
  });

  drawNetwork();
  window.drawNetwork = drawNetwork;

  if (!animationStarted) {
    animationId = requestAnimationFrame(animate);
    animationStarted = true;
  }
}

function drawNeuron(n, t) {
  const pulse = 1 + Math.sin(t / 400 + n.x + n.y) * 0.3;
  const radius = n.radius * pulse;
  const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
  const color = '#0ff';
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill();
  if (showAllNames) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(n.meta.name, n.x, n.y - radius - 10);
  }
}

function drawConnections() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({ from, to }) => {
    if (from && to) {
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
  });
}

function drawNetwork(time = 0) {
  if (!neurons.length) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  neurons.forEach(n => drawNeuron(n, time));
}

function updateTooltip(event) {
  if (!hoverNeuron) {
    tooltip.style.display = 'none';
    return;
  }

  const { name, skills, availability, endorsements } = hoverNeuron.meta;
  tooltip.innerHTML = `
    <strong>${name}</strong><br>
    Skills: ${skills?.join(', ') || 'n/a'}<br>
    Availability: ${availability}<br>
    Endorsements: ${endorsements}
  `;

  const rect = canvas.getBoundingClientRect();
  tooltip.style.left = (event.clientX - rect.left + 12) + 'px';
  tooltip.style.top = (event.clientY - rect.top + 12) + 'px';
  tooltip.style.display = 'block';
}

function animate(time) {
  if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
    drawNetwork(time);
    lastFrame = time;
  }
  animationId = requestAnimationFrame(animate);
}

window.addEventListener('DOMContentLoaded', async () => {
  const sessionData = await supabase.auth.getSession();
  console.log('🔁 Session after refresh:', sessionData);
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

  document.getElementById('login-btn').onclick = async () => {
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
