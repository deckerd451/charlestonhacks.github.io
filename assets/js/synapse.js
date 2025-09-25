// assets/js/synapse.js
import { supabaseClient as supabase } from "./supabaseClient.js";

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - getHeaderHeight();
  }
  function getHeaderHeight() {
    const rootStyles = getComputedStyle(document.documentElement);
    return parseInt(rootStyles.getPropertyValue("--header-height") || "100", 10);
  }

  // === Fetch members ===
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, role, skills, image_url, endorsements");

  if (memberError) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  const nodes = members.map((m, i) => ({
    id: m.id,
    label: m.name || `User ${i + 1}`,
    role: m.role || "Member",
    skills: m.skills || [],
    image: m.image_url || null,
    endorsements: m.endorsements || 0,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: 0,
    vy: 0,
  }));
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  // === Fetch connections ===
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("from_id, to_id");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  const edges = [];
  (connections || []).forEach((c) => {
    const src = nodeById[c.from_id];
    const tgt = nodeById[c.to_id];
    if (src && tgt) edges.push({ source: src, target: tgt });
  });

  // === Forces ===
  const repulsion = 2000;
  const springLength = 120;
  const springStrength = 0.02;
  const damping = 0.85;

  function applyForces() {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const distSq = dx * dx + dy * dy;
        if (!distSq) continue;
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

    edges.forEach((e) => {
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

    nodes.forEach((n) => {
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
    });
  }

  // === Interaction ===
  let hoveredNode = null;
  let draggedNode = null;
  let offsetX = 0, offsetY = 0;

  const tooltip = document.createElement("div");
  tooltip.id = "neuron-tooltip";
  tooltip.classList.add("tooltip", "hidden");
  document.body.appendChild(tooltip);

  const profileCard = document.createElement("div");
  profileCard.id = "profile-card";
  profileCard.classList.add("hidden");
  document.body.appendChild(profileCard);

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredNode = nodes.find((n) => Math.hypot(mx - n.x, my - n.y) < 10);
    if (hoveredNode) {
      tooltip.classList.remove("hidden");
      tooltip.style.left = `${e.pageX + 15}px`;
      tooltip.style.top = `${e.pageY + 15}px`;
      tooltip.innerHTML = `
        ${hoveredNode.image ? `<img src="${hoveredNode.image}" style="width:40px;height:40px;border-radius:50%;margin-bottom:6px;" />` : ""}
        <div class="member-name">${hoveredNode.label}</div>
        <div class="user-status">${hoveredNode.role}</div>
        <div class="skill-tags">${Array.isArray(hoveredNode.skills) ? hoveredNode.skills.map(s => `<span class="skill-tag">${s}</span>`).join("") : ""}</div>
      `;
    } else {
      tooltip.classList.add("hidden");
    }
  });

  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    draggedNode = nodes.find((n) => Math.hypot(mx - n.x, my - n.y) < 10);
    if (draggedNode) {
      offsetX = mx - draggedNode.x;
      offsetY = my - draggedNode.y;
    }
  });
  canvas.addEventListener("mouseup", () => (draggedNode = null));
  canvas.addEventListener("mouseleave", () => (draggedNode = null));
  canvas.addEventListener("mousemove", (e) => {
    if (draggedNode) {
      const rect = canvas.getBoundingClientRect();
      draggedNode.x = e.clientX - rect.left - offsetX;
      draggedNode.y = e.clientY - rect.top - offsetY;
    }
  });

  // === Click to show profile card ===
  canvas.addEventListener("click", async (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const clickedNode = nodes.find((n) => Math.hypot(mx - n.x, my - n.y) < 10);
    if (clickedNode) {
      profileCard.classList.remove("hidden");
      profileCard.style.position = "fixed";
      profileCard.style.bottom = "20px";
      profileCard.style.right = "20px";
      profileCard.style.background = "rgba(0,0,0,0.9)";
      profileCard.style.color = "#fff";
      profileCard.style.padding = "16px";
      profileCard.style.border = "1px solid #0ff";
      profileCard.style.borderRadius = "10px";
      profileCard.style.width = "260px";
      profileCard.innerHTML = `
        ${clickedNode.image ? `<img src="${clickedNode.image}" style="width:60px;height:60px;border-radius:50%;margin-bottom:8px;" />` : ""}
        <h3>${clickedNode.label}</h3>
        <p>${clickedNode.role}</p>
        <div class="skill-tags">${Array.isArray(clickedNode.skills) ? clickedNode.skills.map(s => `<span class="skill-tag">${s}</span>`).join("") : ""}</div>
        <div class="endorsements">⭐ ${clickedNode.endorsements || 0}</div>
        <button id="endorse-btn">Endorse</button>
        <button id="connect-btn">Connect</button>
      `;

      // endorse button
      document.getElementById("endorse-btn").onclick = async () => {
        const { error } = await supabase
          .from("community")
          .update({ endorsements: (clickedNode.endorsements || 0) + 1 })
          .eq("id", clickedNode.id);
        if (!error) {
          clickedNode.endorsements++;
          profileCard.querySelector(".endorsements").textContent = `⭐ ${clickedNode.endorsements}`;
        }
      };

      // connect button
      document.getElementById("connect-btn").onclick = async () => {
        const { error } = await supabase
          .from("connections")
          .insert([{ from_id: "CURRENT_USER_ID", to_id: clickedNode.id }]);
        if (!error) {
          alert(`Connected to ${clickedNode.label}!`);
        }
      };
    }
  });

  // === Zoom ===
  let scale = 1;
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomIntensity = 0.1;
    const wheel = e.deltaY < 0 ? 1 : -1;
    const zoom = Math.exp(wheel * zoomIntensity);
    scale *= zoom;
    ctx.scale(zoom, zoom);
  });

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    edges.forEach((e) => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
    });

    nodes.forEach((n) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = n === hoveredNode ? "#0ff" : "#FFD700";
      ctx.fill();
    });

    ctx.restore();
  }

  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }

  tick();
}

// attach to tab
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
