// neuralInteractive.js
// Personalized neuron network with per-user persistent positions using Supabase Auth

// ---- CONFIG ----
import { supabaseClient as supabase } from './supabaseClient.js';

window.supabase = supabase; // Add this line to expose supabase for debugging

// ---- NEURON "TEMPLATE" ----
// These are the default neurons for a brand new user.
// You can edit/add more as you like.
const DEFAULT_NEURONS = [
  { id: 'n1', name: "You", role: "Explorer", interests: ["AI", "Networks"], availability: "online", endorsements: 3 },
  { id: 'n2', name: "Ada", role: "Mentor", interests: ["Math", "Logic"], availability: "offline", endorsements: 11 },
  { id: 'n3', name: "Grace", role: "Peer", interests: ["Coding", "Music"], availability: "online", endorsements: 7 },
  { id: 'n4', name: "Alan", role: "Partner", interests: ["AI", "Art"], availability: "online", endorsements: 5 },
  { id: 'n5', name: "Linus", role: "Peer", interests: ["Open Source"], availability: "offline", endorsements: 2 }
];

// ---- GLOBALS ----
let neurons = [], connections = [];
let canvas, ctx, tooltip, user, userId;
let draggingNeuronDesktop = null, draggingNeuronTouch = null, selectedNeuron = null;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;

// ---- AUTH LOGIC ----

async function showAuthUI(show) {
  document.getElementById('auth-pane').style.display = show ? '' : 'none';
  document.getElementById('neural-canvas').style.display = show ? 'none' : '';
}

async function checkAuthAndInit() {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  user = currentUser;
  userId = user?.id;
  if (!user) {
    showAuthUI(true);
    return;
  }
  showAuthUI(false);
  await loadOrCreatePersonalNeurons();
}

async function signInWithEmail() {
  const email = document.getElementById('email').value.trim();
  if (!email) {
    setAuthStatus("Please enter your email.");
    return;
  }
  setAuthStatus("Sending magic link...");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) setAuthStatus("Error: " + error.message);
  else setAuthStatus("Check your email for the login link!");
}

function setAuthStatus(msg) {
  document.getElementById('auth-status').textContent = msg;
}

async function logout() {
  await supabase.auth.signOut();
  showAuthUI(true);
  window.location.reload();
}

document.getElementById('login-btn').onclick = signInWithEmail;

// ---- NEURON DATA: LOAD OR CREATE ----

async function loadOrCreatePersonalNeurons() {
  // Try to fetch this user's neurons
  const { data, error } = await supabase
    .from('community')
    .select('*')
    .eq('user_id', userId);

  let personalData;
  if (error) {
    setAuthStatus("Failed to fetch your neuron data.");
    return;
  }
  if (data.length === 0) {
    // First login: create default neurons for this user
    let defaults = DEFAULT_NEURONS.map((n, i) => ({
      ...n,
      user_id: userId,
      x: 350 + 320 * Math.cos(2 * Math.PI * i / DEFAULT_NEURONS.length),
      y: 350 + 220 * Math.sin(2 * Math.PI * i / DEFAULT_NEURONS.length),
    }));
    const { error: insError } = await supabase.from('community').insert(defaults);
    if (insError) {
      setAuthStatus("Failed to create your neuron data.");
      return;
    }
    personalData = defaults;
  } else {
    personalData = data;
  }

  // Render
  neurons = clusteredLayout(personalData, canvas.width, canvas.height);
  window.neurons = neurons;
  window.communityData = personalData;
  drawNetwork();
}

// ---- CANVAS UI ----

function showTooltip(event, neuron) {
  const { name, role, interests, availability, endorsements } = neuron.meta;
  tooltip.innerHTML = `
    <strong>${name}</strong><br>
    ${role || ''}<br>
    ${interests ? interests.join(' • ') : ''}<br>
    ${availability ? `✅ ${availability}` : ''}<br>
    ${endorsements ? `🧠 ${endorsements} connections` : ''}
  `;
  tooltip.classList.remove('hidden');
  tooltip.classList.add('visible');
  tooltip.style.left = `${event.pageX + 20}px`;
  tooltip.style.top = `${event.pageY + 20}px`;
}

