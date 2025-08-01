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

async function loadOrCreatePersonalNeurons() {
  if (!userId) {
    console.error("❌ Cannot load neurons — userId is undefined");
    return setAuthStatus("User not authenticated properly.", true);
  }

  const { data: allNeurons, error } = await supabase
    .from('community')
    .select('id, name, skills, interests, availability, endorsements, user_id, x, y');

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    return setAuthStatus("Supabase error: " + error.message, true);
  }

  const personalNeurons = allNeurons.filter(n => n.user_id === userId);
  const externalNeurons = allNeurons.filter(n => n.user_id !== userId);

  if (personalNeurons.length === 0) {
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

    personalNeurons.push(...reFetched);
  }

  neurons = [
    ...personalNeurons.map(u => ({ x: u.x ?? 0, y: u.y ?? 0, radius: 18, meta: u, owned: true })),
    ...externalNeurons.map(u => ({ x: u.x ?? 0, y: u.y ?? 0, radius: 18, meta: u, owned: false }))
  ];

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
  const color = n.owned ? '#0ff' : 'rgba(0,255,255,0.2)';
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x, n.y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(n.x, n.y, 5, 0, Math.PI * 2); ctx.fill();
  if (showAllNames) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = color;
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
