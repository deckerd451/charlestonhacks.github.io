// assets/js/neuralInteractive.js
// Stable, guard-checked build with: login, seeding, drag-to-save, tooltips,
// click-to-connect, optional Grid/Cluster toggle (only if the button exists).

import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections }          from './loadConnections.js';

window.supabase = supabase; // for console debugging

// ───────────────── DEFAULTS & GLOBAL STATE ─────────────────
const DEFAULT_NEURONS = [
  { name: "You",   skills: ["Explorer"], interests: ["AI", "Networks"], availability: "online",  endorsements: 3 },
  { name: "Ada",   skills: ["Mentor"],  interests: ["Math","Logic"],   availability: "offline", endorsements: 11 },
  { name: "Grace", skills: ["Peer"],    interests: ["Coding","Music"], availability: "online",  endorsements: 7 },
  { name: "Alan",  skills: ["Partner"], interests: ["AI","Art"],       availability: "online",  endorsements: 5 },
  { name: "Linus", skills: ["Peer"],    interests: ["Open Source"],    availability: "offline", endorsements: 2 }
];

let combined       = [];    // DB rows + owned flag
let rawConnections = [];    // [{from_id,to_id}]
let useGrid        = false; // grid <-> cluster
let neurons        = [];    // [{x,y,radius,meta,owned}]
let connections    = [];    // [{from:node,to:node}]
let selectedNeuron = null;

let canvas, ctx, tooltip, user, userId, loginStatus;
let animationId = null, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;
let initialized = false;
let animationStarted = false;

// ───────────────── UI HELPERS ─────────────────
function setAuthStatus(msg, isError = false) {
  const el = document.getElementById('auth-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = isError ? 'error' : 'success';
}

function showAuthUI(needsLogin) {
  // Only show/hide elements that actually exist
  const container    = document.getElementById('container');
  const authPane     = document.getElementById('auth-pane');
  const canvasEl     = document.getElementById('neural-canvas');
  const toggleLayout = document.getElementById('toggle-layout');
  const logoutBtn    = document.getElementById('logout-btn');

  if (container)   container.style.display = '';
  if (authPane)    authPane.style.display  = needsLogin ? ''   : 'none';
  if (canvasEl)    canvasEl.style.display  = needsLogin ? 'none' : 'block';
  if (toggleLayout)toggleLayout.style.display = needsLogin ? 'none' : 'inline-block';
  if (logoutBtn)   logoutBtn.style.display = needsLogin ? 'none' : 'inline-block';
}

async function logout() {
  await supabase.auth.signOut();
  if (loginStatus) loginStatus.textContent = '';
  showAuthUI(true);
  // no forced reload; keeps the magic-link redirect clean
}

// ───────────────── DATA LOADING ───────────────
async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error("Fetch error:", error.message);
    return setAuthStatus("Error loading neurons", true);
  }

  const mine   = data.filter(n => n.user_id === userId);
  const others = data.filter(n => n.user_id !== userId);

  // Seed defaults the first time this user logs in
  if (!mine.length) {
    const seeded = DEFAULT_NEURONS.map((n,i) => ({
      ...n,
      user_id: userId,
      // nice initial ring placement
      x: Math.round(350 + 320 * Math.cos((2*Math.PI*i)/DEFAULT_NEURONS.length)),
      y: Math.round(350 + 220 * Math.sin((2*Math.PI*i)/DEFAULT_NEURONS.length))
    }));
    const { error: insErr } = await supabase.from('community').insert(seeded);
    if (insErr) {
      console.error("Seed error:", insErr.message);
      return setAuthStatus("Could not seed defaults", true);
    }
    return loadOrCreatePersonalNeurons();
  }

  // Mark ownership
  combined = [
    ...mine  .map(n => ({ ...n, owned:true  })),
    ...others.map(n => ({ ...n, owned:false }))
  ];

  // Lay out
  neurons = useGrid
    ? arrangeNeuronsInGrid(combined)
    : clusteredLayout(combined, canvas.width, canvas.height);

  // Keep selection if we had one
  if (selectedNeuron) {
    const selId = selectedNeuron.meta.id;
    selectedNeuron = neurons.find(n => n.meta.id === selId) || null;
  }

  // Fetch connections and map to current node objects
  rawConnections = await fetchConnections();
  connections = rawConnections.map(({ from_id, to_id }) => ({
    from: neurons.find(n => n.meta.id === from_id),
    to:   neurons.find(n => n.meta.id === to_id)
  }));

  drawNetwork();
  if (!animationStarted) {
    animationId = requestAnimationFrame(animate);
    animationStarted = true;
  }
}

