// neuralInteractive.js — Fully Functional Animated Neurons with Tooltips, Glow, and Filtering + Mobile Touch Support

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let skillColors = {};
let selectedSkill = '';
let neurons = [];
let connections = [];
let canvas, ctx, tooltip;

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
  if (!connections.length) {
    console.warn('⚠️ No connections to draw.');
    return;
  }

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
  neurons.forEach(neuron => {
    ctx.globalAlpha = !selectedSkill || neuron.meta.skills?.includes(selectedSkill) ? 1 : 0.1;
    drawNeuron(neuron, time);
  });
  ctx.globalAlpha = 1;
}

function animate(time) {
  drawNetwork(time);
  requestAnimationFrame(animate);
}

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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-interactive');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('neuron-tooltip');

  if (!canvas || !ctx || !tooltip) {
    console.error('❌ Missing canvas or tooltip in DOM');
    return;
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Load neurons
  const { data: communityData, error: communityError } = await supabase.from('community').select('*');
  if (communityError) {
    console.error('❌ Failed to load community:', communityError);
    return;
  }
  neurons = communityData.map(user => ({
    x: user.x,
    y: user.y,
    meta: user
  }));
  console.log('✅ Loaded neurons:', neurons);

  // Build fast ID map for connection lookup
  const neuronMap = {};
  for (const neuron of neurons) {
    neuronMap[String(neuron.meta.id).trim()] = neuron;
  }

  // Load connections
  const { data: connData, error: connError } = await supabase.from('connections').select('*');
  if (connError) {
    console.error('❌ Failed to load connections:', connError);
    return;
  }

  connections = connData.map(conn => {
    const from = neuronMap[String(conn.from_id).trim()];
    const to = neuronMap[String(conn.to_id).trim()];

    if (!from || !to) {
      console.warn('🔍 Skipping connection — neuron(s) not found:', {
        from_id: conn.from_id,
        to_id: conn.to_id,
        availableIDs: Object.keys(neuronMap)
      });
    }

    return from && to ? { from, to } : null;
  }).filter(Boolean);

  console.log('✅ Loaded connections:', connections);

  // Hover Tooltip (desktop)
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

  // Touch Tooltip (mobile)
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

  canvas.addEventListener('touchend', () => {
    setTimeout(() => hideTooltip(), 1000);
  });

  animate();
});
