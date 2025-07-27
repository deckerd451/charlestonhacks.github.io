// neuralInteractive.js — Enhanced with Multi-Skill Glow, Bold Tooltips, Dimmed Filtering, and Connection Status + Auto-insert into Community


import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabase = supabase;

let skillColors = {};
let selectedSkill = '';
let neurons = [];
let connections = [];
let canvas, ctx, tooltip;
let CURRENT_USER_ID = null;

async function fetchSkillColors() {
  const { data, error } = await supabase.from('skill_colors').select('*');
  if (error) {
    console.error('❌ Failed to fetch skill colors:', error);
    return;
  }
  data.forEach(({ skill, color }) => {
    skillColors[skill] = color;
  });
}

function injectLegend() {
  const legend = document.createElement('div');
  legend.id = 'legend';
  legend.innerHTML = `
    <div id="legend-header">🎨 Skill Colors <span id="legend-toggle">[–]</span></div>
    <div id="legend-body"></div>
    <div id="skill-filter"><label for="skillSelect">Filter:</label><br/><select id="skillSelect"></select></div>
  `;

  Object.assign(legend.style, {
    position: 'fixed', bottom: '20px', right: '20px', background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff', padding: '10px 14px', borderRadius: '10px', fontSize: '14px',
    zIndex: 1000, fontFamily: 'sans-serif', border: '1px solid #0ff', cursor: 'move', maxWidth: '220px'
  });

  document.body.appendChild(legend);
  const header = document.getElementById('legend-header');
  const body = document.getElementById('legend-body');
  const toggle = document.getElementById('legend-toggle');
  toggle.style.cursor = 'pointer';

  toggle.onclick = () => {
    const isVisible = body.style.display !== 'none';
    body.style.display = isVisible ? 'none' : 'block';
    toggle.textContent = isVisible ? '[+]' : '[–]';
  };

  let isDragging = false;
  let offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', e => {
    isDragging = true;
    offsetX = e.clientX - legend.offsetLeft;
    offsetY = e.clientY - legend.offsetTop;
  });
  window.addEventListener('mousemove', e => {
    if (isDragging) {
      legend.style.left = `${e.clientX - offsetX}px`;
      legend.style.top = `${e.clientY - offsetY}px`;
      legend.style.right = 'unset';
      legend.style.bottom = 'unset';
    }
  });
  window.addEventListener('mouseup', () => isDragging = false);

  const mobileQuery = window.matchMedia("(max-width: 600px)");
  const repositionLegend = () => {
    if (mobileQuery.matches) {
      Object.assign(legend.style, {
        bottom: '0px', right: '0px', left: '0px', borderRadius: '0', maxWidth: '100%', fontSize: '12px'
      });
    } else {
      Object.assign(legend.style, {
        bottom: '20px', right: '20px', left: '', borderRadius: '10px', maxWidth: '220px', fontSize: '14px'
      });
    }
  };
  repositionLegend();
  mobileQuery.addEventListener('change', repositionLegend);
}

function populateLegendFromSkills() {
  const legendBody = document.getElementById('legend-body');
  const skillSelect = document.getElementById('skillSelect');
  legendBody.innerHTML = Object.entries(skillColors).map(([skill, color]) => {
    return `<span style="color: ${color}">■ ${skill}</span><br/>`;
  }).join('');
  skillSelect.innerHTML = `<option value="">All Skills</option>` + Object.keys(skillColors).map(skill => `<option value="${skill}">${skill}</option>`).join('');
  skillSelect.addEventListener('change', e => {
    selectedSkill = e.target.value;
    drawNetwork();
  });
}

function drawNeuron(neuron) {
  const pulse = 1 + Math.sin(Date.now() * 0.005 + neuron.x + neuron.y) * 0.3;
  const skills = neuron.meta.skills || [];

  skills.slice(0, 3).forEach((skill, index) => {
    const color = skillColors[skill] || '#0ff';
    const radius = 8 + (3 - index) * 4;

    const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(neuron.x, neuron.y, radius * pulse, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  });

  const centerColor = skills.map(s => skillColors[s]).find(Boolean) || '#0ff';
  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = centerColor;
  ctx.fill();
}

function drawConnections() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0,255,255,0.1)';
  connections.forEach(({ from, to }) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });
}

function drawNetwork() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawConnections();
  neurons.forEach(neuron => {
    const match = !selectedSkill || neuron.meta.skills?.includes(selectedSkill);
    ctx.globalAlpha = match ? 1 : 0.15;
    drawNeuron(neuron);
  });
  ctx.globalAlpha = 1;
}

function showTooltip(neuron, x, y) {
  const { name, email, skills, image_url, id } = neuron.meta;

  const isConnected = connections.some(conn =>
    conn.from.meta.id === CURRENT_USER_ID && conn.to.meta.id === id
  );

  tooltip.innerHTML = `
    ${image_url ? `<img src="${image_url}" alt="${name}" style="width: 50px; height: 50px; border-radius: 50%; margin-bottom: 8px;" />` : ''}
    <strong>${name}</strong><br/>
    <small>Skills: ${skills?.map(skill => skill === selectedSkill ? `<b>${skill}</b>` : skill).join(', ')}</small><br/>
    ${email ? `<a href="mailto:${email}" style="color:#0ff;">${email}</a><br/>` : ''}
    ${isConnected ? `<div style="color: #0f0; font-weight: bold;">✅ Already connected</div>` : ''}
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
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  tooltip = document.getElementById('neuron-tooltip');

  await fetchSkillColors();
  injectLegend();
  populateLegendFromSkills();

  const { data: sessionData } = await supabase.auth.getSession();
  CURRENT_USER_ID = sessionData?.session?.user?.id || null;

  // Auto-insert current user into community if not exists
  if (CURRENT_USER_ID) {
    const { data: userRow, error: userErr } = await supabase
      .from('community')
      .select('*')
      .eq('id', CURRENT_USER_ID)
      .maybeSingle();

    if (!userRow && !userErr) {
      await supabase.from('community').insert([{ id: CURRENT_USER_ID, name: 'Anonymous', skills: [], x: Math.random() * canvas.width, y: Math.random() * canvas.height }]);
      console.log('👤 Added current user to community.');
    }
  }

  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error('Failed to load community:', error);
    return;
  }
  neurons = data.map(user => ({ x: user.x, y: user.y, meta: user }));

  const { data: connectionData } = await supabase.from('connections').select('*');
  if (connectionData) {
    connections = connectionData.map(conn => {
      const from = neurons.find(n => n.meta.id === conn.from_id);
      const to = neurons.find(n => n.meta.id === conn.to_id);
      return from && to ? { from, to } : null;
    }).filter(Boolean);
  }

  drawNetwork();

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

  canvas.addEventListener('click', async e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (const target of neurons) {
      if (Math.hypot(target.x - x, target.y - y) < 10 && CURRENT_USER_ID && target.meta.id !== CURRENT_USER_ID) {
        await supabase.from('connections').insert([{ from_id: CURRENT_USER_ID, to_id: target.meta.id }]);
        connections.push({ from: neurons.find(n => n.meta.id === CURRENT_USER_ID), to: target });
        drawNetwork();
        break;
      }
    }
  });
});
