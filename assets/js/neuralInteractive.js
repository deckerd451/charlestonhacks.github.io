// neuralInteractive.js
// Personalized neuron network with Supabase auth, grid & cluster layouts, toggling, tooltips, and draggable nodes.

import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections } from './loadConnections.js';

window.supabase = supabase; // expose globally for console access

const DEFAULT_NEURONS = [
  { name: "You", skills: ["Explorer"], interests: ["AI", "Networks"], availability: "online", endorsements: 3 },
];

// ───── GLOBAL STATE ─────────────────────────────────────────────────────────
let combined     = [];    // holds all fetched neurons (mine + others)
let useGrid      = false; // false -> clustered, true -> grid
let neurons      = [];
let connections  = [];
let selectedNeuron = null;

let canvas, ctx, tooltip, user, userId;
let animationId, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;

let showAllNames     = true;
let initialized      = false;
let animationStarted = false;
let loginStatus      = null;

// ───── UI HELPERS ──────────────────────────────────────────────────────────
function setAuthStatus(msg, isError = false) {
  const el = document.getElementById('auth-status');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
}

function showAuthUI(show) {
  document.getElementById('container').style.display = show ? '' : 'none';
  const c = document.getElementById('neural-canvas');
  c.style.display = show ? 'none' : 'block';
}

// ───── AUTH & DATA LOADING ─────────────────────────────────────────────────
async function logout() {
  await supabase.auth.signOut();
  showAuthUI(true);
  window.location.reload();
}

async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error("Supabase fetch error:", error.message);
    return setAuthStatus("Error loading neurons", true);
  }

  const myNeurons    = data.filter(n => n.user_id === userId);
  const otherNeurons = data.filter(n => n.user_id !== userId);

  if (myNeurons.length === 0) {
    // first-time: insert DEFAULT_NEURONS
    const toInsert = DEFAULT_NEURONS.map(n => ({ ...n, user_id: userId, x: 0, y: 0 }));
    const { error: insErr } = await supabase.from('community').insert(toInsert);
    if (insErr) {
      console.error("Insert error:", insErr.message);
      return setAuthStatus("Could not seed defaults", true);
    }
    return loadOrCreatePersonalNeurons();
  }

  // GLOBAL combined
  combined = [
    ...myNeurons.map(n => ({ ...n, owned: true })),
    ...otherNeurons.map(n => ({ ...n, owned: false }))
  ];

  // choose layout
  neurons = useGrid
    ? arrangeNeuronsInGrid(combined)
    : clusteredLayout(combined, canvas.width, canvas.height);

  window.neurons = neurons;

  // fetch connections
  const connData = await fetchConnections();
  connections = connData.map(({ from_id, to_id }) => {
    const from = neurons.find(n => n.meta.id === from_id);
    const to   = neurons.find(n => n.meta.id === to_id);
    return { from, to };
  });

  drawNetwork();
  if (!animationStarted) {
    animationId = requestAnimationFrame(animate);
    animationStarted = true;
  }
}

// ───── LAYOUT ALGORITHMS ────────────────────────────────────────────────────
function arrangeNeuronsInGrid(users) {
  const count = users.length;
  const cols  = Math.ceil(Math.sqrt(count));
  const rows  = Math.ceil(count / cols);
  const sx = canvas.width  / (cols + 1);
  const sy = canvas.height / (rows + 1);
  return users.map((u, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    return { x: sx*(col+1), y: sy*(row+1), radius: 18, meta: u, owned: u.owned };
  });
}

function clusteredLayout(users, w, h) {
  const groupBy = u => u.meta.skills?.[0] || u.meta.availability || 'misc';
  const groups = {};
  users.forEach(u => { const k = groupBy(u); (groups[k]||(groups[k]=[])).push(u); });

  const keys = Object.keys(groups);
  const cx = w/2, cy = h/2, r = Math.min(w,h)*0.35;
  const out = [];

  keys.forEach((k,i) => {
    const ang = 2*Math.PI*i/keys.length;
    const gx  = cx + Math.cos(ang)*r;
    const gy  = cy + Math.sin(ang)*r;
    groups[k].forEach((u,j) => {
      const off = 2*Math.PI*j/groups[k].length;
      const sp  = 40 + j*5;
      const x   = (u.meta.x||gx) + Math.cos(off)*sp;
      const y   = (u.meta.y||gy) + Math.sin(off)*sp;
      out.push({ x, y, radius:18, meta:u.meta, owned:u.owned });
    });
  });

  return out;
}

