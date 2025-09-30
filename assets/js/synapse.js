// synapse.js
import { supabaseClient as supabase } from './supabaseClient.js';

export async function initSynapseView() {
  const canvas = document.getElementById('synapseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resizeCanvas = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.scale(dpr, dpr);
  };
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

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

  let nodes = [];
  let edges = [];

  try {
    const { data: community, error: communityError } = await supabase
      .from('community')
      .select('id, name');
    if (communityError) throw communityError;

    nodes = (community || []).map((u, index) => ({
      id: u.id,
      label: u.name || `User ${u.id}`,
      x: 0,
      y: 0,
      index
    }));

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

  if (!nodes || nodes.length === 0) {
    drawFallback('No data available');
    return;
  }

  const numNodes = nodes.length;
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const radius = Math.min(canvas.clientWidth, canvas.clientHeight) / 2 - 80;

  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / numNodes;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw edges
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

  // Draw nodes
  nodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(node.label.split(' ')[0], node.x, node.y + 20);
  });
}
