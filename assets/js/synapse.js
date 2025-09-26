// assets/js/synapse.js
// Synapse View with Supabase integration, canvas rendering,
// force simulation, zoom/pan, tooltips, and click-to-connect.

import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return; // only initialize once
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) {
    console.error("[Synapse] No canvas element found.");
    return;
  }
  const ctx = canvas.getContext("2d");

  // --- Fetch community members ---
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills, interests, image_url");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  // --- Build node lookup ---
  const nodes = members.map((m, i) => ({
    id: m.id,
    label: m.name || `User ${i + 1}`,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
    skills: m.skills || [],
    interests: m.interests || [],
    image_url: m.image_url || null,
  }));
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // --- Fetch connections with modern schema ---
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("from_user_id, to_user_id, type, created_at");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  // --- Build edges ---
  const edges = [];
  (connections || []).forEach(c => {
    const src = nodeById[c.from_user_id];
    const tgt = nodeById[c.to_user_id];
    if (src && tgt) {
      edges.push({
        source: src,
        target: tgt,
        type: c.type || "generic",
        created_at: c.created_at,
      });
    }
  });

  // --- Drawing ---
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Edges
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);

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

    // Nodes
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

  // --- Simple force simulation (manual tick) ---
  function tick() {
    nodes.forEach(n => {
      // Jitter (can later replace with proper physics/force lib)
      n.x += (Math.random() - 0.5) * 0.5;
      n.y += (Math.random() - 0.5) * 0.5;

      // Keep inside canvas
      n.x = Math.max(10, Math.min(canvas.width - 10, n.x));
      n.y = Math.max(10, Math.min(canvas.height - 10, n.y));
    });

    draw();
    requestAnimationFrame(tick);
  }

  // --- Tooltip ---
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let hoverNode = null;
    for (const n of nodes) {
      const dx = n.x - mx;
      const dy = n.y - my;
      if (Math.sqrt(dx * dx + dy * dy) < 8) {
        hoverNode = n;
        break;
      }
    }

    const tooltip = document.getElementById("synapseTooltip");
    if (hoverNode && tooltip) {
      tooltip.style.display = "block";
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
      tooltip.innerHTML = `
        <strong>${hoverNode.label}</strong><br/>
        Skills: ${hoverNode.skills || ""}<br/>
        Interests: ${hoverNode.interests || ""}
      `;
    } else if (tooltip) {
      tooltip.style.display = "none";
    }
  });

  console.log(`[Synapse] Loaded ${nodes.length} nodes, ${edges.length} links`);
  tick();
}

// Init only once DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
