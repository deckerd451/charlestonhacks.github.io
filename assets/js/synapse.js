// synapse.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { supabaseClient as supabase } from './supabaseClient.js';

let synapseInitialized = false;

export async function initSynapseView() {
  if (synapseInitialized) return;
  synapseInitialized = true;

  console.log('[Synapse] Initializing…');

  // === 1. Fetch community members ===
  const { data: members, error: memberError } = await supabase
    .from("community")
    .select("id, name, skills");

  if (memberError || !members) {
    console.error("[Synapse] Error fetching members:", memberError);
    return;
  }

  // === 2. Fetch connections ===
  const { data: connections, error: connError } = await supabase
    .from("connections")
    .select("from_user_id, to_user_id, created_at");

  if (connError) {
    console.error("[Synapse] Error fetching connections:", connError);
    return;
  }

  // === 3. Build graph data ===
  const nodes = members.map(m => ({
    id: m.id,
    label: m.name || "Unnamed",
    skills: m.skills || [],
  }));

  const links = (connections || []).map(c => ({
    source: c.from_user_id,
    target: c.to_user_id,
    created_at: c.created_at
  }));

  // === 4. Setup SVG ===
  const container = document.getElementById("synapseCanvas");
  if (!container) {
    console.error("[Synapse] No canvas container found.");
    return;
  }

  container.innerHTML = ""; // clear old renders

  const width = container.clientWidth;
  const height = container.clientHeight;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .call(
      d3.zoom()
        .scaleExtent([0.2, 4]) // smoother zoom range
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

  const g = svg.append("g");

  // === 5. Force Simulation ===
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(140))
    .force("charge", d3.forceManyBody().strength(-250))
    .force("center", d3.forceCenter(width / 2, height / 2));

  // === 6. Draw links ===
  const link = g.append("g")
    .attr("stroke", "rgba(255,255,255,0.3)")
    .attr("stroke-width", 1)
    .selectAll("line")
    .data(links)
    .join("line");

  // === 7. Tooltips ===
  const tooltip = d3.select("body").append("div")
    .attr("class", "synapse-tooltip")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "rgba(0,0,0,0.7)")
    .style("color", "#fff")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // === 8. Draw nodes ===
  const node = g.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .selectAll("circle")
    .data(nodes)
    .join("circle")
    .attr("r", 10)
    .attr("fill", "#00BFFF")
    .call(drag(simulation))
    .on("mouseover", (event, d) => {
      tooltip.transition().duration(150).style("opacity", 1);
      tooltip.html(`
        <b>${d.label}</b><br>
        Skills: ${Array.isArray(d.skills) ? d.skills.join(", ") : d.skills || "N/A"}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 20) + "px");
    })
    .on("mousemove", (event) => {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY - 20) + "px");
    })
    .on("mouseout", () => {
      tooltip.transition().duration(200).style("opacity", 0);
    })
    .on("click", handleNodeClick);

  // === 9. Labels ===
  const label = g.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(nodes)
    .join("text")
    .attr("dy", -12)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .style("font-size", "11px")
    .style("pointer-events", "none")
    .text(d => d.label);

  // === 10. Simulation tick ===
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
      .attr("x", d => d.x)
      .attr("y", d => d.y);
  });

  console.log(`[Synapse] Loaded ${nodes.length} nodes, ${links.length} links`);
  console.log("[Synapse] View initialized ✅");

  // === 11. Dragging helper ===
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

  // === 12. Click-to-Connect ===
  let firstSelected = null;

  async function handleNodeClick(event, d) {
    if (!firstSelected) {
      firstSelected = d;
      d3.select(this).attr("fill", "#FFD700"); // highlight
    } else if (firstSelected.id !== d.id) {
      try {
        const { error } = await supabase
          .from("connections")
          .insert([{ from_user_id: firstSelected.id, to_user_id: d.id }]);

        if (error) throw error;

        console.log(`[Synapse] Connection created: ${firstSelected.label} → ${d.label}`);
        link.data([...links, { source: firstSelected.id, target: d.id }]).join("line");
      } catch (err) {
        console.error("[Synapse] Error creating connection:", err.message);
      }
      d3.selectAll("circle").attr("fill", "#00BFFF");
      firstSelected = null;
    }
  }
}