function clusteredLayout(users, canvasW, canvasH) {
  const groupBy = user => user.role || (user.interests?.[0] || 'unknown');
  const groups = {};
  for (const user of users) {
    const key = groupBy(user);
    if (!groups[key]) groups[key] = [];
    groups[key].push(user);
  }
  const keys = Object.keys(groups);
  const clusterRadius = 220;
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  let result = [];
  keys.forEach((key, i) => {
    const angle = (2 * Math.PI * i) / keys.length;
    const cx = centerX + clusterRadius * Math.cos(angle);
    const cy = centerY + clusterRadius * Math.sin(angle);
    const group = groups[key];
    group.forEach((user, j) => {
      const offsetAngle = (2 * Math.PI * j) / group.length;
      const spread = 50 + Math.floor(j / 3) * 20;
      const hasX = user.x != null && !isNaN(Number(user.x));
      const hasY = user.y != null && !isNaN(Number(user.y));
      const x = hasX ? Number(user.x) : cx + spread * Math.cos(offsetAngle);
      const y = hasY ? Number(user.y) : cy + spread * Math.sin(offsetAngle);
      result.push({ x, y, radius: 18, meta: user });
    });
  });
  return result;
}

function drawNeuron(neuron, time) {
  const pulse = 1 + Math.sin(time / 400 + neuron.x + neuron.y) * 0.3;
  const radius = neuron.radius * pulse;
  const color = (neuron === selectedNeuron) ? '#fff' : '#0ff';
  const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (showAllNames) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(neuron.meta.name, neuron.x, neuron.y - radius - 10);
  }
}

function drawConnections() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({ from, to }) => {
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  });
}

function drawNetwork(time = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  neurons.forEach(neuron => drawNeuron(neuron, time));
}

function animate(time) {
  try {
    if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
      drawNetwork(time);
      lastFrame = time;
    }
    animationId = requestAnimationFrame(animate);
  } catch (err) {
    console.error('🧨 Animation error:', err);
  }
}

function showToast(message) {
  let toast = document.getElementById('toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#222;color:#0ff;padding:8px 14px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity 0.3s ease;opacity:0;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 1500);
}

// ---- DRAG HANDLERS ----

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  for (const neuron of neurons) {
    if (Math.hypot(neuron.x - x, neuron.y - y) < 22) {
      draggingNeuronDesktop = neuron;
      break;
    }
  }
}

function handleMouseMove(e) {
  if (!draggingNeuronDesktop) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  draggingNeuronDesktop.x = x;
  draggingNeuronDesktop.y = y;
  drawNetwork();
}

async function handleMouseUp() {
  if (!draggingNeuronDesktop) return;
  const id = draggingNeuronDesktop.meta.id;
  const x = draggingNeuronDesktop.x, y = draggingNeuronDesktop.y;
  const { error } = await supabase.from('community').update({ x, y })
    .eq('id', id).eq('user_id', userId);
  if (!error) {
    showToast('💾 Position saved');
    draggingNeuronDesktop.meta.x = x;
    draggingNeuronDesktop.meta.y = y;
  }
  else {
    showToast('❌ Failed to save position');
    console.error(error.message);
  }
  draggingNeuronDesktop = null;
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;
  draggingNeuronTouch = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 22);
}
function handleTouchMove(e) {
  if (!draggingNeuronTouch) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;
  draggingNeuronTouch.x = x;
  draggingNeuronTouch.y = y;
  drawNetwork();
}
async function handleTouchEnd() {
  if (!draggingNeuronTouch) return;
  const id = draggingNeuronTouch.meta.id;
  const x = draggingNeuronTouch.x, y = draggingNeuronTouch.y;
  const { error } = await supabase.from('community').update({ x, y })
    .eq('id', id).eq('user_id', userId);
  if (!error) {
    showToast('💾 Position saved');
    draggingNeuronTouch.meta.x = x;
    draggingNeuronTouch.meta.y = y;
  }
  else {
    showToast('❌ Failed to save position');
    console.error(error.message);
  }
  draggingNeuronTouch = null;
}