// ───── RENDERING ───────────────────────────────────────────────────────────
function drawNeuron(n, t) {
  const pulse  = 1 + Math.sin(t/400 + n.x + n.y)*0.3;
  const radius = n.radius * pulse;
  const glow   = ctx.createRadialGradient(n.x,n.y,0, n.x,n.y,radius);
  const color  = n.owned ? '#0ff' : 'rgba(255,255,255,0.3)';
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x,n.y,radius,0,Math.PI*2); ctx.fill();

  // inner dot
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(n.x,n.y,5,0,Math.PI*2); ctx.fill();

  // name
  if (showAllNames) {
    ctx.font = '15px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(n.meta.name, n.x, n.y - radius - 10);
  }

  // selection halo
  if (n === selectedNeuron) {
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth   = 4;
    ctx.beginPath(); ctx.arc(n.x,n.y,radius+6,0,Math.PI*2); ctx.stroke();
  }
}

function drawConnections() {
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({from,to}) => {
    if (from && to) {
      ctx.beginPath();
      ctx.moveTo(from.x,from.y);
      ctx.lineTo(to.x,to.y);
      ctx.stroke();
    }
  });
}

function drawNetwork(time=0) {
  if (!neurons.length) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawConnections();
  neurons.forEach(n=>drawNeuron(n,time));
}

function animate(time) {
  if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
    drawNetwork(time);
    lastFrame = time;
  }
  animationId = requestAnimationFrame(animate);
}

// ───── BOOTSTRAP ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // canvas init & resize
  canvas = document.getElementById('neural-canvas');
  ctx    = canvas.getContext('2d');
  tooltip= document.getElementById('tooltip');
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height= window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  // login status banner
  loginStatus = document.createElement('div');
  loginStatus.id = 'login-status';
  loginStatus.style.cssText = 'color:#0ff;text-align:center;margin:8px;font-weight:bold;';
  document.body.prepend(loginStatus);

  // hookup toggle‐layout button
  const btn = document.getElementById('toggle-layout');
  btn.onclick = () => {
    useGrid = !useGrid;
    btn.textContent = useGrid ? 'Use Cluster' : 'Use Grid';
    neurons = useGrid
      ? arrangeNeuronsInGrid(combined)
      : clusteredLayout(combined, canvas.width, canvas.height);
    drawNetwork();
  };

  // tooltip
  canvas.addEventListener('mousemove', e => {
    const { left, top } = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left    = `${e.clientX+12}px`;
      tooltip.style.top     = `${e.clientY+12}px`;
      tooltip.textContent   =
        `${hit.meta.name}\nSkills: ${hit.meta.skills.join(', ')}\n`+
        `Endorsements: ${hit.meta.endorsements}\nStatus: ${hit.meta.availability}`;
    } else {
      tooltip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', ()=> tooltip.style.display = 'none');

  // dragging
  let dragging = null, dragOff={x:0,y:0};
  const onMove = e => {
    if (!dragging) return;
    const { left, top } = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    dragging.x = x - dragOff.x;
    dragging.y = y - dragOff.y;
    drawNetwork();
  };
  const onUp = () => {
    if (!dragging) return;
    canvas.style.cursor = '';
    supabase.from('community')
      .update({ x: dragging.x, y: dragging.y })
      .eq('id', dragging.meta.id)
      .then(() => {/* ignored */});
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    dragging = null;
  };
  canvas.addEventListener('mousedown', e => {
    const { left, top } = canvas.getBoundingClientRect();
    const x = e.clientX-left, y = e.clientY-top;
    const hit = neurons.find(n=>Math.hypot(n.x-x,n.y-y)<n.radius && n.owned);
    if (hit) {
      dragging = hit;
      dragOff.x = x - hit.x;
      dragOff.y = y - hit.y;
      canvas.style.cursor = 'grabbing';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  });

  // click→connect
  canvas.addEventListener('click', async e => {
    const { left, top } = canvas.getBoundingClientRect();
    const x = e.clientX-left, y = e.clientY-top;
    const hit = neurons.find(n=>Math.hypot(n.x-x,n.y-y)<n.radius);
    if (!hit) { selectedNeuron = null; return; }
    if (!selectedNeuron) {
      if (hit.owned) selectedNeuron = hit;
    } else if (hit !== selectedNeuron) {
      await supabase.from('connections')
        .insert({ from_id: selectedNeuron.meta.id, to_id: hit.meta.id });
      connections.push({ from: selectedNeuron, to: hit });
      selectedNeuron = null;
      drawNetwork();
    }
  });

  // auth observer + restore
  supabase.auth.onAuthStateChange(async (_, session) => {
    if (session?.user && !initialized) {
      initialized = true;
      user  = session.user;
      userId= user.id;
      loginStatus.textContent = `Welcome ${user.email}`;
      showAuthUI(false);
      document.getElementById('logout-btn').style.display = '';
      await loadOrCreatePersonalNeurons();
    } else {
      showAuthUI(true);
      document.getElementById('logout-btn').style.display = 'none';
      loginStatus.textContent = '';
    }
  });
  const { data:{session} } = await supabase.auth.getSession();
  if (session?.user) {
    user = session.user; userId = user.id;
    initialized = true;
    loginStatus.textContent = `Welcome ${user.email}`;
    showAuthUI(false);
    document.getElementById('logout-btn').style.display = '';
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
