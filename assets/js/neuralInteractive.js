import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let canvas, ctx, width, height;
let neurons = [];
let tooltip;
let activeNeuron = null;

async function loadCommunityData() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error("❌ Failed to fetch community data:", error);
    return [];
  }

  return data.map((user, index) => ({
    id: user.id,
    name: user.name || '',
    role: user.role || 'Member',
    interests: Array.isArray(user.interests) ? user.interests : [],
    x: user.x ?? (100 + index * 50),
    y: user.y ?? (100 + (index % 5) * 60),
    email: user.email || '',
    image_url: user.image_url || '',
    endorsements: user.endorsements || {},
    availability: user.availability || ''
  }));
}

function createNeuronsFromCommunity(data) {
  const idToNeuron = new Map();

  data.forEach(user => {
    const neuron = new Neuron(user.x, user.y);
    neuron.meta = user;
    neurons.push(neuron);
    idToNeuron.set(user.id, neuron);
  });

  data.forEach((userA, i) => {
    for (let j = i + 1; j < data.length; j++) {
      const userB = data[j];
      const shared = userA.interests.filter(tag => userB.interests.includes(tag));
      if (shared.length > 0) {
        idToNeuron.get(userA.id).connectTo(idToNeuron.get(userB.id));
        idToNeuron.get(userB.id).connectTo(idToNeuron.get(userA.id));
      }
    }
  });
}

class Neuron {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.connections = [];
  }

  connectTo(other) {
    if (this !== other && !this.connections.includes(other)) {
      this.connections.push(other);
    }
  }

  contains(x, y) {
    return Math.hypot(this.x - x, this.y - y) < 10;
  }

  draw() {
    const pulse = 1 + Math.sin(Date.now() * 0.005 + this.x + this.y) * 0.3;

    const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, 15);
    glow.addColorStop(0, 'rgba(0,255,255,0.9)');
    glow.addColorStop(1, 'rgba(0,255,255,0)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0ff';
    ctx.fill();

    this.connections.forEach(other => {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(other.x, other.y);
      ctx.strokeStyle = 'rgba(0,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
}

function drawNetwork() {
  ctx.clearRect(0, 0, width, height);
  neurons.forEach(n => n.draw());
  requestAnimationFrame(drawNetwork);
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
function showTooltip(neuron, x, y) {
  const { name, role, interests, email, image_url, availability } = neuron.meta || {};
  tooltip.innerHTML = `
    ${image_url ? `<img src="${image_url}" alt="${name}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 8px;" />` : ''}
    <strong>${name}</strong><br/>
    <em>${role}</em><br/>
    <small>Interests: ${interests?.join(', ')}</small><br/>
    ${email ? `<a href="mailto:${email}" style="color:#0ff;">${email}</a><br/>` : ''}
    <small>Availability: ${availability}</small>
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

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-interactive');
  ctx = canvas.getContext('2d');
  tooltip = document.getElementById('neuron-tooltip');

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const communityData = await loadCommunityData();
  createNeuronsFromCommunity(communityData);
  drawNetwork();

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

  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;

    for (const neuron of neurons) {
      if (neuron.contains(x, y)) {
        showTooltip(neuron, t.clientX, t.clientY);
        activeNeuron = neuron;
        return;
      }
    }

    hideTooltip();
  });

  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newNeuron = new Neuron(x, y);
    neurons.forEach(n => {
      if (Math.hypot(n.x - x, n.y - y) < 150) {
        newNeuron.connectTo(n);
        n.connectTo(newNeuron);
      }
    });
    neurons.push(newNeuron);
  });
});
