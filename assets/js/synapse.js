// assets/js/synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return; // only initialize once
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  // Fetch community members
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  // Build node lookup
  const nodes = members.map((m, i) => ({
    id: m.id,
    label: m.name || `User ${i + 1}`,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
  }));
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Fetch connections
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("source, target, type");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  // Build edges
  const edges = [];
  (connections || []).forEach(c => {
    const src = nodeById[c.source];
    const tgt = nodeById[c.target];
    if (src && tgt) {
      edges.push({
        source: src,
        target: tgt,
        type: c.type || "generic",
      });
    }
  });

  // === Force simulation parameters ===
  const repulsion = 2000; // how strongly nodes repel each other
  const springLength = 120; // preferred edge length
  const springStrength = 0.02;
  const damping = 0.85; // slows velocity over time

  function applyForces() {
    // Node repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy;
        if (distSq === 0) continue;
        const dist = Math.sqrt(distSq);
        const force = repulsion / distSq;

        const fx = force * (dx / dist);
        const fy = force * (dy / dist);

        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Edge springs
    edges.forEach(e => {
      const dx = e.target.x - e.source.x;
      const dy = e.target.y - e.source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const diff = dist - springLength;
      const force = springStrength * diff;

      const fx = force * (dx / dist);
      const fy = force * (dy / dist);

      e.source.vx += fx;
      e.source.vy += fy;
      e.target.vx -= fx;
      e.target.vy -= fy;
    });

    // Integrate velocities
    nodes.forEach(n => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;

      // Keep nodes inside canvas
      n.x = Math.max(10, Math.min(width - 10, n.x));
      n.y = Math.max(10, Math.min(height - 10, n.y));
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Draw edges
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);

      if (e.type === "mentorship") {
        ctx.strokeStyle = "rgba(0, 200, 255, 0.5)";
      } else if (e.type === "collaboration") {
        ctx.strokeStyle = "rgba(0, 255, 150, 0.5)";
      } else {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      }
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#FFD700";
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.fillText(n.label, n.x + 8, n.y + 3);
    });
  }

  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }

  tick();
}

// Initialize only when the Synapse tab is clicked
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
