// synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

let simulation, svg, linkElements, nodeElements, labelElements;
let tooltip;
let nodes = [];
let links = [];
let pendingConnection = null;

/**
 * Initialize Synapse View
 */
export async function initSynapseView() {
  console.log('[Synapse] Initializing…');

  // Setup container
  const container = document.getElementById('synapseCanvas');
  container.innerHTML = '';

  svg = d3
    .select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%');

  const svgGroup = svg.append('g');

  // Zoom support
  svg.call(
    d3.zoom().on('zoom', (event) => {
      svgGroup.attr('transform', event.transform);
    })
  );

  // Tooltip
  tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip hidden');

  // Load initial data
  nodes = await fetchNodes();
  links = await fetchLinks();

  // Draw graph
  drawGraph(svgGroup);

  // Setup real-time subscriptions
  subscribeRealtime();

  console.log('[Synapse] View ready ✅');
}

/**
 * Fetch all community members
 */
async function fetchNodes() {
  const { data, error } = await supabase
    .from('community')
    .select('id, name, skills');

  if (error) {
    console.error('[Synapse] Error fetching nodes:', error);
    return [];
  }
  return data.map((d) => ({
    id: d.id,
    name: d.name,
    skills: d.skills,
  }));
}

/**
 * Fetch all connections
 */
async function fetchLinks() {
  const { data, error } = await supabase
    .from('connections')
    .select('from_user_id, to_user_id');

  if (error) {
    console.error('[Synapse] Error fetching links:', error);
    return [];
  }
  return data.map((d) => ({
    source: d.from_user_id,
    target: d.to_user_id,
  }));
}

/**
 * Draw graph with D3
 */
function drawGraph(svgGroup) {
  simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3.forceLink(links).id((d) => d.id).distance(120)
    )
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2))
    .on('tick', ticked);

  // Links
  linkElements = svgGroup
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.5);

  // Nodes
  nodeElements = svgGroup
    .selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', 12)
    .attr('fill', '#00CFFF')
    .call(
      d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    )
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', handleClick);

  // Labels
  labelElements = svgGroup
    .selectAll('text')
    .data(nodes)
    .enter()
    .append('text')
    .text((d) => d.name)
    .attr('font-size', 12)
    .attr('dx', 15)
    .attr('dy', 4)
    .attr('fill', '#fff');
}

/**
 * Simulation tick update
 */
function ticked() {
  linkElements
    .attr('x1', (d) => d.source.x)
    .attr('y1', (d) => d.source.y)
    .attr('x2', (d) => d.target.x)
    .attr('y2', (d) => d.target.y);

  nodeElements.attr('cx', (d) => d.x).attr('cy', (d) => d.y);

  labelElements.attr('x', (d) => d.x).attr('y', (d) => d.y);
}

/**
 * Create connection in Supabase
 */
async function createConnection(fromUserId, toUserId) {
  const { error } = await supabase.from('connections').insert([
    { from_user_id: fromUserId, to_user_id: toUserId },
  ]);

  if (error) {
    if (error.code === '23505') {
      console.log('[Synapse] Duplicate connection ignored.');
    } else {
      console.error('[Synapse] Error creating connection:', error);
    }
  } else {
    console.log(`[Synapse] Connection created: ${fromUserId} → ${toUserId}`);
  }
}

/**
 * Click-to-connect
 */
function handleClick(event, d) {
  if (!pendingConnection) {
    pendingConnection = d;
    console.log(`[Synapse] Selected ${d.name}`);
  } else {
    if (pendingConnection.id !== d.id) {
      createConnection(pendingConnection.id, d.id);
    }
    pendingConnection = null;
  }
}

/**
 * Drag handlers
 */
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

/**
 * Tooltip handlers
 */
function handleMouseOver(event, d) {
  tooltip
    .classed('hidden', false)
    .html(`<strong>${d.name}</strong><br/>Skills: ${d.skills || 'N/A'}`)
    .style('left', `${event.pageX + 10}px`)
    .style('top', `${event.pageY - 20}px`);
}

function handleMouseOut() {
  tooltip.classed('hidden', true);
}

/**
 * Realtime sync with Supabase
 */
function subscribeRealtime() {
  console.log('[Synapse] Subscribing to realtime changes…');

  // New users
  supabase
    .channel('community-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community' }, (payload) => {
      console.log('[Synapse] User added:', payload.new);
      nodes.push(payload.new);
      restartSimulation();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community' }, (payload) => {
      console.log('[Synapse] User deleted:', payload.old);
      nodes = nodes.filter((n) => n.id !== payload.old.id);
      links = links.filter(
        (l) => l.source.id !== payload.old.id && l.target.id !== payload.old.id
      );
      restartSimulation();
    })
    .subscribe();

  // Connections
  supabase
    .channel('connection-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'connections' }, (payload) => {
      console.log('[Synapse] Connection added:', payload.new);
      links.push({
        source: payload.new.from_user_id,
        target: payload.new.to_user_id,
      });
      restartSimulation();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'connections' }, (payload) => {
      console.log('[Synapse] Connection deleted:', payload.old);
      links = links.filter(
        (l) =>
          !(
            l.source.id === payload.old.from_user_id &&
            l.target.id === payload.old.to_user_id
          )
      );
      restartSimulation();
    })
    .subscribe();
}

/**
 * Restart simulation with updated data
 */
function restartSimulation() {
  simulation.nodes(nodes);
  simulation.force('link').links(links);

  // Update links
  linkElements = linkElements.data(links);
  linkElements.exit().remove();
  linkElements = linkElements
    .enter()
    .append('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 1.5)
    .merge(linkElements);

  // Update nodes
  nodeElements = nodeElements.data(nodes, (d) => d.id);
  nodeElements.exit().remove();
  nodeElements = nodeElements
    .enter()
    .append('circle')
    .attr('r', 12)
    .attr('fill', '#00CFFF')
    .call(
      d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded)
    )
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', handleClick)
    .merge(nodeElements);

  // Update labels
  labelElements = labelElements.data(nodes, (d) => d.id);
  labelElements.exit().remove();
  labelElements = labelElements
    .enter()
    .append('text')
    .text((d) => d.name)
    .attr('font-size', 12)
    .attr('dx', 15)
    .attr('dy', 4)
    .attr('fill', '#fff')
    .merge(labelElements);

  simulation.alpha(1).restart();
}
