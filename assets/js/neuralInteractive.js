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

  // ⚡ Use saved x/y positions first, fallback to clustered layout
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

function clusteredLayout(users, canvasW, canvasH) {
  const groupBy = u => u.skills?.[0] || u.availability || 'misc';
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

  tooltip.style.left = event.pageX + 12 + 'px';
  tooltip.style.top = event.pageY + 12 + 'px';
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
  let dragging = null;
  let offsetX = 0, offsetY = 0;
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging) {
      dragging.x = x - offsetX;
      dragging.y = y - offsetY;
      drawNetwork(performance.now());
      return;
    }
    if (!neurons.length) return;
    hoverNeuron = neurons.find(n => {
      const dx = x - n.x;
      const dy = y - n.y;
      return dx * dx + dy * dy < n.radius * n.radius;
    });
    updateTooltip(e);
  });

  canvas.addEventListener('mouseup', async () => {
    if (dragging && dragging.meta?.id) {
      const { id } = dragging.meta;
      const { x, y } = dragging;
      const { error } = await supabase.from('community')
        .update({ x: Math.round(x), y: Math.round(y) })
        .eq('id', id);
      if (error) console.error('❌ Position save error:', error.message);
      else console.log('💾 Position saved for', id);
    }
    dragging = null;
  });

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const target = neurons.find(n => {
      const dx = x - n.x;
      const dy = y - n.y;
      return dx * dx + dy * dy < n.radius * n.radius;
    });
    if (target) {
      dragging = target;
      offsetX = x - target.x;
      offsetY = y - target.y;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    hoverNeuron = null;
    tooltip.style.display = 'none';
  });
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 1400;
  canvas.height = 800;
  window.canvas = canvas;
  window.ctx = ctx;

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
      showAuthUI(false);
      logoutBtn.style.display = '';
      await loadOrCreatePersonalNeurons();
    } else if (!session?.user) {
      showAuthUI(true);
      logoutBtn.style.display = 'none';
    }
  });

  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    user = session.user;
    userId = user.id;

    if (!initialized) {
      initialized = true;
      showAuthUI(false);
      document.getElementById('logout-btn').style.display = '';
    }

    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
