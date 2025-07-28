// neuralInteractive.js — Drag-enabled, Click-to-Connect with Visual Feedback, Stable, Optimized, Clustered by Role, Tooltip-Fixed, Toggleable Name Display, Fully Clickable
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let sessionHandled = false;
let neurons = [], connections = [], canvas, ctx, tooltip;
let selectedNeuron = null, CURRENT_USER_ID = null;
let animationId = null;
let lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = false;
let draggingNeuron = null;
let wasDragging = false;

function clusteredLayout(users, canvasW, canvasH) {
  const groupBy = user => user.role || (user.interests?.[0] || 'unknown');
  const groups = {};
  for (const user of users) {
    const key = groupBy(user);
    if (!groups[key]) groups[key] = [];
    groups[key].push(user);
  }
  const keys = Object.keys(groups);
  const clusterRadius = 150;
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
      const spread = 30 + Math.floor(j / 3) * 10;
      const x = cx + spread * Math.cos(offsetAngle);
      const y = cy + spread * Math.sin(offsetAngle);
      result.push({ x, y, meta: user });
    });
  });
  return result;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function handleCanvasClick(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  for (const neuron of neurons) {
    if (Math.hypot(neuron.x - x, neuron.y - y) < 14) {
      selectedNeuron = neuron;
      console.log('🟢 Selected neuron:', neuron.meta.name);
      drawNetwork(); // <--- ✅ added to force redraw
      return;
    }
  }
  selectedNeuron = null;
  drawNetwork(); // <--- ✅ refresh on deselection too
}



function drawConnections() {
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.2)';
  connections.forEach(({ from, to }) => {
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  });
}

function drawNeuron(neuron, time) {
  const pulse = 1 + Math.sin(time / 400 + neuron.x + neuron.y) * 0.4;
  const radius = 8 * pulse;
  const color = (neuron === selectedNeuron) ? '#fff' : '#0ff';
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
  if (showAllNames) {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#0ff';
    ctx.textAlign = 'center';
    ctx.fillText(neuron.meta.name, neuron.x, neuron.y - 14);
  }
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

window.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.createElement('button');
  toggle.textContent = 'Show All Names';
  toggle.style.cssText = 'position:fixed;bottom:20px;left:20px;padding:8px;background:#000;color:#0ff;border:1px solid #0ff;border-radius:6px;z-index:9999;';
  toggle.onclick = () => {
    showAllNames = !showAllNames;
    toggle.textContent = showAllNames ? 'Hide Names' : 'Show All Names';
  };
  document.body.appendChild(toggle);

  canvas = document.getElementById('neural-interactive');
  ctx = canvas?.getContext('2d');
  tooltip = document.getElementById('neuron-tooltip');
  if (!canvas || !ctx || !tooltip) return console.error('❌ Missing canvas or tooltip in DOM');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  if (!sessionHandled) {
    sessionHandled = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) console.log('🔁 Session active');
    } catch (err) {
      console.error('⚠️ Session restore failed:', err);
    }
  }

  const { data: communityData, error: communityError } = await supabase.from('community').select('*');
  if (communityError) return console.error('❌ Failed to load community:', communityError);

  const canvasW = window.innerWidth;
  const canvasH = window.innerHeight;
  neurons = clusteredLayout(communityData, canvasW, canvasH);
  console.log('✅ Loaded neurons:', neurons);

  // Expose globals for console debugging
  window.neurons = neurons;
  window.canvas = canvas;
  window.handleCanvasClick = handleCanvasClick;

  const neuronMap = {};
  for (const neuron of neurons) neuronMap[String(neuron.meta.id).trim()] = neuron;

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

  const { data: connData, error: connError } = await supabase.from('connections').select('*');
  if (connError) return console.error('❌ Failed to load connections:', connError);

  connections = connData.map(conn => {
    const from = neuronMap[String(conn.from_id).trim()];
    const to = neuronMap[String(conn.to_id).trim()];
    return from && to ? { from, to } : null;
  }).filter(Boolean);
  window.connections = connections;

  canvas.addEventListener('mousedown', e => {
    wasDragging = false;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 10) {
        draggingNeuron = neuron;
        break;
      }
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (!draggingNeuron) return;
    wasDragging = true;
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    draggingNeuron.x = x;
    draggingNeuron.y = y;
  });

  canvas.addEventListener('mouseup', e => {
    if (!wasDragging) handleCanvasClick(e);
    draggingNeuron = null;
  });

  canvas.addEventListener('touchstart', e => {
    wasDragging = false;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 10) {
        draggingNeuron = neuron;
        break;
      }
    }
  });

  canvas.addEventListener('touchmove', e => {
    wasDragging = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    if (draggingNeuron) {
      draggingNeuron.x = x;
      draggingNeuron.y = y;
    }
  });

  canvas.addEventListener('touchend', e => {
    if (!wasDragging) handleCanvasClick(e.changedTouches[0]);
    draggingNeuron = null;
  });

  animationId = requestAnimationFrame(animate);
});
