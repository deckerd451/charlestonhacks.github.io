// assets/js/synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return; // only initialize once
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

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
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
  }));
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // ✅ Fetch real connections using correct column names
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("source, target, type, created_at");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  // Build edges from real connections
  const edges = [];
  (connections || []).forEach(c => {
    const src = nodeById[c.source];
    const tgt = nodeById[c.target];
    if (src && tgt) {
      edges.push({
        source: src,
        target: tgt,
        type: c.type || "generic",
        created_at: c.created_at,
      });
    }
  });

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw edges
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);

      // Style edges based on type
      if (e.type === "mentorship") {
        ctx.strokeStyle = "rgba(0, 200, 255, 0.4)";
      } else if (e.type === "collaboration") {
        ctx.strokeStyle = "rgba(0, 255, 150, 0.4)";
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
      ctx.fillStyle = "#FFD700"; // gold
      ctx.fill();

      // Labels
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

// Initialize only when the Synapse tab is clicked
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