// ───────────────── LAYOUTS ────────────────────
function arrangeNeuronsInGrid(users) {
  const total = users.length;
  const cols  = Math.ceil(Math.sqrt(total));
  const rows  = Math.ceil(total / cols);
  const sx    = canvas.width  / (cols + 1);
  const sy    = canvas.height / (rows + 1);

  return users.map((u,i) => {
    const defaultX = sx * ((i % cols) + 1);
    const defaultY = sy * (Math.floor(i / cols) + 1);
    const x = typeof u.x === 'number' && u.x !== 0 ? u.x : defaultX;
    const y = typeof u.y === 'number' && u.y !== 0 ? u.y : defaultY;
    return { x, y, radius: 18, meta: u, owned: u.owned };
  });
}

function clusteredLayout(users, w, h) {
  const groupBy = u => u.skills?.[0] || u.availability || 'misc';
  const groups  = {};
  users.forEach(u => {
    const key = groupBy(u);
    (groups[key] = groups[key] || []).push(u);
  });

  const keys = Object.keys(groups);
  const cx   = w/2, cy = h/2, R = Math.min(w,h)*0.35;
  const out  = [];

  keys.forEach((k,i) => {
    const ang    = (2*Math.PI*i)/keys.length;
    const center = { x: cx + Math.cos(ang)*R, y: cy + Math.sin(ang)*R };
    groups[k].forEach((u,j) => {
      const off = (2*Math.PI*j)/groups[k].length;
      const sp  = 50 + Math.floor(j/3)*20;
      const x   = (typeof u.x === 'number') ? u.x : center.x + Math.cos(off)*sp;
      const y   = (typeof u.y === 'number') ? u.y : center.y + Math.sin(off)*sp;
      out.push({ x, y, radius: 18, meta: u, owned: u.owned });
    });
  });

  return out;
}

// ───────────────── RENDERING ──────────────────
function drawNeuron(n, t) {
  const pulse = 1 + Math.sin(t/400 + n.x + n.y)*0.3;
  const r     = n.radius * pulse;
  const glow  = ctx.createRadialGradient(n.x,n.y,0, n.x,n.y,r);
  const col   = n.owned ? '#0ff' : 'rgba(255,255,255,0.35)';
  glow.addColorStop(0, col);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x,n.y,r,0,2*Math.PI); ctx.fill();

  // inner dot
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(n.x,n.y,5,0,2*Math.PI); ctx.fill();

  // name label
  ctx.font      = '15px sans-serif';
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.fillText(n.meta.name, n.x, n.y - r - 10);

  // yellow halo if selected
  if (n === selectedNeuron) {
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth   = 3;
    ctx.beginPath(); ctx.arc(n.x,n.y,r+6,0,2*Math.PI); ctx.stroke();
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
  neurons.forEach(n => drawNeuron(n, time));
}

function animate(time) {
  if (!document.hidden && time - lastFrame >= FRAME_INTERVAL) {
    drawNetwork(time);
    lastFrame = time;
  }
  animationId = requestAnimationFrame(animate);
}

