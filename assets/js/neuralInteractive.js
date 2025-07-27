// neuralInteractive.js — Fully Functional with Supabase Auth, Live Connections, Suggested Links, Role-Based Filtering, Animated Glow by Role, and Floating Legend

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let CURRENT_USER_ID = null;
let canvas, ctx, width, height;
let neurons = [];
let tooltip;
let activeNeuron = null;

const roleColors = {
  'Organizer': '#ff6b6b',
  'Developer': '#1dd1a1',
  'Designer': '#54a0ff',
  'Mentor': '#feca57'
};

function injectLegend() {
  const legend = document.createElement('div');
  legend.id = 'legend';
  legend.innerHTML = `
    <strong>Role Colors</strong><br/>
    <span style="color: #ff6b6b">■ Organizer</span><br/>
    <span style="color: #1dd1a1">■ Developer</span><br/>
    <span style="color: #54a0ff">■ Designer</span><br/>
    <span style="color: #feca57">■ Mentor</span>
  `;
  Object.assign(legend.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.6)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 1000,
    lineHeight: '1.6',
    fontFamily: 'sans-serif',
    border: '1px solid #0ff'
  });
  document.body.appendChild(legend);
}

async function loadCommunityData() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error('❌ Failed to fetch community data:', error);
    return [];
  }
  return data;
}

async function loadConnections() {
  const { data, error } = await supabase.from('connections').select('from_id, to_id');
  if (error) {
    console.error('❌ Failed to fetch connections:', error);
    return [];
  }
  return data;
}