// ---- TOOLTIP & SELECTION ----

function handleCanvasMouseMoveTooltip(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const hoveredNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 22);
  if (hoveredNeuron) {
    showTooltip(e, hoveredNeuron);
  } else {
    tooltip.classList.add('hidden');
  }
}
function handleCanvasMouseLeaveTooltip() {
  tooltip.classList.add('hidden');
}
function handleCanvasClickSelect(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const clickedNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 22);
  selectedNeuron = clickedNeuron || null;
  drawNetwork();
}

// ---- INIT ----

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 1400;
  canvas.height = 800;
  animate();

  // Add logout button after login
  const authPane = document.getElementById('auth-pane');
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = "Sign Out";
  logoutBtn.id = "logout-btn";
  logoutBtn.onclick = logout;
  logoutBtn.style.display = "none";
  authPane.appendChild(logoutBtn);

  // Monitor auth state
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      showAuthUI(false);
      logoutBtn.style.display = "";
      await loadOrCreatePersonalNeurons();
    } else {
      showAuthUI(true);
      logoutBtn.style.display = "none";
    }
  });

  await checkAuthAndInit();

  // Register drag & drop handlers (desktop)
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Register drag & drop handlers (mobile)
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);

  // Register tooltip & selection handlers
  canvas.addEventListener('mousemove', handleCanvasMouseMoveTooltip);
  canvas.addEventListener('mouseleave', handleCanvasMouseLeaveTooltip);
  canvas.addEventListener('click', handleCanvasClickSelect);
});
// neuralInteractive.js
// Personalized neuron network with per-user persistent positions using Supabase Auth

window.supabase = supabase; // Add this line to expose supabase for debugging

// ---- NEURON "TEMPLATE" ----
// These are the default neurons for a brand new user.
// You can edit/add more as you like.
const DEFAULT_NEURONS = [
  { id: 'n1', name: "You", role: "Explorer", interests: ["AI", "Networks"], availability: "online", endorsements: 3 },
  { id: 'n2', name: "Ada", role: "Mentor", interests: ["Math", "Logic"], availability: "offline", endorsements: 11 },
  { id: 'n3', name: "Grace", role: "Peer", interests: ["Coding", "Music"], availability: "online", endorsements: 7 },
  { id: 'n4', name: "Alan", role: "Partner", interests: ["AI", "Art"], availability: "online", endorsements: 5 },
  { id: 'n5', name: "Linus", role: "Peer", interests: ["Open Source"], availability: "offline", endorsements: 2 }
];

// ---- GLOBALS ----
let neurons = [], connections = [];
let canvas, ctx, tooltip, user, userId;
let draggingNeuronDesktop = null, draggingNeuronTouch = null, selectedNeuron = null;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;

// ---- AUTH LOGIC ----

async function showAuthUI(show) {
  document.getElementById('auth-pane').style.display = show ? '' : 'none';
  document.getElementById('neural-canvas').style.display = show ? 'none' : '';
}

async function checkAuthAndInit() {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  user = currentUser;
  userId = user?.id;
  if (!user) {
    showAuthUI(true);
    return;
  }
  showAuthUI(false);
  await loadOrCreatePersonalNeurons();
}

async function signInWithEmail() {
  const email = document.getElementById('email').value.trim();
  if (!email) {
    setAuthStatus("Please enter your email.");
    return;
  }
  setAuthStatus("Sending magic link...");
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) setAuthStatus("Error: " + error.message);
  else setAuthStatus("Check your email for the login link!");
}

function setAuthStatus(msg) {
  document.getElementById('auth-status').textContent = msg;
}

async function logout() {
  await supabase.auth.signOut();
  showAuthUI(true);
  window.location.reload();
}

document.getElementById('login-btn').onclick = signInWithEmail;

