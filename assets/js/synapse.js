// synapse.js — Synapse View with HTML tooltips + zoom/pan
export function initSynapseView() {
  const canvas = document.getElementById("synapseCanvas");
  const ctx = canvas.getContext("2d");

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;

  // Tooltip element (reuse CSS .tooltip from your styles.css)
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip hidden";
  document.body.appendChild(tooltip);

  // Pan & Zoom
  let offsetX = 0, offsetY = 0;
  let scale = 1;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  // Graph Data
  const nodes = [];
  const edges = [];

  function addNode(id, x, y, label, imageUrl) {
    nodes.push({ id, x, y, label, imageUrl });
  }

  function addEdge(source, target) {
    edges.push({ source, target });
  }

  // Demo Data
  addNode(1, 100, 100, "Alice", "images/avatar1.png");
  addNode(2, 300, 200, "Bob", "images/avatar2.png");
  addNode(3, 200, 400, "Carol", "images/avatar3.png");
  addEdge(1, 2);
  addEdge(2, 3);

  // Drawing
  function draw() {
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(-offsetX / scale, -offsetY / scale, width / scale, height / scale);

    // Draw edges
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2 / scale;
    edges.forEach(e => {
      const src = nodes.find(n => n.id === e.source);
      const tgt = nodes.find(n => n.id === e.target);
      if (src && tgt) {
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.fillStyle = "#0ff";
      ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2 / scale;
      ctx.stroke();

      ctx.fillStyle = "white";
      ctx.font = `${14 / scale}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(n.label, n.x, n.y + 35 / scale);
    });

    ctx.restore();
    requestAnimationFrame(draw);
  }

  // Hit test
  function getNodeAt(x, y) {
    const radius = 20 / scale;
    return nodes.find(
      n => Math.hypot(x - n.x, y - n.y) < radius
    );
  }

  // Screen ↔ World coords
  function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (sx - rect.left - offsetX) / scale,
      y: (sy - rect.top - offsetY) / scale
    };
  }

  // Mouse move (hover tooltip)
  canvas.addEventListener("mousemove", e => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const node = getNodeAt(x, y);

    if (node) {
      tooltip.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${node.imageUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
          <div>
            <strong>${node.label}</strong><br>
            <span style="font-size:0.9em;opacity:0.8;">Click to connect</span>
          </div>
        </div>
      `;
      tooltip.classList.remove("hidden");
      tooltip.classList.add("visible");
      tooltip.style.left = e.pageX + 15 + "px";
      tooltip.style.top = e.pageY + 15 + "px";
    } else {
      tooltip.classList.remove("visible");
      tooltip.classList.add("hidden");
    }
  });

  // Mobile tap for tooltip
  canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    const { x, y } = screenToWorld(touch.clientX, touch.clientY);
    const node = getNodeAt(x, y);

    if (node) {
      tooltip.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${node.imageUrl}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
          <div>
            <strong>${node.label}</strong><br>
            <span style="font-size:0.9em;opacity:0.8;">Tap to connect</span>
          </div>
        </div>
      `;
      tooltip.classList.remove("hidden");
      tooltip.classList.add("visible");
      tooltip.style.left = touch.pageX + 15 + "px";
      tooltip.style.top = touch.pageY + 15 + "px";

      setTimeout(() => {
        tooltip.classList.remove("visible");
        tooltip.classList.add("hidden");
      }, 2000);
    }
  });

  // Zoom
  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const zoomFactor = 0.05;
    const zoom = e.deltaY < 0 ? (1 + zoomFactor) : (1 - zoomFactor);
    scale *= zoom;
    scale = Math.max(0.2, Math.min(5, scale));
  });

  // Drag to pan
  canvas.addEventListener("mousedown", e => {
    isDragging = true;
    dragStart.x = e.clientX - offsetX;
    dragStart.y = e.clientY - offsetY;
  });
  canvas.addEventListener("mouseup", () => isDragging = false);
  canvas.addEventListener("mouseleave", () => isDragging = false);
  canvas.addEventListener("mousemove", e => {
    if (isDragging) {
      offsetX = e.clientX - dragStart.x;
      offsetY = e.clientY - dragStart.y;
    }
  });

  // Resize
  function resizeCanvas() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = width;
    canvas.height = height;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  draw();
}
