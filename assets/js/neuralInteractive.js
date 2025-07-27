// neuralInteractive.js — Enhanced with Skill Filtering, Glow by Skill, Tooltip Sync

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let skillColors = {};
let selectedSkill = '';
let neurons = [];
let canvas, ctx;

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
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '10px',
    fontSize: '14px',
    zIndex: 1000,
    fontFamily: 'sans-serif',
    border: '1px solid #0ff',
    cursor: 'move',
    maxWidth: '220px'
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

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  const mobileQuery = window.matchMedia("(max-width: 600px)");
  const repositionLegend = () => {
    if (mobileQuery.matches) {
      legend.style.bottom = '0px';
      legend.style.right = '0px';
      legend.style.left = '0px';
      legend.style.borderRadius = '0';
      legend.style.maxWidth = '100%';
      legend.style.fontSize = '12px';
    } else {
      legend.style.bottom = '20px';
      legend.style.right = '20px';
      legend.style.left = '';
      legend.style.borderRadius = '10px';
      legend.style.maxWidth = '220px';
      legend.style.fontSize = '14px';
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

  skillSelect.addEventListener('change', (e) => {
    selectedSkill = e.target.value;
    drawNetwork();
  });
}

function drawNeuron(neuron) {
  const pulse = 1 + Math.sin(Date.now() * 0.005 + neuron.x + neuron.y) * 0.3;
  const color = neuron.meta.skills?.map(s => skillColors[s]).find(Boolean) || '#0ff';

  const glow = ctx.createRadialGradient(neuron.x, neuron.y, 0, neuron.x, neuron.y, 15);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,255,255,0)');

  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 5 * pulse, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(neuron.x, neuron.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawNetwork() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  neurons.forEach(neuron => {
    if (!selectedSkill || neuron.meta.skills?.includes(selectedSkill)) {
      drawNeuron(neuron);
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-interactive');
  ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  await fetchSkillColors();
  injectLegend();
  populateLegendFromSkills();

  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error('Failed to load community:', error);
    return;
  }
  neurons = data.map(user => ({ x: user.x, y: user.y, meta: user }));
  drawNetwork();
});
