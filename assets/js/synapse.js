// synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

export async function initSynapseView() {
  const container = document.getElementById("synapse");
  const statusEl = document.getElementById("connection-status");

  if (!container) {
    console.error("[Synapse] No #synapse container found.");
    return;
  }
  container.innerHTML = "";

  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .call(d3.zoom().scaleExtent([0.3, 3]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    }));

  const g = svg.append("g");

  let nodes = [];
  let links = [];

  let selectedNode = null; // <-- for click-to-connect

  async function loadData() {
    try {
      const { data: members, error: memberError } = await supabase
        .from("community")
        .select("id, name, role");

      if (memberError || !members || members.length === 0) {
        setStatus("Fallback Mode", "yellow");
        return fallbackNodes();
      }

      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("from_id, to_id");

      if (connError) {
        setStatus("Error loading connections", "red");
        return fallbackNodes();
      }

      nodes = members.map((m, i) => ({
        id: m.id,
        label: m.name || `User ${i + 1}`,
        role: m.role || "Member"
      }));

      links = (connections || [])
        .map(c => ({ source: c.from_id, target: c.to_id }))
        .filter(l => nodes.find(n => n.id === l.source) && nodes.find(n => n.id === l.target));

      setStatus("Connected", "green");
    } catch (err) {
      console.error("[Synapse] Error:", err);
      setStatus("Supabase Error", "red");
      fallbackNodes();
    }
  }

  function fallbackNodes() {
    nodes = [];
    const cols = 5, rows = 3;
    const spacingX = width / (cols + 1);
    const spacingY = height / (rows + 1);

    for (let i = 1; i <= cols; i++) {
      for (let j = 1; j <= rows; j++) {
        nodes.push({
          id: `fallback-${i}-${j}`,
          label: `Node ${i}-${j}`,
          role: "Fallback"
        });
      }
    }

    links = [];
    nodes.forEach((n, i) => {
      if (i > 0) links.push({ source: nodes[i - 1].id, target: n.id });
    });
  }

  function setStatus(text, color) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.style.background =
      color === "green"
        ? "rgba(0,255,0,0.7)"
        : color === "red"
        ? "rgba(255,0,0,0.7)"
        : "rgba(255,215,0,0.7)";
    statusEl.classList.remove("hidden");
  }

  function runSimulation() {
    const link = g.append("g")
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(links)
      .enter().append("line");

    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .enter().append("circle")
      .attr("r", 8)
      .attr("fill", "#0ff")
      .call(drag(simulation));

    const label = g.append("g")
      .selectAll("text")
      .data(nodes)
      .enter().append("text")
      .text(d => d.label)
      .attr("x", 12)
      .attr("y", 3)
      .attr("fill", "white")
      .style("font-size", "12px");

    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip hidden");

    node.on("mouseover", (event, d) => {
      tooltip.classed("hidden", false).classed("visible", true)
        .html(`<strong>${d.label}</strong><br/>${d.role}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    }).on("mouseout", () => {
      tooltip.classed("hidden", true).classed("visible", false);
    }).on("click", async (event, d) => {
      if (!selectedNode) {
        selectedNode = d;
        d3.select(event.target).attr("fill", "orange"); // highlight selection
      } else if (selectedNode.id !== d.id) {
        const from_id = selectedNode.id;
        const to_id = d.id;

        // Reset selection color
        d3.selectAll("circle").attr("fill", "#0ff");
        selectedNode = null;

        // Check if link exists
        if (links.find(l => (l.source.id || l.source) === from_id && (l.target.id || l.target) === to_id)) {
          console.warn("[Synapse] Connection already exists.");
          return;
        }

        // Insert into Supabase
        try {
          const { error } = await supabase
            .from("connections")
            .insert([{ from_id, to_id }]);

          if (error) {
            console.error("[Synapse] Error inserting connection:", error);
            setStatus("Error saving connection", "red");
            return;
          }

          // Optimistic update
          links.push({ source: from_id, target: to_id });
          link.data(links).enter().append("line")
            .attr("stroke", "rgba(255,255,255,0.3)")
            .attr("stroke-width", 1);
          setStatus("Connection added", "green");
        } catch (err) {
          console.error("[Synapse] Insert failed:", err);
          setStatus("Supabase Error", "red");
        }
      }
    });

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      label
        .attr("x", d => d.x + 12)
        .attr("y", d => d.y + 3);
    });
  }

  function drag(simulation) {
    return d3.drag()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  await loadData();
  runSimulation();
  console.log("%c[Synapse] View initialized with click-to-connect ✅", "color: lime; font-weight: bold;");
}
