import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let neurons = [], connections = [], canvas, ctx, tooltip;
let selectedNeuron = null, CURRENT_USER_ID = null;
let animationId = null;
let lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = false;
let isPinching = false, lastDistance = 0, pinchScale = 1;
let draggingNeuronTouch = null, startTouchTime = 0;

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
      const x = cx + spread * Math.cos(offsetAngle);
      const y = cy + spread * Math.sin(offsetAngle);
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

function getNeuronAt(x, y) {
  return neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
}

function disableScrollTemporarily() {
  document.body.style.overflow = 'hidden';
}

function enableScroll() {
  document.body.style.overflow = '';
}

window.addEventListener('touchmove', (e) => {
  if (isPinching && e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const newDistance = Math.hypot(dx, dy);
    pinchScale *= newDistance / lastDistance;
    lastDistance = newDistance;
  } else if (draggingNeuronTouch) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    draggingNeuronTouch.x = (touch.clientX - rect.left) * scale;
    draggingNeuronTouch.y = (touch.clientY - rect.top) * scale;
    drawNetwork();
    e.preventDefault();
  }
}, { passive: false });

window.addEventListener('touchend', () => {
  draggingNeuronTouch = null;
  isPinching = false;
  enableScroll();
});

export {
  animate,
  clusteredLayout,
  drawConnections,
  drawNeuron,
  drawNetwork,
  getNeuronAt,
  disableScrollTemporarily,
  enableScroll
};