class Neuron {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.connections = [];
    this._suggested = [];
    this.meta = {};
    this.visible = true;
  }

  connectTo(other) {
    if (this !== other && !this.connections.includes(other)) {
      this.connections.push(other);
    }
  }

  contains(x, y) {
    return this.visible && Math.hypot(this.x - x, this.y - y) < 10;
  }

  draw() {
    const pulse = 1 + Math.sin(Date.now() * 0.005 + this.x + this.y) * 0.3;
    const baseColor = roleColors[this.meta.role] || '#0ff';

    if (!this.visible) {
      ctx.globalAlpha = 0.1;
    } else {
      ctx.globalAlpha = 1;
    }

    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 15);
    glow.addColorStop(0, baseColor.replace(')', ', 0.9)').replace('rgb', 'rgba'));
    glow.addColorStop(1, baseColor.replace(')', ', 0)').replace('rgb', 'rgba'));

    ctx.beginPath();
    ctx.arc(this.x, this.y, 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = baseColor;
    ctx.fill();

    if (this._suggested?.length) {
      this._suggested.forEach(other => {
        if (!other.visible) return;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.setLineDash([4, 2]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    this.connections.forEach(other => {
      if (!other.visible) return;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(other.x, other.y);
      ctx.strokeStyle = 'rgba(0,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.globalAlpha = 1; // reset
  }
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

function drawNetwork() {
  ctx.clearRect(0, 0, width, height);
  neurons.forEach(n => n.draw());
  requestAnimationFrame(drawNetwork);
}

function showTooltip(neuron, x, y) {
  const { id, name, role, interests, email, image_url, availability } = neuron.meta;
  const alreadyConnected = neuron.connections.some(n => n.meta?.id === CURRENT_USER_ID);
  const isSuggested = neuron._suggested?.some(n => n.meta?.id === CURRENT_USER_ID);
  tooltip.innerHTML = `
    ${image_url ? `<img src="${image_url}" alt="${name}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 8px;" />` : ''}
    <strong>${name}</strong><br/>
    <em>${role}</em><br/>
    <small>Interests: ${interests?.join(', ')}</small><br/>
    ${email ? `<a href="mailto:${email}" style="color:#0ff;">${email}</a><br/>` : ''}
    <small>Availability: ${availability}</small><br/>
    ${isSuggested ? `<small style="color:yellow;">✨ Suggested for you</small><br/>` : ''}
    ${id !== CURRENT_USER_ID && !alreadyConnected ? `<button data-connect="${id}">Connect</button>` : alreadyConnected ? '<small>✔ Connected</small>' : '<small>(You)</small>'}
  `;
  tooltip.style.left = x + 10 + 'px';
  tooltip.style.top = y + 10 + 'px';
  tooltip.style.display = 'block';
  tooltip.style.opacity = '1';
}

function hideTooltip() {
  tooltip.style.display = 'none';
  tooltip.style.opacity = '0';
}

function createNeuronsFromCommunity(data) {
  neurons = [];
  const idToNeuron = new Map();
  data.forEach(user => {
    const neuron = new Neuron(user.x, user.y);
    neuron.meta = user;
    neurons.push(neuron);
    idToNeuron.set(user.id, neuron);
  });
  return idToNeuron;
}

function generateSuggestedConnections() {
  neurons.forEach((a, i) => {
    for (let j = i + 1; j < neurons.length; j++) {
      const b = neurons[j];
      if (a.meta.id === CURRENT_USER_ID || b.meta.id === CURRENT_USER_ID) {
        const shared = a.meta.interests?.filter(tag => b.meta.interests?.includes(tag)) || [];
        const complement = a.meta.role !== b.meta.role;
        const available = a.meta.availability === 'Yes' || b.meta.availability === 'Yes';
        const score = shared.length * 5 + (complement ? 3 : 0) + (available ? 2 : 0);
        if (score >= 7 && !a.connections.includes(b)) {
          a._suggested.push(b);
          b._suggested.push(a);
        }
      }
    }
  });
}

function applyRoleFilter(selectedRole) {
  neurons.forEach(n => {
    n.visible = !selectedRole || n.meta.role === selectedRole;
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-interactive');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('neuron-tooltip');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  injectLegend();

  const authStatus = document.getElementById('auth-status');
  const emailInput = document.getElementById('email-input');
  const authForm = document.getElementById('auth-form');
  const logoutBtn = document.getElementById('logout-btn');

  authForm.addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({ email: emailInput.value });
    if (error) return alert('Login failed');
    authStatus.innerText = `Check your email (${emailInput.value}) to complete login.`;
  });

  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    location.reload();
  });

  const roleFilter = document.getElementById('roleFilter');
  roleFilter.addEventListener('change', () => {
    applyRoleFilter(roleFilter.value);
  });

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return authStatus.innerText = 'Please log in';

  CURRENT_USER_ID = session.user.id;
  authStatus.innerText = `Logged in as ${session.user.email}`;
  authForm.style.display = 'none';
  logoutBtn.style.display = 'inline-block';

  const { data: userProfile } = await supabase
    .from('community')
    .select('id')
    .eq('id', CURRENT_USER_ID)
    .single();

  if (!userProfile) {
    await supabase.from('community').insert([{ id: CURRENT_USER_ID, name: session.user.email, interests: [], x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }]);
  }

  const communityData = await loadCommunityData();
  const idToNeuron = createNeuronsFromCommunity(communityData);
  const connections = await loadConnections();
  connections.forEach(({ from_id, to_id }) => {
    const fromNeuron = idToNeuron.get(from_id);
    const toNeuron = idToNeuron.get(to_id);
    if (fromNeuron && toNeuron) {
      fromNeuron.connectTo(toNeuron);
      toNeuron.connectTo(fromNeuron);
    }
  });

  generateSuggestedConnections();
  drawNetwork();

  tooltip.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-connect]');
    if (!btn) return;
    const to_id = btn.getAttribute('data-connect');
    if (to_id === CURRENT_USER_ID) return;
    const fromNeuron = neurons.find(n => n.meta?.id === CURRENT_USER_ID);
    const toNeuron = neurons.find(n => n.meta?.id === to_id);
    if (!fromNeuron || !toNeuron) return;
    if (fromNeuron.connections.includes(toNeuron)) return;
    const { error } = await supabase.from('connections').insert([{ from_id: CURRENT_USER_ID, to_id }]);
    if (error) return alert('Connection failed');
    fromNeuron.connectTo(toNeuron);
    toNeuron.connectTo(fromNeuron);
    hideTooltip();
  });

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let found = false;
    for (const neuron of neurons) {
      if (neuron.contains(x, y)) {
        showTooltip(neuron, e.clientX, e.clientY);
        activeNeuron = neuron;
        found = true;
        break;
      }
    }
    if (!found) {
      hideTooltip();
      activeNeuron = null;
    }
  });
});
