// neuralInteractive.js
// Personalized neuron network with Supabase auth and grid‐based layout

import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections } from './loadConnections.js';

window.supabase = supabase; // expose globally for console access

const DEFAULT_NEURONS = [
  { name: "You",   skills: ["Explorer"], interests: ["AI", "Networks"], availability: "online",  endorsements: 3 },
  { name: "Ada",   skills: ["Mentor"],   interests: ["Math", "Logic"],   availability: "offline", endorsements: 11 },
  { name: "Grace", skills: ["Peer"],     interests: ["Coding", "Music"], availability: "online",  endorsements: 7 },
  { name: "Alan",  skills: ["Partner"],  interests: ["AI", "Art"],      availability: "online",  endorsements: 5 },
  { name: "Linus", skills: ["Peer"],     interests: ["Open Source"],    availability: "offline", endorsements: 2 }
];

let neurons = [], connections = [], selectedNeuron = null;
let canvas, ctx, tooltip, user, userId;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;
let initialized = false;
let animationStarted = false;
let loginStatus = null;

function setAuthStatus(msg, isError = false) {
  const statusEl = document.getElementById('auth-status');
  statusEl.textContent = msg;
  statusEl.className = isError ? 'error' : 'success';
}

function showAuthUI(show) {
  document.getElementById('auth-pane').style.display = show ? '' : 'none';
  const canvasEl = document.getElementById('neural-canvas');
  canvasEl.style.display = show ? 'none' : 'block';
  // we no longer hardcode height here
}

async function logout() {
  await supabase.auth.signOut();
  if (loginStatus) loginStatus.textContent = '';
  showAuthUI(true);
  window.location.reload();
}

async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase
    .from('community')
    .select('*');

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    return setAuthStatus("Supabase error: " + error.message, true);
  }

  const myNeurons    = data.filter(n => n.user_id === userId);
  const otherNeurons = data.filter(n => n.user_id !== userId);

  if (myNeurons.length === 0) {
    const defaults = DEFAULT_NEURONS.map((n, i) => ({
      ...n,
      user_id: userId,
      // remove radial defaults—grid will handle placement
      x: 0,
      y: 0
    }));
    const { error: insertError } = await supabase.from('community').insert(defaults);
    if (insertError) {
      console.error("❌ Supabase insert error:", insertError.message);
      return setAuthStatus("Insert failed: " + insertError.message, true);
    }
    return loadOrCreatePersonalNeurons();
  }

  const combined = [
    ...myNeurons   .map(n => ({ ...n, owned: true  })),
    ...otherNeurons.map(n => ({ ...n, owned: false }))
  ];

  // ** GRID LAYOUT **
  neurons = arrangeNeuronsInGrid(combined);
  window.neurons = neurons;

  const connData = await fetchConnections();
  connections = connData.map(({ from_id, to_id }) => {
    const from = neurons.find(n => n.meta.id === from_id);
    const to   = neurons.find(n => n.meta.id === to_id);
    return { from, to };
  });

  drawNetwork();
  window.drawNetwork = drawNetwork;

  if (!animationStarted) {
    animationId = requestAnimationFrame(animate);
    animationStarted = true;
  }
}

// ** GRID ARRANGEMENT HELPER **
function arrangeNeuronsInGrid(users) {
  const count = users.length;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);
  const spacingX = canvas.width  / (cols + 1);
  const spacingY = canvas.height / (rows + 1);

  return users.map((u, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = spacingX * (col + 1);
    const y = spacingY * (row + 1);
    return { x, y, radius: 18, meta: u, owned: u.owned };
  });
}

function drawNeuron(n, t) {
  const pulse = 1 + Math.sin(t / 400 + n.x + n.y) * 0.3;
  const radius = n.radius * pulse;
  const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
  const color = n.owned ? '#0ff' : 'rgba(255,255,255,0.3)';
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
    ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
    ctx.arc(n.x, n.y, 5, 0, Math.PI * 2);
  ctx.fill();
  if (showAllNames) {
    ctx.font      = '15px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(n.meta.name, n.x, n.y - radius - 10);
  }
}

function drawConnections() {
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({ from, to }) => {
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x,   to.y);
      ctx.stroke();
    }
  });
}

function drawNetwork(time = 0) {
  if (!neurons.length) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  neurons.forEach(n => drawNeuron(n, time));
}

function animate(time) {
  if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
    drawNetwork(time);
    lastFrame = time;
  }
  animationId = requestAnimationFrame(animate);
}

// DOMContentLoaded + login handling restored
window.addEventListener('DOMContentLoaded', async () => {
  // ** CANVAS SETUP + RESIZING **
  canvas = document.getElementById('neural-canvas');
  ctx    = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');

  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  window.canvas = canvas;
  window.ctx    = ctx;

  // ** LOGIN STATUS NODE **
  const loginStatusDiv = document.createElement('div');
  loginStatusDiv.id             = 'login-status';
  loginStatusDiv.style.color     = '#0ff';
  loginStatusDiv.style.textAlign = 'center';
  loginStatusDiv.style.margin    = '10px auto';
  loginStatusDiv.style.fontWeight= 'bold';
  loginStatusDiv.style.fontSize  = '16px';
  document.body.insertBefore(loginStatusDiv, document.body.firstChild);
  loginStatus = loginStatusDiv;

  // ** LOGOUT BUTTON **
  const logoutBtn = document.createElement('button');
  logoutBtn.id        = 'logout-btn';
  logoutBtn.textContent = 'Sign Out';
  logoutBtn.onclick   = logout;
  logoutBtn.style.display = 'none';
  document.getElementById('auth-pane').appendChild(logoutBtn);

  // ** LOGIN BUTTON HANDLER **
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

  // ** CANVAS CLICK -> CONNECTION MAKING **
  canvas.addEventListener('click', async (e) => {
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
        to_id:   clicked.meta.id
      });
      if (!error) {
        console.log(`🔗 Connection made: ${selectedNeuron.meta.name} → ${clicked.meta.name}`);
        connections.push({ from: selectedNeuron, to: clicked });
        selectedNeuron = null;
      }
    }
  });

  // ** AUTH STATE OBSERVER **
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user && !initialized) {
      initialized = true;
      user        = session.user;
      userId      = user.id;
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

  // ** RESTORE SESSION IF PRESENT **
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    user   = session.user;
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
