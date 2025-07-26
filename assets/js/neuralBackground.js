// neuralBackground.js (Step 1 — Merged and Supabase-powered)

import { fetchNeurons } from './loadNeurons.js';

const canvas = document.getElementById('neural-bg');
const ctx = canvas.getContext('2d');

let width, height;
let neurons = [];

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let mouseX = -1, mouseY = -1;
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

function drawNeuron(n) {
  // Glow effect
  const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 8);
  gradient.addColorStop(0, '#ff6600');
  gradient.addColorStop(1, 'transparent');

  ctx.beginPath();
  ctx.arc(n.x, n.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Optional text (if small size or subtle needed)
  // ctx.font = '10px sans-serif';
  // ctx.fillStyle = '#ffffff';
  // ctx.fillText(n.label, n.x + 10, n.y);
}

function drawTooltip(text, x, y) {
  ctx.font = '12px sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  const padding = 6;
  const textWidth = ctx.measureText(text).width;
  ctx.fillRect(x + 10, y - 20, textWidth + padding * 2, 20);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x + 15, y - 5);
}

function isHovered(n, mx, my) {
  const dx = n.x - mx;
  const dy = n.y - my;
  return dx * dx + dy * dy < 9 ** 2;
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  // Connect logic (placeholder – replaced in Step 2)
  // connectNeurons();

  // Draw all neurons
  neurons.forEach(drawNeuron);

  // Tooltip on hover
  for (let n of neurons) {
    if (isHovered(n, mouseX, mouseY)) {
      drawTooltip(n.label, n.x, n.y);
      break;
    }
  }

  requestAnimationFrame(animate);
}

// Fetch real neurons and start loop
fetchNeurons().then(data => {
  neurons = data.map(n => ({
    ...n,
    x: n.x || Math.random() * width,
    y: n.y || Math.random() * height
  }));
  animate();
});