// ───────────────── BOOTSTRAP ─────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // elements
  canvas  = document.getElementById('neural-canvas');
  ctx     = canvas.getContext('2d');
  tooltip = document.getElementById('tooltip');

  // full-viewport canvas
  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    if (neurons.length) {
      // re-layout only if using grid (cluster is more free-form)
      if (useGrid) {
        neurons = arrangeNeuronsInGrid(combined);
        drawNetwork();
      }
    }
  };
  window.addEventListener('resize', resize);
  resize();

  // login status banner
  loginStatus = document.createElement('div');
  loginStatus.id = 'login-status';
  loginStatus.style.cssText = 'color:#0ff;text-align:center;margin:8px;font-weight:bold;';
  document.body.prepend(loginStatus);

  // optional toggle button (only if present in HTML)
  const toggleBtn = document.getElementById('toggle-layout');
  if (toggleBtn) {
    toggleBtn.style.display = 'none'; // hidden until logged in
    toggleBtn.addEventListener('click', () => {
      useGrid = !useGrid;
      toggleBtn.textContent = useGrid ? 'Use Cluster' : 'Use Grid';
      neurons = useGrid
        ? arrangeNeuronsInGrid(combined)
        : clusteredLayout(combined, canvas.width, canvas.height);

      if (selectedNeuron) {
        const selId = selectedNeuron.meta.id;
        selectedNeuron = neurons.find(n => n.meta.id === selId) || null;
      }

      connections = rawConnections.map(({ from_id, to_id }) => ({
        from: neurons.find(n => n.meta.id === from_id),
        to:   neurons.find(n => n.meta.id === to_id)
      }));

      drawNetwork();
    });
  }

  // logout hookup (guarded)
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // tooltip on hover
  canvas.addEventListener('mousemove', e => {
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left    = `${e.clientX+12}px`;
      tooltip.style.top     = `${e.clientY+12}px`;
      const skills = Array.isArray(hit.meta.skills) ? hit.meta.skills.join(', ') : '';
      tooltip.textContent =
        `${hit.meta.name}\n` +
        `Skills:       ${skills}\n` +
        `Endorsements: ${hit.meta.endorsements ?? 0}\n` +
        `Status:       ${hit.meta.availability ?? ''}`;
    } else {
      tooltip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', () => tooltip.style.display = 'none');

  // drag owned neurons → persist x,y
  let dragging = null, offset = {x:0,y:0};
  const onMove = e => {
    if (!dragging) return;
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    dragging.x = x - offset.x;
    dragging.y = y - offset.y;
    drawNetwork();
  };
  const onUp = async () => {
    if (!dragging) return;
    canvas.style.cursor = '';
    try {
      await supabase.from('community')
        .update({ x: dragging.x, y: dragging.y })
        .eq('id', dragging.meta.id);
      // keep in meta for future layouts
      dragging.meta.x = dragging.x;
      dragging.meta.y = dragging.y;
    } catch (e) {
      console.error('Position save failed:', e);
    }
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup',   onUp);
    dragging = null;
  };
  canvas.addEventListener('mousedown', e => {
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius && n.owned);
    if (!hit) return;
    dragging = hit;
    offset.x  = x - hit.x;
    offset.y  = y - hit.y;
    canvas.style.cursor = 'grabbing';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  });

  // click → connect (owned → any)
  canvas.addEventListener('click', async e => {
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
    if (!hit) { selectedNeuron = null; return; }

    if (!selectedNeuron) {
      if (hit.owned) selectedNeuron = hit;
    } else if (hit !== selectedNeuron) {
      const { error } = await supabase.from('connections')
        .insert({ from_id: selectedNeuron.meta.id, to_id: hit.meta.id });
      if (!error) {
        connections.push({ from: selectedNeuron, to: hit });
        selectedNeuron = null;
        drawNetwork();
      } else {
        console.error('Insert connection failed:', error.message);
      }
    }
  });

  // login button (guarded)
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const emailEl = document.getElementById('email');
      const email   = (emailEl?.value || '').trim();
      if (!email) return setAuthStatus("Enter email", true);
      setAuthStatus("Sending link…");
      loginBtn.disabled = true;
      const redirectTo = `${location.origin}/neural.html?source=neuron`;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo }
      });
      setAuthStatus(error ? error.message : "Check your inbox", !!error);
      setTimeout(() => (loginBtn.disabled = false), 60_000);
    });
  }

  // auth observer
  supabase.auth.onAuthStateChange(async (_evt, session) => {
    if (session?.user && !initialized) {
      initialized = true;
      user   = session.user;
      userId = user.id;
      if (loginStatus) loginStatus.textContent = `Welcome ${user.email}`;
      showAuthUI(false);
      // reveal toggle if it exists
      const toggleBtn = document.getElementById('toggle-layout');
      if (toggleBtn) toggleBtn.style.display = 'inline-block';
      await loadOrCreatePersonalNeurons();
    } else if (!session?.user) {
      initialized = false;
      if (loginStatus) loginStatus.textContent = '';
      showAuthUI(true);
    }
  });

  // initial session
  const { data:{ session } } = await supabase.auth.getSession();
  if (session?.user) {
    initialized = true;
    user   = session.user;
    userId = user.id;
    if (loginStatus) loginStatus.textContent = `Welcome ${user.email}`;
    showAuthUI(false);
    const toggleBtn = document.getElementById('toggle-layout');
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