// ---- NEURON DATA: LOAD OR CREATE ----

async function loadOrCreatePersonalNeurons() {
  // Try to fetch this user's neurons
  const { data, error } = await supabase
    .from('community')
    .select('*')
    .eq('user_id', userId);

  let personalData;
  if (error) {
    setAuthStatus("Failed to fetch your neuron data.");
    return;
  }
  if (data.length === 0) {
    // First login: create default neurons for this user
    let defaults = DEFAULT_NEURONS.map((n, i) => ({
      ...n,
      user_id: userId,
      x: 350 + 320 * Math.cos(2 * Math.PI * i / DEFAULT_NEURONS.length),
      y: 350 + 220 * Math.sin(2 * Math.PI * i / DEFAULT_NEURONS.length),
    }));
    const { error: insError } = await supabase.from('community').insert(defaults);
    if (insError) {
      setAuthStatus("Failed to create your neuron data.");
      return;
    }
    personalData = defaults;
  } else {
    personalData = data;
  }

  // Render
  neurons = clusteredLayout(personalData, canvas.width, canvas.height);
  window.neurons = neurons;
  window.communityData = personalData;
  drawNetwork();
}

// ---- CANVAS UI ----

function showTooltip(event, neuron) {
  const { name, role, interests, availability, endorsements } = neuron.meta;
  tooltip.innerHTML = `
    <strong>${name}</strong><br>
    ${role || ''}<br>
    ${interests ? interests.join(' • ') : ''}<br>
    ${availability ? `✅ ${availability}` : ''}<br>
    ${endorsements ? `🧠 ${endorsements} connections` : ''}
  `;
  tooltip.classList.remove('hidden');
  tooltip.classList.add('visible');
  tooltip.style.left = `${event.pageX + 20}px`;
  tooltip.style.top = `${event.pageY + 20}px`;
}

function clusteredLayout(users, canvasW, canvasH) {
  const groupBy = user => user.role || (user.interests?.[0] || 'unknown');
  const groups = {};
  for (const user of users) {
    const key = groupBy(user);
    if (!groups[key]) groups[key] = [];
    groups[key].push(user);
  }
  const keys = Object.keys(groups);
  const clusterRadius = 220;
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  let result = [];
  keys.forEach((key, i) => {
    const angle = (2 * Math.PI * i) / keys.length;
    const cx = centerX + clusterRadius * Math.cos(angle);
    const cy = centerY + clusterRadius * Math.sin(angle);
    const group = groups[key];
    group.forEach((user, j) => {
      const offsetAngle = (2 * Math.PI * j) / group.length;
      const spread = 50 + Math.floor(j / 3) * 20;
      const hasX = user.x != null && !isNaN(Number(user.x));
      const hasY = user.y != null && !isNaN(Number(user.y));
      const x = hasX ? Number(user.x) : cx + spread * Math.cos(offsetAngle);
      const y = hasY ? Number(user.y) : cy + spread * Math.sin(offsetAngle);
      result.push({ x, y, radius: 18, meta: user });
    });
  });
  return result;
}

function drawNeuron(neuron, time) {
  const pulse = 1 + Math.sin(time / 400 + neuron.x + neuron.y) * 0.3;
  const radius = neuron.radius * pulse;
  const color = (neuron === selectedNeuron) ? '#fff' : '#0ff';
  const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (showAllNames) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(neuron.meta.name, neuron.x, neuron.y - radius - 10);
  }
}

function drawConnections() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({ from, to }) => {
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  });
}

function drawNetwork(time = 0) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  neurons.forEach(neuron => drawNeuron(neuron, time));
}

function animate(time) {
  try {
    if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
      drawNetwork(time);
      lastFrame = time;
    }
    animationId = requestAnimationFrame(animate);
  } catch (err) {
    console.error('🧨 Animation error:', err);
  }
}

