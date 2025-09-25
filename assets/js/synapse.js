// assets/js/synapse.js
import { supabaseClient as supabase } from "./supabaseClient.js";

let synapseInitialized = false;
let currentUser = null;
let clickedNode = null;

// Load logged-in user once
async function loadCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (!error && data?.user) {
    currentUser = data.user;
    console.log("[Synapse] Logged in as:", currentUser.email);
  } else {
    currentUser = null;
    console.log("[Synapse] No active user");
  }
}

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  await loadCurrentUser();

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const width = canvas.width;
  const height = canvas.height;

  // === Fetch community members ===
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills, image_url");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  const nodes = members.map((m, i) => ({
    id: m.id,
    label: m.name || `User ${i + 1}`,
    skills: m.skills ? m.skills.split(",").map(s => s.trim()) : [],
    image_url: m.image_url || null,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: 0,
    vy: 0,
    endorsements: 0
  }));

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // === Fetch connections ===
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("from_id, to_id, created_at");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
  }

  const edges = [];
  (connections || []).forEach(c => {
    const src = nodeById[c.from_id];
    const tgt = nodeById[c.to_id];
    if (src && tgt) {
      edges.push({ source: src, target: tgt, created_at: c.created_at });
    }
  });

  // === Physics constants ===
  const repulsion = 2000;
  const springLength = 120;
  const springStrength = 0.02;
  const damping = 0.85;

  // === Tooltip + profile card ===
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip hidden";
  document.body.appendChild(tooltip);

  function showProfile(node) {
    clickedNode = node;
    tooltip.innerHTML = `
      <div><strong>${node.label}</strong></div>
      ${node.skills.length ? `<div>Skills: ${node.skills.join(", ")}</div>` : ""}
      <button id="connect-btn">Connect</button>
      <button id="endorse-btn">Endorse</button>
    `;
    tooltip.classList.remove("hidden");

    // Wire up buttons
    document.getElementById("connect-btn").onclick = async () => {
      if (!currentUser) {
        alert("Please log in to connect with others.");
        return;
      }
      const { error } = await supabase
        .from("connections")
        .insert([{ from_id: currentUser.id, to_id: node.id }]);
      if (error) {
        console.error("[Synapse] Connection error:", error);
        alert("Failed to connect.");
      } else {
        alert(`Connected to ${node.label}!`);
      }
    };

    document.getElementById("endorse-btn").onclick = async () => {
      if (!currentUser) {
        alert("Please log in to endorse skills.");
        return;
      }
      const skill = node.skills?.[0];
      if (!skill) {
        alert("No skill available for endorsement.");
        return;
      }

      // Check if already endorsed
      const { data: existing, error: checkError } = await supabase
        .from("endorsements")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("target_id", node.id)
        .eq("skill", skill)
        .maybeSingle();

      if (existing) {
        alert(`You already endorsed ${node.label} for ${skill}.`);
        return;
      }
      if (checkError && checkError.code !== "PGRST116") {
        console.error("[Synapse] Endorsement check error:", checkError);
        alert("Error checking endorsement status.");
        return;
      }

      // Insert endorsement
      const { error } = await supabase
        .from("endorsements")
        .insert([{ user_id: currentUser.id, target_id: node.id, skill }]);

      if (error) {
        console.error("[Synapse] Endorsement error:", error);
        alert("Failed to endorse.");
      } else {
        alert(`Endorsed ${node.label} for ${skill}!`);
        node.endorsements++;
        showProfile(node);
      }
    };
  }

  // === Force simulation ===
  function applyForces() {
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

    nodes.forEach(n => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(10, Math.min(width - 10, n.x));
      n.y = Math.max(10, Math.min(height - 10, n.y));
    });
  }

  // === Drawing ===
  function draw() {
    ctx.clearRect(0, 0, width, height);

    ctx.lineWidth = 1;
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.stroke();
    });

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

  // === Interaction ===
  let hoveredNode = null;
  canvas.addEventListener("mousemove", e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredNode = nodes.find(n =>
      Math.hypot(mx - n.x, my - n.y) < 8
    );
    if (hoveredNode) {
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
      showProfile(hoveredNode);
    } else {
      tooltip.classList.add("hidden");
    }
  });

  // === Main loop ===
  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }
  tick();
}

// Initialize only when Synapse tab clicked
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
