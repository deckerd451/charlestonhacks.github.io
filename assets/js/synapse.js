// synapse.js
// Full interactive Synapse View with Supabase integration, D3.js force simulation,
// zoom/pan, drag, tooltips, click-to-connect, responsive behavior, node images, and fallback.
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import { supabaseClient as supabase } from './supabaseClient.js';

let simulation;
let selectedNode = null; // for click-to-connect

// Initialize Synapse View
export async function initSynapseView() {
  console.log('[Synapse] Initializing…');

  const container = document.getElementById('synapseCanvas');
  if (!container) {
    console.error('[Synapse] No #synapseCanvas found in DOM.');
    return;
  }

  // Clear container
  container.innerHTML = '';

  // Setup SVG
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 600;

  const svgRoot = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height])
    .style('background', '#111');

  const g = svgRoot.append('g'); // ✅ group before zoom

  svgRoot.call(
    d3.zoom().on('zoom', (event) => {
      g.attr('transform', event.transform);
    })
  );

  // Tooltip
  const tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'synapse-tooltip')
    .style('position', 'absolute')
    .style('padding', '6px 10px')
    .style('background', 'rgba(0,0,0,0.75)')
    .style('color', '#fff')
    .style('border-radius', '6px')
    .style('pointer-events', 'none')
    .style('font-size', '12px')
    .style('opacity', 0);

  // Fetch nodes
  const { data: nodes, error: nodeError } = await supabase
    .from('community')
    .select('id, name, skills, interests, image_url'); // ✅ schema-safe

  // Fetch connections
  const { data: links, error: linkError } = await supabase
    .from('connections')
    .select('from_user_id, to_user_id');

  if (nodeError) {
    console.error('[Synapse] Error fetching nodes:', nodeError);
    return;
  }
  if (linkError) {
    console.error('[Synapse] Error fetching links:', linkError);
    return;
  }

  if (!nodes || nodes.length === 0) {
    console.warn('[Synapse] No community nodes found.');
    showFallback(container, 'No community members available');
    return;
  }

  const d3Links = (links || []).map((l) => ({
    source: l.from_user_id,
    target: l.to_user_id,
  }));

  console.log(`[Synapse] Loaded ${nodes.length} nodes, ${d3Links.length} links`);

  // Draw links
  const link = g
    .append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(d3Links)
    .enter()
    .append('line')
    .attr('stroke-width', 1.5);

  // Node container groups (circle + optional image)
  const node = g
    .selectAll('g.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(
      d3
        .drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    )
    .on('mouseover', (event, d) => {
      tooltip
        .style('opacity', 1)
        .html(
          `<strong>${d.name}</strong><br/>
           ${d.skills || ''}<br/>
           ${d.interests || ''}`
        );
    })
    .on('mousemove', (event) => {
      tooltip
        .style('top', event.pageY + 10 + 'px')
        .style('left', event.pageX + 10 + 'px');
    })
    .on('mouseout', () => tooltip.style('opacity', 0))
    .on('click', async (event, d) => {
      await handleNodeClick(d, node);
    });

  // Add circle background
  node
    .append('circle')
    .attr('r', 18) // ✅ larger circle for image fit
    .attr('fill', (d) => (d.image_url ? '#222' : '#ff4081')) // fallback if no image
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5);

  // Add profile images (clip-path circle mask)
  node
    .append('clipPath')
    .attr('id', (d) => `clip-${d.id}`)
    .append('circle')
    .attr('r', 18);

  node
    .append('image')
    .attr('xlink:href', (d) => d.image_url || '')
    .attr('width', 36)
    .attr('height', 36)
    .attr('x', -18)
    .attr('y', -18)
    .attr('clip-path', (d) => `url(#clip-${d.id})`)
    .attr('preserveAspectRatio', 'xMidYMid slice')
    .style('display', (d) => (d.image_url ? 'block' : 'none'));

  // Labels
  const label = g
    .append('g')
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .text((d) => d.name)
    .attr('font-size', 10)
    .attr('dx', 20)
    .attr('dy', '.35em')
    .style('fill', '#fff');

  // Force simulation
  simulation = d3
    .forceSimulation(nodes)
    .force('link', d3.forceLink(d3Links).id((d) => d.id).distance(140))
    .force('charge', d3.forceManyBody().strength(-350))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .on('tick', ticked);

  function ticked() {
    link
      .attr('x1', (d) => d.source.x)
      .attr('y1', (d) => d.source.y)
      .attr('x2', (d) => d.target.x)
      .attr('y2', (d) => d.target.y);

    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    label.attr('x', (d) => d.x).attr('y', (d) => d.y);
  }

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  console.log('[Synapse] View initialized ✅ with images');
}

// Handle node click for connections
async function handleNodeClick(d, nodeSelection) {
  if (!selectedNode) {
    selectedNode = d;
    console.log(`[Synapse] Selected source: ${d.name}`);
    highlightNode(d.id, nodeSelection, true);
  } else if (selectedNode.id === d.id) {
    console.log('[Synapse] Deselected node');
    highlightNode(d.id, nodeSelection, false);
    selectedNode = null;
  } else {
    console.log(`[Synapse] Connecting ${selectedNode.name} → ${d.name}`);

    // Insert into Supabase
    const { error } = await supabase.from('connections').insert([
      {
        from_user_id: selectedNode.id,
        to_user_id: d.id,
      },
    ]);

    if (error) {
      console.error('[Synapse] Error creating connection:', error.message);
    } else {
      console.log('[Synapse] Connection created successfully ✅');
    }

    // Reset selection
    highlightNode(selectedNode.id, nodeSelection, false);
    selectedNode = null;
  }
}

// Highlight node when selected
function highlightNode(id, nodeSelection, active) {
  nodeSelection
    .filter((n) => n.id === id)
    .select('circle')
    .attr('stroke', active ? 'yellow' : '#fff')
    .attr('stroke-width', active ? 3 : 1.5);
}

// Fallback message
function showFallback(container, message) {
  container.innerHTML = `<div style="color: white; text-align: center; padding: 20px;">${message}</div>`;
}
