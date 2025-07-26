const canvas = document.getElementById('neural-interactive');
const ctx = canvas.getContext('2d');
let width, height;
let neurons = [];

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

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

function drawNetwork() {
  ctx.clearRect(0, 0, width, height);
  neurons.forEach(n => n.draw());
  requestAnimationFrame(drawNetwork);
}

drawNetwork(); // ✅ Start animation loop
