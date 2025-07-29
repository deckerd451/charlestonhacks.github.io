// Cleaned up version of neuralInteractive.js with drag-and-save support and mobile dragging
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let neurons = [], connections = [], canvas, ctx, tooltip;
let draggingNeuronDesktop = null;
let draggingNeuronTouch = null;
let selectedNeuron = null, CURRENT_USER_ID = null;
let animationId = null;
let lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = false;

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
  const clusterRadius = 600;
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
     const x = typeof user.x === 'number' ? user.x : cx + spread * Math.cos(offsetAngle);
const y = typeof user.y === 'number' ? user.y : cy + spread * Math.sin(offsetAngle);
result.push({ x, y, radius: 8, meta: user });
    });
  });
  return result;
}

function drawNeuron(neuron, time) {
  const pulse = 1 + Math.sin(time / 400 + neuron.x + neuron.y) * 0.4;
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

// Dragging: desktop
function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (e.clientX - rect.left) * scale;
  const y = (e.clientY - rect.top) * scale;
  for (const neuron of neurons) {
    if (Math.hypot(neuron.x - x, neuron.y - y) < 14) {
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

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const hoveredNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
    if (hoveredNeuron) {
      showTooltip(e, hoveredNeuron);
    } else {
      tooltip.classList.add('hidden');
    }
  });

  canvas.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    const clickedNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
    selectedNeuron = clickedNeuron || null;
    drawNetwork();
  });
}

async function handleMouseUp() {
  if (!draggingNeuronDesktop) return;
  const id = draggingNeuronDesktop.meta.id;
const x = draggingNeuronDesktop.x;
const y = draggingNeuronDesktop.y;
 draggingNeuronDesktop = null;

  const { error } = await supabase.from('community').update({ x: updatedX, y: updatedY }).eq('id', id);
  if (!error) showToast('💾 Position saved');
  else console.error('❌ Failed to save position:', error.message);
}

// Dragging: mobile touch
function handleTouchStart(e) {
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (touch.clientX - rect.left) * scale;
  const y = (touch.clientY - rect.top) * scale;
  draggingNeuronTouch = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 14);
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
const x = draggingNeuronTouch.x;
const y = draggingNeuronTouch.y;
draggingNeuronTouch = null;

  const { error } = await supabase.from('community').update({ x, y }).eq('id', id);
  if (!error) showToast('💾 Position saved');
  else console.error('❌ Failed to save position:', error.message);
}

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');
  canvas.width = 3000;
  canvas.height = 2000;
  animate();

  // 🔄 Fetch and render neurons from Supabase
  const { data: communityDataRaw, error: communityError } = await supabase.from('community').select('*');
  if (communityError) {
    console.error('❌ Failed to load community:', communityError);
    return;
  }

  const communityData = communityDataRaw.map(user => {
    const formatted = { ...user };

    if (typeof formatted.interests === 'string') {
      formatted.interests = formatted.interests.split(',').map(tag => tag.trim()).filter(Boolean);
    }

    if (typeof formatted.endorsements === 'string') {
      const num = parseInt(formatted.endorsements, 10);
      formatted.endorsements = isNaN(num) ? 0 : num;
    }

    if (typeof formatted.availability === 'string') {
      formatted.availability = formatted.availability.trim();
    }

    return formatted;
  });

  neurons = clusteredLayout(communityData, canvas.width, canvas.height);
  drawNetwork();

  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);
});
