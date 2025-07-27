// neuralInteractive.js — Fully Scaled to All Users, Optimized and Stable
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // shortened for clarity
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let sessionHandled = false;
let neurons = [], connections = [], canvas, ctx, tooltip;
let selectedNeuron = null, CURRENT_USER_ID = null;
let animationId = null;
let lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;

window.addEventListener('DOMContentLoaded', async () => {
  // ✅ SESSION RESTORE
  if (!sessionHandled) {
    sessionHandled = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) console.log('🔁 Session active');
    } catch (err) {
      console.error('⚠️ Session restore failed:', err);
    }
  }

  // ✅ INIT CANVAS + TOOLTIP
  canvas = document.getElementById('neural-interactive');
  ctx = canvas?.getContext('2d');
  tooltip = document.getElementById('neuron-tooltip');
  if (!canvas || !ctx || !tooltip) {
    console.error('❌ Missing canvas or tooltip in DOM');
    return;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ✅ LOAD NEURONS — ALL USERS
  const { data: communityData, error: communityError } = await supabase.from('community').select('*');
  if (communityError) {
    console.error('❌ Failed to load community:', communityError);
    return;
  }

  neurons = communityData
    .filter(user => typeof user.x === 'number' && typeof user.y === 'number')
    .map(user => ({ x: user.x, y: user.y, meta: user }));
  console.log('✅ Loaded neurons:', neurons.length);

  // ✅ BUILD LOOKUP MAP
  const neuronMap = {};
  for (const neuron of neurons) {
    neuronMap[String(neuron.meta.id).trim()] = neuron;
  }

  // ✅ AUTH STATUS
  const { data: userData } = await supabase.auth.getUser();
  const authStatusEl = document.getElementById('auth-status');
  if (userData?.user?.id) {
    CURRENT_USER_ID = userData.user.id;
    authStatusEl.textContent = '🟢 Connected as: ' + userData.user.email;
    authStatusEl.style.color = '#0f0';
  } else {
    authStatusEl.textContent = '🔴 Not Logged In';
    authStatusEl.style.color = '#f00';
  }

  // ✅ LOAD CONNECTIONS
  const { data: connData, error: connError } = await supabase.from('connections').select('*');
  if (connError) {
    console.error('❌ Failed to load connections:', connError);
    return;
  }

  connections = connData.map(conn => {
    const from = neuronMap[String(conn.from_id).trim()];
    const to = neuronMap[String(conn.to_id).trim()];
    return from && to ? { from, to } : null;
  }).filter(Boolean);

  // ✅ TOOLTIP EVENTS
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let found = false;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 10) {
        showTooltip(neuron, e.clientX, e.clientY);
        found = true;
        break;
      }
    }
    if (!found) hideTooltip();
  });

  canvas.addEventListener('touchstart', e => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 10) {
        showTooltip(neuron, touch.clientX, touch.clientY);
        return;
      }
    }
    hideTooltip();
  });

  canvas.addEventListener('touchend', () => setTimeout(hideTooltip, 1000));

  // ✅ CLICK-TO-CONNECT
  canvas.addEventListener('click', e => {
    if (!CURRENT_USER_ID) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 10) {
        if (!selectedNeuron) {
          selectedNeuron = neuron;
          console.log(`🔵 Selected ${neuron.meta.name}`);
        } else {
          if (selectedNeuron.meta.id !== neuron.meta.id) {
            createConnection(CURRENT_USER_ID, neuron.meta.id);
          }
          selectedNeuron = null;
        }
        return;
      }
    }
  });

  animationId = requestAnimationFrame(animate);
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawNeuron(neuron, time) {
  const pulse = 1 + Math.sin(time / 400 + neuron.x + neuron.y) * 0.4;
  const radius = 8 * pulse;
  const color = '#0ff';

  const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, radius);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawConnections() {
  if (!connections.length) return;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.2)';
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(0,255,255,0.6)';
  ctx.textAlign = 'center';

  connections.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    ctx.fillText(`${from.meta.name} ↔ ${to.meta.name}`, midX, midY - 6);
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(animationId);
  } else {
    animationId = requestAnimationFrame(animate);
  }
});

function showTooltip(neuron, x, y) {
  if (!tooltip) return;
  tooltip.innerHTML = `
    <strong>${neuron.meta.name}</strong><br>
    <small>${(neuron.meta.skills || []).join(', ')}</small>
  `;
  tooltip.style.left = x + 10 + 'px';
  tooltip.style.top = y + 10 + 'px';
  tooltip.style.display = 'block';
  tooltip.style.opacity = '1';
}

function hideTooltip() {
  if (tooltip) {
    tooltip.style.display = 'none';
    tooltip.style.opacity = '0';
  }
}

async function createConnection(from_id, to_id) {
  if (!from_id || !to_id) return;

  const { error } = await supabase.from('connections').insert([
    { from_id, to_id, created_at: new Date().toISOString() }
  ]);

  if (error) {
    console.error('❌ Failed to create connection:', error.message);
  } else {
    console.log(`✅ Connection created: ${from_id} → ${to_id}`);
    const from = neurons.find(n => n.meta.id === from_id);
    const to = neurons.find(n => n.meta.id === to_id);
    if (from && to) connections.push({ from, to });
  }
}
