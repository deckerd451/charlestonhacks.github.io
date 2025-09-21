// assets/js/synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

export async function initSynapseView() {
  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  // Get community members
  const { data: members, error } = await supabase
    .from("community")
    .select("id, name, skills");

  if (error || !members) {
    console.error("[Synapse] Error fetching members:", error);
    return;
  }

  // Build node list
  const nodes = members.map((m, i) => ({
    id: m.id,
    label: m.name || `User ${i + 1}`,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
  }));

  // For now: random edges between some nodes
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (Math.random() < 0.05) { // ~5% chance
        edges.push({ source: nodes[i], target: nodes[j] });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Edges
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
    });

    // Nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      // Labels (optional)
      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.fillText(n.label, n.x + 8, n.y + 3);
    });
  }

  function tick() {
    draw();
    requestAnimationFrame(tick);
  }

  tick();
}
