// neuralInteractive.js — Updated to Use Supabase Skills Instead of Roles, with Dynamic Skill Colors, Glow, Filtering, and Draggable Legend

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let skillColors = {};

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
    maxWidth: '200px'
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
      legend.style.maxWidth = '200px';
      legend.style.fontSize = '14px';
    }
  };
  repositionLegend();
  mobileQuery.addEventListener('change', repositionLegend);
}

function populateLegendFromSkills() {
  const legendBody = document.getElementById('legend-body');
  legendBody.innerHTML = Object.entries(skillColors).map(([skill, color]) => {
    return `<span style="color: ${color}">■ ${skill}</span><br/>`;
  }).join('');
}

// Call in your main DOMContentLoaded block:
window.addEventListener('DOMContentLoaded', async () => {
  await fetchSkillColors();
  injectLegend();
  populateLegendFromSkills();
});
