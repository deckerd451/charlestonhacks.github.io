// assets/js/neuralBackground.js
// Subtle neural background with gentle parallax motion
export function startNeuralBackground() {
  const canvas = document.getElementById('neuralBackground');
  const ctx = canvas.getContext('2d');
  let width, height, mouse = { x: 0, y: 0 };

  const nodes = [];
  const numNodes = 80;
  const maxDistance = 140;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function init() {
    resize();
    nodes.length = 0;
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      const dx = n.x - mouse.x / 20;
      const dy = n.y - mouse.y / 20;
      ctx.beginPath();
      ctx.arc(n.x - dx * 0.005, n.y - dy * 0.005, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        const a = nodes[i], b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < maxDistance) {
          ctx.globalAlpha = 1 - dist / maxDistance;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX - width / 2;
    mouse.y = e.clientY - height / 2;
  });

  window.addEventListener('resize', resize);
  init();
  draw();
}

window.addEventListener('DOMContentLoaded', startNeuralBackground);
