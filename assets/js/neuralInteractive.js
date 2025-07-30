// neuralInteractive.js
// Personalized neuron network with per-user persistent positions using Supabase Auth

import { supabaseClient as supabase } from './supabaseClient.js';

// ✅ Do NOT expose supabase globally unless debugging in console
// window.supabase = supabase; // ⛔️ Commented to prevent multiple auth triggers

const DEFAULT_NEURONS = [
  { id: 'n1', name: "You", role: "Explorer", interests: ["AI", "Networks"], availability: "online", endorsements: 3 },
  { id: 'n2', name: "Ada", role: "Mentor", interests: ["Math", "Logic"], availability: "offline", endorsements: 11 },
  { id: 'n3', name: "Grace", role: "Peer", interests: ["Coding", "Music"], availability: "online", endorsements: 7 },
  { id: 'n4', name: "Alan", role: "Partner", interests: ["AI", "Art"], availability: "online", endorsements: 5 },
  { id: 'n5', name: "Linus", role: "Peer", interests: ["Open Source"], availability: "offline", endorsements: 2 }
];

let neurons = [], connections = [];
let canvas, ctx, tooltip, user, userId;
let draggingNeuronDesktop = null, draggingNeuronTouch = null, selectedNeuron = null;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;

async function showAuthUI(show) {
  document.getElementById('auth-pane').style.display = show ? '' : 'none';
  document.getElementById('neural-canvas').style.display = show ? 'none' : '';
}

async function checkAuthAndInit() {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  user = currentUser;
  userId = user?.id;
  if (!user) return showAuthUI(true);
  showAuthUI(false);
  await loadOrCreatePersonalNeurons();
}

document.getElementById('login-btn').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  if (!email) return setAuthStatus("Please enter your email.");
  setAuthStatus("Sending magic link...");
  const { error } = await supabase.auth.signInWithOtp({ email });
  setAuthStatus(error ? "Error: " + error.message : "Check your email for the login link!");
};

function setAuthStatus(msg) {
  document.getElementById('auth-status').textContent = msg;
}

async function logout() {
  await supabase.auth.signOut();
  showAuthUI(true);
  window.location.reload();
}

async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase.from('community').select('*').eq('user_id', userId);
  if (error) return setAuthStatus("Failed to fetch your neuron data.");

  let personalData = data;
  if (data.length === 0) {
    const defaults = DEFAULT_NEURONS.map((n, i) => ({
      ...n,
      user_id: userId,
      x: 350 + 320 * Math.cos(2 * Math.PI * i / DEFAULT_NEURONS.length),
      y: 350 + 220 * Math.sin(2 * Math.PI * i / DEFAULT_NEURONS.length),
    }));
    const { error: insError } = await supabase.from('community').insert(defaults);
    if (insError) return setAuthStatus("Failed to create your neuron data.");
    personalData = defaults;
  }

  neurons = clusteredLayout(personalData, canvas.width, canvas.height);
  window.neurons = neurons;
  drawNetwork();
}

function clusteredLayout(users, canvasW, canvasH) {
  const groupBy = u => u.role || (u.interests?.[0] || 'unknown');
  const groups = {};
  users.forEach(u => (groups[groupBy(u)] = groups[groupBy(u)] || []).push(u));
  const keys = Object.keys(groups), result = [];
  const centerX = canvasW / 2, centerY = canvasH / 2, clusterRadius = 220;

  keys.forEach((key, i) => {
    const angle = (2 * Math.PI * i) / keys.length;
    const cx = centerX + clusterRadius * Math.cos(angle);
    const cy = centerY + clusterRadius * Math.sin(angle);
    groups[key].forEach((u, j) => {
      const offset = (2 * Math.PI * j) / groups[key].length;
      const spread = 50 + Math.floor(j / 3) * 20;
      const x = u.x ?? cx + spread * Math.cos(offset);
      const y = u.y ?? cy + spread * Math.sin(offset);
      result.push({ x: +x, y: +y, radius: 18, meta: u });
    });
  });
  return result;
}

function drawNeuron(n, t) {
  const pulse = 1 + Math.sin(t / 400 + n.x + n.y) * 0.3;
  const radius = n.radius * pulse;
  const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius);
  const color = n === selectedNeuron ? '#fff' : '#0ff';
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

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 1400;
  canvas.height = 800;
  animate();

  const logoutBtn = document.createElement('button');
  logoutBtn.id = 'logout-btn';
  logoutBtn.textContent = 'Sign Out';
  logoutBtn.onclick = logout;
  logoutBtn.style.display = 'none';
  document.getElementById('auth-pane').appendChild(logoutBtn);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      showAuthUI(false);
      logoutBtn.style.display = '';
      await loadOrCreatePersonalNeurons();
    } else {
      showAuthUI(true);
      logoutBtn.style.display = 'none';
    }
  });

  await checkAuthAndInit();
});
