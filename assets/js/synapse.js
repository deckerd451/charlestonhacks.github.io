// synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

export async function initSynapseView() {
  const canvas = document.getElementById('synapseCanvas');
  const statusEl = document.getElementById('connection-status');

  if (!canvas) {
    console.error("[Synapse] No canvas element found.");
    return;
  }
  if (!statusEl) {
    console.warn("[Synapse] No connection-status element found.");
  }

  const ctx = canvas.getContext('2d');

  function setStatus(text, type = "info") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.remove("hidden");
    if (type === "error") {
      statusEl.style.background = "rgba(255, 50, 50, 0.9)";
      statusEl.style.color = "white";
    } else if (type === "success") {
      statusEl.style.background = "rgba(0, 255, 150, 0.9)";
      statusEl.style.color = "black";
    } else {
      statusEl.style.background = "rgba(255, 215, 0, 0.9)";
      statusEl.style.color = "black";
    }
  }

  function resizeCanvas() {
    canvas.width = canvas.clientWidth || window.innerWidth;
    canvas.height = canvas.clientHeight || window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  let neurons = [];
  let connections = [];

  async function loadNeurons() {
    setStatus("Connecting…");
    try {
      const { data, error } = await supabase
        .from('community')
        .select('id, name, x, y');

      if (error) throw error;

      if (data && data.length > 0) {
        console.log("[Synapse] Loaded", data.length, "neurons from Supabase");
        neurons = data.map(n => ({
          id: n.id,
          label: n.name,
          x: n.x || Math.random() * canvas.width,
          y: n.y || Math.random() * canvas.height,
        }));
        setStatus("Connected ✓", "success");
      } else {
        console.warn("[Synapse] No Supabase data, using fallback nodes");
        fallbackNeurons();
        setStatus("No data — fallback mode", "error");
      }
    } catch (err) {
      console.error("[Synapse] Error fetching data:", err);
      fallbackNeurons();
      setStatus("Error — fallback mode", "error");
    }
  }

  function fallbackNeurons() {
    neurons = [];
    const cols = 5;
    const rows = 3;
    const spacingX = canvas.width / (cols + 1);
    const spacingY = canvas.height / (rows + 1);

    for (let i = 1; i <= cols; i++) {
      for (let j = 1; j <= rows; j++) {
        neurons.push({
          id: `fallback-${i}-${j}`,
          label: `Node ${i}-${j}`,
          x: i * spacingX,
          y: j * spacingY,
        });
      }
    }

    connections = [];
    for (let i = 0; i < neurons.length; i++) {
      const target = neurons[Math.floor(Math.random() * neurons.length)];
      if (target && target.id !== neurons[i].id) {
        connections.push([neurons[i], target]);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,0,0.5)";
    connections.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    neurons.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "#0ff";
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText(n.label, n.x + 12, n.y + 4);
    });

    requestAnimationFrame(draw);
  }

  await loadNeurons();
  draw();
  console.log("%c[Synapse] View initialized ✅", "color: lime; font-weight: bold;");
}
