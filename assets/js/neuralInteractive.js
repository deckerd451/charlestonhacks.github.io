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

  const offsetX = 20;
  const offsetY = 20;

  tooltip.style.left = `${event.pageX + offsetX}px`;
  tooltip.style.top = `${event.pageY + offsetY}px`;
}

function hideTooltip() {
  tooltip.classList.remove('visible');
  tooltip.classList.add('hidden');
}

function getNeuronUnderCursor(event) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (event.clientX - rect.left) * scale;
  const y = (event.clientY - rect.top) * scale;

  return neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
}

window.addEventListener('DOMContentLoaded', async () => {
  function handleCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 14) {
        selectedNeuron = neuron;
        console.log('🟢 Selected neuron:', neuron.meta.name);
        drawNetwork();
        return;
      }
    }
    selectedNeuron = null;
    drawNetwork();
  }
  canvas = document.getElementById('neural-canvas');
  ctx = canvas?.getContext('2d');
  tooltip = document.getElementById('tooltip');
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
  const authStatusEl = document.getElementById('auth-status');
  if (sessionData?.session?.user) {
    CURRENT_USER_ID = sessionData.session.user.id;
    if (authStatusEl) {
      authStatusEl.textContent = '🟢 Connected as: ' + sessionData.session.user.email;
      authStatusEl.style.color = '#0f0';
    }
    const authForm = document.getElementById('auth-form');
    const logoutBtn = document.getElementById('logout-btn');
    if (authForm) authForm.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  }
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      CURRENT_USER_ID = userData.user.id;
      if (authStatusEl) {
        authStatusEl.textContent = '🟢 Connected as: ' + userData.user.email;
        authStatusEl.style.color = '#0f0';
      }
      const authForm = document.getElementById('auth-form');
      const logoutBtn = document.getElementById('logout-btn');
      if (authForm) authForm.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
      }
    } else if (authStatusEl) {
      authStatusEl.textContent = '🔴 Not Logged In';
      authStatusEl.style.color = '#f00';
    }
  }

  const { data: communityDataRaw, error: communityError } = await supabase.from('community').select('*');
  
  // Format interests from comma-separated string to array, parse endorsements as number, and trim availability
  const communityData = communityDataRaw.map(user => {
    const formatted = { ...user };

    if (typeof formatted.interests === 'string') {
      formatted.interests = formatted.interests
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean);
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
  if (communityError) return console.error('❌ Failed to load community:', communityError);

  neurons = clusteredLayout(communityData, canvas.width, canvas.height);
  if (!neurons.length) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0ff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ No community data to display.', canvas.width / 2, canvas.height / 2);

    // Add retry button
    const retryBtn = document.createElement('button');
    retryBtn.textContent = '🔄 Retry';
    retryBtn.style.cssText = 'position:fixed;top:60%;left:50%;transform:translateX(-50%);padding:10px 20px;background:#000;color:#0ff;border:1px solid #0ff;border-radius:8px;font-size:16px;z-index:1001;cursor:pointer;';
    retryBtn.onclick = async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = '🔄 Loading...';
      const { data: refreshedData, error: retryError } = await supabase.from('community').select('*');
      if (retryError) return alert('Failed to reload community data');

      const formattedData = refreshedData.map(user => {
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

      neurons = clusteredLayout(formattedData, canvas.width, canvas.height);
      if (neurons.length) {
        document.body.removeChild(retryBtn);
        drawNetwork();
        animationId = requestAnimationFrame(animate);
      } else {
        retryBtn.disabled = false;
        retryBtn.textContent = '🔄 Retry';
      }
    };
    document.body.appendChild(retryBtn);
    return;
  }
  window.neurons = neurons;

  const neuronMap = {};
  for (const neuron of neurons) neuronMap[String(neuron.meta.id).trim()] = neuron;

  // ⬆️ Replaced by getSession + fallback logic above

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
  canvas.addEventListener('click', handleCanvasClick);

  // Desktop dragging support
  let draggingNeuronDesktop = null;
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;
    for (const neuron of neurons) {
      if (Math.hypot(neuron.x - x, neuron.y - y) < 14) {
        draggingNeuronDesktop = neuron;
        selectedNeuron = neuron;
        break;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (draggingNeuronDesktop) {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const x = (e.clientX - rect.left) * scale;
      const y = (e.clientY - rect.top) * scale;
      draggingNeuronDesktop.x = x;
      draggingNeuronDesktop.y = y;
      drawNetwork();
    }
  });

  canvas.addEventListener('mouseup', () => {
    draggingNeuronDesktop = null;
  });

  // Touch support for tooltips
  canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;
    const eventStub = { pageX: touch.clientX, pageY: touch.clientY };

    const touchedNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
    if (touchedNeuron) {
      showTooltip(eventStub, touchedNeuron);
    } else {
      hideTooltip();
    }
  });

  // Tap-to-select support for mobile
  canvas.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const x = (touch.clientX - rect.left) * scale;
    const y = (touch.clientY - rect.top) * scale;

    const touchedNeuron = neurons.find(neuron => Math.hypot(neuron.x - x, neuron.y - y) < 14);
    if (touchedNeuron) {
      selectedNeuron = touchedNeuron;
      console.log('🟢 Selected neuron (mobile):', touchedNeuron.meta.name);
      drawNetwork();
    } else {
      selectedNeuron = null;
      drawNetwork();
    }
  });

  animationId = requestAnimationFrame(animate);
});
