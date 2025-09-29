// synapse.js

/*
 * Synapse View
 *
 * This module renders a simple network graph onto the `<canvas id="synapseCanvas">`
 * element on the page.  It pulls data from Supabase to build nodes (users)
 * and edges (connections between users) and lays them out in a radial
 * arrangement.  If Supabase is unavailable or returns no data, a fallback
 * message is drawn instead.
 */

import { supabaseClient as supabase } from './supabaseClient.js';

/**
 * Initialize and render the synapse view.  Call this after the DOM has
 * finished loading.  It resizes the canvas to match its CSS size and then
 * draws either the network or a fallback message.
 */
export async function initSynapseView() {
  const canvas = document.getElementById('synapseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Adjust canvas dimensions to CSS size to avoid blurriness on high‑DPI
  // displays.  clientWidth/clientHeight reflect the styled size.
  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Helper to draw a fallback message when no graph data is available.
  function drawFallback(message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, canvas.clientWidth / 2, canvas.clientHeight / 2);
    ctx.restore();
  }

  // Fetch nodes (users) and edges (connections) from Supabase.
  let nodes = [];
  let edges = [];
  try {
    // Fetch a list of users with id and name.  Adjust field names if your
    // database uses different column names.
    const { data: community, error: communityError } = await supabase
      .from('community')
      .select('user_id, name');
    if (communityError) throw communityError;

    nodes = (community || []).map((u, index) => ({
      id: u.user_id,
      label: u.name || `User ${u.user_id}`,
      // Position will be assigned later
      x: 0,
      y: 0,
      index
    }));

    // Fetch connections from a hypothetical 'connections' table.  If your
    // schema differs, adjust the select accordingly (e.g. 'from_user_id' and
    // 'to_user_id').  This query returns all edges connecting two users.
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('from_user_id, to_user_id');
    if (connError) throw connError;

    edges = (connections || []).map(row => ({
      from: row.from_user_id,
      to: row.to_user_id
    }));
  } catch (err) {
    console.error('[Synapse] Error loading data:', err);
    drawFallback('Failed to load network data');
    return;
  }

  // If no nodes were returned, nothing to draw.
  if (!nodes || nodes.length === 0) {
    drawFallback('No data available');
    return;
  }

  // Lay out nodes in a circle.  For a more sophisticated layout, you could
  // implement a force-directed algorithm.  The radius is chosen to fit
  // comfortably within the canvas while leaving padding.
  const numNodes = nodes.length;
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const radius = Math.min(canvas.clientWidth, canvas.clientHeight) / 2 - 80;
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / numNodes;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });

  // Draw edges first (so they appear behind nodes).
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.strokeStyle = '#4cafef';
  ctx.lineWidth = 1.5;
  edges.forEach(edge => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;
    ctx.beginPath();
    ctx.moveTo(fromNode.x, fromNode.y);
    ctx.lineTo(toNode.x, toNode.y);
    ctx.stroke();
  });
  ctx.restore();

  // Draw nodes.
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw label
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label.split(' ')[0], node.x, node.y + 20);
  });
}
