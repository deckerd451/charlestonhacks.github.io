import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  const canvas = document.getElementById("synapseCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = canvas.width;
  let height = canvas.height;

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

  // ===== FETCH DATA =====
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills, bio, x, y");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  const nodes = members.map((m, i) => ({
    id: m.id,
    name: m.name || `User ${i + 1}`,
    skills: m.skills || "",
    bio: m.bio || "",
    x: m.x ?? Math.random() * width,
    y: m.y ?? Math.random() * height,
    vx: 0,
    vy: 0,
    radius: 14
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
      edges.push({ source: src, target: tgt });
    }
  });

  // ===== FORCE LAYOUT PARAMS =====
  const repulsion = 2000;
  const springLength = 120;
  const springStrength = 0.02;
  const damping = 0.85;

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
    });
  }

  // ===== INTERACTION =====
  let draggingNode = null;
  let hoverNode = null;
  let pendingConnection = null;
  let isPanning = false;
  let startPanX, startPanY;

  function getNodeAt(x, y) {
    return nodes.find(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) < n.radius;
    });
  }

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

  canvas.addEventListener("mouseup", async e => {
    if (draggingNode) {
      await supabase.from("community")
        .update({ x: draggingNode.x, y: draggingNode.y })
        .eq("id", draggingNode.id);
      draggingNode = null;
      return;
    }
    isPanning = false;

    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(x, y);
    if (node) {
      if (!pendingConnection) {
        pendingConnection = node;
      } else if (pendingConnection.id !== node.id) {
        await supabase.from("connections")
          .insert([{ from_id: pendingConnection.id, to_id: node.id }]);
        edges.push({ source: pendingConnection, target: node });
        pendingConnection = null;
      }
    }
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoom = e.deltaY < 0 ? 1.1 : 0.9;
    scale *= zoom;
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

    // nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, 2 * Math.PI);
      ctx.fillStyle = (n === hoverNode) ? "#ff0" : "#0ff";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "11px sans-serif";
      ctx.fillText(n.name, n.x + n.radius + 4, n.y + 4);
    });

    // tooltip
    if (hoverNode) {
      const lines = [`${hoverNode.skills}`, `${hoverNode.bio}`].filter(Boolean);
      if (lines.length) {
        const width = Math.max(...lines.map(l => ctx.measureText(l).width)) + 10;
        const height = lines.length * 16 + 10;
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(hoverNode.x + 20, hoverNode.y - 10, width, height);
        ctx.fillStyle = "#fff";
        lines.forEach((l, i) => {
          ctx.fillText(l, hoverNode.x + 25, hoverNode.y + 10 + i * 16);
        });
      }
    }

    ctx.restore();
  }

  function tick() {
    applyForces();
    draw();
    requestAnimationFrame(tick);
  }

  tick();
}

// Hook up init to Synapse tab
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
