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

// ... existing layout, draw, and tooltip functions remain unchanged ...

window.addEventListener('DOMContentLoaded', async () => {
  function disableTouchMenu(el) {
    if (!el) return;
    el.style.userSelect = 'none';
    el.style.webkitUserSelect = 'none';
    el.style.webkitTouchCallout = 'none';
    el.addEventListener('touchstart', e => e.preventDefault());
    el.addEventListener('contextmenu', e => e.preventDefault());
  }

  canvas = document.getElementById('neural-canvas');
  ctx = canvas?.getContext('2d');
  tooltip = document.getElementById('tooltip');
  disableTouchMenu(tooltip);
  document.querySelectorAll('.card, .label, .profile-bubble').forEach(disableTouchMenu);

  if (!canvas || !ctx) return console.error('❌ Missing canvas');

  canvas.width = 3000;
  canvas.height = 2000;

  const wrapper = document.getElementById('canvas-wrapper');
  if (wrapper) {
    wrapper.scrollLeft = (canvas.width - window.innerWidth) / 2;
    wrapper.scrollTop = (canvas.height - window.innerHeight) / 2;
  }

  const toggle = document.createElement('button');
  toggle.textContent = 'Show All Names';
  toggle.style.cssText = 'position:fixed;bottom:20px;left:20px;padding:8px;background:#000;color:#0ff;border:1px solid #0ff;border-radius:6px;z-index:9999;';
  toggle.onclick = () => {
    showAllNames = !showAllNames;
    toggle.textContent = showAllNames ? 'Hide Names' : 'Show All Names';
  };
  document.body.appendChild(toggle);

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) console.warn('No session found');

  const { data: communityDataRaw, error: communityError } = await supabase.from('community').select('*');
  if (communityError) return console.error('❌ Failed to load community:', communityError);

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
  if (!neurons.length) {
    ctx.fillStyle = '#0ff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ No community data to display.', canvas.width / 2, canvas.height / 2);
    return;
  }
  window.neurons = neurons;

  const neuronMap = {};
  for (const neuron of neurons) neuronMap[String(neuron.meta.id).trim()] = neuron;

  const { data: userData } = await supabase.auth.getUser();
  const authStatusEl = document.getElementById('auth-status');
  if (userData?.user?.id) {
    CURRENT_USER_ID = userData.user.id;
    if (authStatusEl) {
      authStatusEl.textContent = '🟢 Connected as: ' + userData.user.email;
      authStatusEl.style.color = '#0f0';
    }
  } else if (authStatusEl) {
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

  canvas.addEventListener('mousemove', (e) => {
    const hoveredNeuron = getNeuronUnderCursor(e);
    if (hoveredNeuron) {
      showTooltip(e, hoveredNeuron);
    } else {
      hideTooltip();
    }
  });

  canvas.addEventListener('mouseleave', hideTooltip);
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    selectedNeuron = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 14) || null;
    drawNetwork();
  });

  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    const eventStub = { pageX: touch.clientX, pageY: touch.clientY };
    const touchedNeuron = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 14);
    if (touchedNeuron) showTooltip(eventStub, touchedNeuron);
    else hideTooltip();
  });

  canvas.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    selectedNeuron = neurons.find(n => Math.hypot(n.x - x, n.y - y) < 14) || null;
    drawNetwork();
  });

  animationId = requestAnimationFrame(animate);
});
