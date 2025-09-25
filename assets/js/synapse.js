import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const statusEl = document.getElementById("connection-status");

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  // ===== RESIZE HANDLER =====
  function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    width = canvas.width;
    height = canvas.height;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // ===== CAMERA (zoom/pan) =====
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function applyTransform() {
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
  }
  function screenToWorld(x, y) {
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale
    };
  }

  // ===== STATUS BAR HELPERS =====
  function showStatus(msg, color = "gold") {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.background = color;
    statusEl.classList.remove("hidden");
  }
  function hideStatus() {
    if (!statusEl) return;
    statusEl.textContent = "";
    statusEl.classList.add("hidden");
  }

  // ===== FETCH DATA =====
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills, bio, availability, endorsements, x, y");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  // Scale endorsements into radius
  const endorsementsArray = members.map(m => m.endorsements || 0);
  const minEnd = Math.min(...endorsementsArray);
  const maxEnd = Math.max(...endorsementsArray);
  function scaleRadius(val) {
    if (maxEnd === minEnd) return 14;
    const norm = (val - minEnd) / (maxEnd - minEnd);
    return 10 + norm * 20; // between 10 and 30px
  }

  const nodes = members.map((m, i) => ({
    id: m.id,
    name: m.name || `User ${i + 1}`,
    skills: m.skills || "",
    bio: m.bio || "",
    availability: m.availability || "Available",
    endorsements: m.endorsements || 0,
    x: m.x ?? Math.random() * width,
    y: m.y ?? Math.random() * height,
    vx: 0,
    vy: 0,
    radius: scaleRadius(m.endorsements || 0)
  }));
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("from_id, to_id");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  const edges = [];
  (connections || []).forEach(c => {
    const src = nodeById[c.from_id];
    const tgt = nodeById[c.to_id];
    if (src && tgt) {
      if (!edges.find(e => (e.source.id === src.id && e.target.id === tgt.id) ||
                           (e.source.id === tgt.id && e.target.id === src.id))) {
        edges.push({ source: src, target: tgt });
      }
    }
  });

  // ===== FORCE LAYOUT =====
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
    });
  }

  // ===== INTERACTION =====
  let draggingNode = null;
  let hoverNode = null;
  let pendingConnection = null;
  let isPanning = false;
  let startPanX, startPanY;
  let mouseWorld = { x: 0, y: 0 };
  let touchMode = false;

  // --- batch save positions ---
  let saveTimeout = null;
  function scheduleSave(node) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      await supabase.from("community")
        .update({ x: node.x, y: node.y })
        .eq("id", node.id);
      saveTimeout = null;
    }, 1200);
  }

  function getNodeAt(x, y) {
    return nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < n.radius;
    });
  }

  // Desktop events
  canvas.addEventListener("mousedown", e => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(x, y);
    if (node) {
      draggingNode = node;
    } else {
      isPanning = true;
      startPanX = e.clientX;
      startPanY = e.clientY;
    }
  });

  canvas.addEventListener("mousemove", e => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    mouseWorld = { x, y };
    hoverNode = getNodeAt(x, y);

    if (draggingNode) {
      draggingNode.x = x;
      draggingNode.y = y;
    } else if (isPanning) {
      offsetX += e.clientX - startPanX;
      offsetY += e.clientY - startPanY;
      startPanX = e.clientX;
      startPanY = e.clientY;
    }
  });

  canvas.addEventListener("mouseup", e => {
    if (draggingNode) {
      scheduleSave(draggingNode);
      draggingNode = null;
      return;
    }
    isPanning = false;

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(x, y);
    if (node) {
      if (!pendingConnection) {
        pendingConnection = node;
        showStatus("Select another node to connect, or cancel.", "gold");
      } else if (pendingConnection.id !== node.id) {
        if (!edges.find(e => (e.source.id === pendingConnection.id && e.target.id === node.id) ||
                             (e.source.id === node.id && e.target.id === pendingConnection.id))) {
          supabase.from("connections")
            .insert([{ from_id: pendingConnection.id, to_id: node.id }]);
          edges.push({ source: pendingConnection, target: node });
        }
        pendingConnection = null;
        showStatus("Connection created!", "limegreen");
        setTimeout(hideStatus, 1500);
      }
    }
  });

  // Zoom smoothing
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const zoom = e.deltaY < 0 ? (1 + zoomFactor) : (1 - zoomFactor);
    scale *= zoom;
    scale = Math.max(0.2, Math.min(5, scale));
  });

  // ===== RENDER =====
  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    applyTransform();

    // edges
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    edges.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
    });

    // pending connection line
    if (pendingConnection) {
      ctx.beginPath();
      ctx.moveTo(pendingConnection.x, pendingConnection.y);
      ctx.lineTo(mouseWorld.x, mouseWorld.y);
      ctx.strokeStyle = "rgba(255,255,0,0.6)";
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // nodes with availability colors and endorsements sizing
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);

      let fillColor = "#0ff";
      if (n.availability === "Available") fillColor = "limegreen";
      else if (n.availability === "Busy") fillColor = "orange";
      else if (n.availability === "Not Looking") fillColor = "gray";

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.fillText(n.name, n.x + n.radius + 4, n.y + 4);
    });

    // ===== TOOLTIP (desktop only) =====
    if (hoverNode && !touchMode) {
      const lines = [
        `Skills: ${hoverNode.skills || "N/A"}`,
        hoverNode.bio ? `Bio: ${hoverNode.bio}` : null,
        `Endorsements: ${hoverNode.endorsements}`
      ].filter(Boolean);

      const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 10;
      const h = lines.length * 16 + 10;

      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(hoverNode.x + 20, hoverNode.y - 10, w, h);

      ctx.fillStyle = "#fff";
      lines.forEach((l, i) => {
        ctx.fillText(l, hoverNode.x + 25, hoverNode.y + 10 + i * 16);
      });
    }

    ctx.restore();
  }

  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }

  tick();

  // ===== AUTO-CENTER GRAPH =====
  setTimeout(() => {
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;

    const scaleX = (width * 0.8) / graphWidth;
    const scaleY = (height * 0.8) / graphHeight;
    scale = Math.min(scaleX, scaleY);

    offsetX = width / 2 - ((minX + maxX) / 2) * scale;
    offsetY = height / 2 - ((minY + maxY) / 2) * scale;
  }, 500);
}

// Hook init to Synapse tab
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