function showToast(message) {
  let toast = document.getElementById('toast-message');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#222;color:#0ff;padding:8px 14px;border-radius:8px;font-size:14px;z-index:9999;transition:opacity 0.3s ease;opacity:0;';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._hideTimeout);
  toast._hideTimeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 1500);
}

// ---- DRAG HANDLERS ----

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  for (const neuron of neurons) {
    if (Math.hypot(neuron.x - x, neuron.y - y) < 22) {
      draggingNeuronDesktop = neuron;
      break;
    }
  }
}

function handleMouseMove(e) {
  if (!draggingNeuronDesktop) return;
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  draggingNeuronDesktop.x = x;
  draggingNeuronDesktop.y = y;
  drawNetwork();
}

async function handleMouseUp() {
  if (!draggingNeuronDesktop) return;
  const id = draggingNeuronDesktop.meta.id;
  const x = draggingNeuronDesktop.x, y = draggingNeuronDesktop.y;
  const { error } = await supabase.from('community').update({ x, y })
    .eq('id', id).eq('user_id', userId);
  if (!error) {
    showToast('💾 Position saved');
    draggingNeuronDesktop.meta.x = x;
    draggingNeuronDesktop.meta.y = y;
  }
  else {
    showToast('❌ Failed to save position');
    console.error(error.message);
  }
  draggingNeuronDesktop = null;
}

function handleTouchStart(e) {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;
  draggingNeuronTouch = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 22);
}
function handleTouchMove(e) {
  if (!draggingNeuronTouch) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;
  draggingNeuronTouch.x = x;
  draggingNeuronTouch.y = y;
  drawNetwork();
}
async function handleTouchEnd() {
  if (!draggingNeuronTouch) return;
  const id = draggingNeuronTouch.meta.id;
  const x = draggingNeuronTouch.x, y = draggingNeuronTouch.y;
  const { error } = await supabase.from('community').update({ x, y })
    .eq('id', id).eq('user_id', userId);
  if (!error) {
    showToast('💾 Position saved');
    draggingNeuronTouch.meta.x = x;
    draggingNeuronTouch.meta.y = y;
  }
  else {
    showToast('❌ Failed to save position');
    console.error(error.message);
  }
  draggingNeuronTouch = null;
}

// ---- TOOLTIP & SELECTION ----

function handleCanvasMouseMoveTooltip(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const hoveredNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 22);
  if (hoveredNeuron) {
    showTooltip(e, hoveredNeuron);
  } else {
    tooltip.classList.add('hidden');
  }
}
function handleCanvasMouseLeaveTooltip() {
  tooltip.classList.add('hidden');
}
function handleCanvasClickSelect(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  const clickedNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 22);
  selectedNeuron = clickedNeuron || null;
  drawNetwork();
}

// ---- INIT ----

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 1400;
  canvas.height = 800;
  animate();

  // Add logout button after login
  const authPane = document.getElementById('auth-pane');
  const logoutBtn = document.createElement('button');
  logoutBtn.textContent = "Sign Out";
  logoutBtn.id = "logout-btn";
  logoutBtn.onclick = logout;
  logoutBtn.style.display = "none";
  authPane.appendChild(logoutBtn);

  // Monitor auth state
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      showAuthUI(false);
      logoutBtn.style.display = "";
      await loadOrCreatePersonalNeurons();
    } else {
      showAuthUI(true);
      logoutBtn.style.display = "none";
    }
  });

  await checkAuthAndInit();

  // Register drag & drop handlers (desktop)
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  // Register drag & drop handlers (mobile)
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);

  // Register tooltip & selection handlers
  canvas.addEventListener('mousemove', handleCanvasMouseMoveTooltip);
  canvas.addEventListener('mouseleave', handleCanvasMouseLeaveTooltip);
  canvas.addEventListener('click', handleCanvasClickSelect);
});

}

// ✅ Correct, final version
export function loadNeuralMap(userParam) {
  user = userParam;
  userId = user?.id;
  console.log('🧠 Initializing neural map for:', user.email);
  loadOrCreatePersonalNeurons();
}

window.loadNeuralMap = loadNeuralMap;




