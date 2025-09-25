// assets/js/synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  const container = document.getElementById("synapseCanvas");
  if (!container) {
    console.warn("[Synapse] No canvas element found.");
    return;
  }

  const width = container.clientWidth || 900;
  const height = container.clientHeight || 600;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .call(
      d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
      })
    );

  const g = svg.append("g");

  const status = document.querySelector(".connection-status");
  if (!status) {
    console.warn("[Synapse] No connection-status element found.");
  }

  // === Fetch data from Supabase ===
  let members = [];
  let connections = [];
  try {
    const { data: community, error: memberError } = await supabase
      .from("community")
      .select("user_id, name, skills");

    if (memberError) throw memberError;
    members = community || [];

    const { data: conn, error: connError } = await supabase
      .from("connections")
      .select("from_user_id, to_user_id, created_at");

    if (connError) throw connError;
    connections = conn || [];

    if (status) {
      status.textContent = "Connected to Supabase ✅";
      status.style.opacity = 1;
    }

    console.log(`[Synapse] Loaded ${members.length} neurons from Supabase`);
  } catch (err) {
    console.error("[Synapse] Supabase error:", err);
    if (status) {
      status.textContent = "Supabase Error ❌ (showing fallback)";
      status.style.opacity = 1;
    }
    // fallback dummy data
    members = d3.range(20).map((i) => ({
      user_id: `dummy-${i}`,
      name: `User ${i + 1}`,
      skills: [],
    }));
    connections = [];
  }

  // === Build graph data ===
  const nodes = members.map((m, i) => ({
    id: m.user_id,
    label: m.name || `User ${i + 1}`,
    skills: m.skills || [],
  }));

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const links = (connections || []).map((c) => {
    const source = nodeById[c.from_user_id];
    const target = nodeById[c.to_user_id];
    if (source && target) {
      return { source, target, created_at: c.created_at };
    }
    return null;
  }).filter(Boolean);

  // === D3 Force Simulation ===
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-300))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // === Links ===
  const link = g.append("g")
    .attr("stroke", "rgba(255,255,255,0.3)")
    .attr("stroke-width", 1)
    .selectAll("line")
    .data(links)
    .enter()
    .append("line");

  // === Nodes ===
  const node = g.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", 8)
    .attr("fill", "#0ff")
    .call(drag(simulation));

  // Tooltips
  node.append("title").text((d) => d.label);

  // Labels
  const label = g.append("g")
    .selectAll("text")
    .data(nodes)
    .enter()
    .append("text")
    .attr("x", 12)
    .attr("y", "0.31em")
    .text((d) => d.label)
    .style("font-size", "12px")
    .style("fill", "#fff");

  simulation.on("tick", () => {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    label
      .attr("x", (d) => d.x + 12)
      .attr("y", (d) => d.y + 3);
  });

  console.log("%c[Synapse] View initialized ✅", "color: lime;");
}

// === Drag Support ===
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// === Initialize only when Synapse tab clicked ===
document.addEventListener("DOMContentLoaded", () => {
  const synapseTabBtn = document.querySelector('[data-tab="synapse"]');
  if (synapseTabBtn) {
    synapseTabBtn.addEventListener("click", () => {
      initSynapseView();
    }, { once: true });
  }
});
