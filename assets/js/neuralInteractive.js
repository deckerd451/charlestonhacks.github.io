// neuralInteractive.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections }          from './loadConnections.js';

window.supabase = supabase; // for console debugging

// ───── DEFAULTS & GLOBAL STATE ──────────────────────────────────────────────
const DEFAULT_NEURONS = [
  {
    name: "You",
    skills: ["Explorer"],
    interests: ["AI","Networks"],
    availability: "online",
    endorsements: 3
  }
];

let combined       = [];    // raw DB rows + owned flag
let rawConnections = [];    // original {from_id,to_id} list
let useGrid        = false; // grid <> cluster
let neurons        = [];    // positioned {x,y,radius,meta,owned}
let connections    = [];    // {from:node,to:node}
let selectedNeuron = null;  // for drawing new links

let canvas, ctx, tooltip, user, userId;
let animationId, lastFrame = 0;
const FRAME_INTERVAL = 1000 / 30;

let initialized      = false;
let animationStarted = false;
let loginStatus      = null;

// ───── UI HELPERS ───────────────────────────────────────────────────────────
function setAuthStatus(msg, isError = false) {
  const el = document.getElementById('auth-status');
  el.textContent = msg;
  el.className   = isError ? 'error' : 'success';
}

function showAuthUI(needsLogin) {
  // always show the title + toggle
  document.getElementById('container').style.display       = '';
  // but hide/show just the auth form itself
  document.getElementById('auth-pane').style.display       = needsLogin ? 'block'       : 'none';
  document.getElementById('toggle-layout').style.display   = needsLogin ? 'none'        : 'inline-block';
  document.getElementById('logout-btn').style.display      = needsLogin ? 'none'        : 'inline-block';
  document.getElementById('neural-canvas').style.display   = needsLogin ? 'none'        : 'block';
}

// ───── AUTH & DATA LOADING ─────────────────────────────────────────────────
async function logout() {
  await supabase.auth.signOut();
  loginStatus.textContent = '';
  showAuthUI(true);
}

async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error("Fetch error:", error.message);
    return setAuthStatus("Error loading neurons", true);
  }

  const mine   = data.filter(n => n.user_id === userId);
  const others = data.filter(n => n.user_id !== userId);

  // seed defaults on very first sign-in
  if (!mine.length) {
    const toInsert = DEFAULT_NEURONS.map(n => ({ ...n, user_id: userId }));
    const { error: insErr } = await supabase.from('community').insert(toInsert);
    if (insErr) {
      console.error("Seed error:", insErr.message);
      return setAuthStatus("Could not seed defaults", true);
    }
    return loadOrCreatePersonalNeurons();
  }

  // build combined array (raw rows + owned flag)
  combined = [
    ...mine .map(n => ({ ...n, owned:true  })),
    ...others.map(n => ({ ...n, owned:false }))
  ];
  // file: neuralInteractive.js, inside loadOrCreatePersonalNeurons()
const me = combined.find(n => n.owned);
if (me) {
  document.getElementById('profile-name').value         = me.name || me.meta.name;
  document.getElementById('profile-skills').value       = (me.skills||me.meta.skills).join(', ');
  document.getElementById('profile-interests').value    = (me.interests||me.meta.interests).join(', ');
  document.getElementById('profile-availability').value = me.availability  || me.meta.availability;
  document.getElementById('profile-endorsements').value = me.endorsements  || me.meta.endorsements;
}
 // position into either grid or cluster
  neurons = useGrid
    ? arrangeNeuronsInGrid(combined)
    : clusteredLayout(combined, canvas.width, canvas.height);

  // if we'd previously selected one, re-find it in the new nodes
  if (selectedNeuron) {
    const selId = selectedNeuron.meta.id;
    selectedNeuron = neurons.find(n => n.meta.id === selId) || null;
  }

  // fetch & map connections to our new node objects
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

// ───── LAYOUT ALGORITHMS ────────────────────────────────────────────────────
function arrangeNeuronsInGrid(users) {
  const total = users.length;
  const cols  = Math.ceil(Math.sqrt(total));
  const rows  = Math.ceil(total / cols);
  const sx    = canvas.width  / (cols + 1);
  const sy    = canvas.height / (rows + 1);

  return users.map((u,i) => {
    // natural grid slot
    const defaultX = sx * ((i % cols) + 1);
    const defaultY = sy * (Math.floor(i / cols) + 1);

    // only honor a manual drag if we actually wrote a non-zero x/y
    const manualX = (typeof u.x === 'number' && u.x !== 0) ? u.x : defaultX;
    const manualY = (typeof u.y === 'number' && u.y !== 0) ? u.y : defaultY;

    return {
      x:      manualX,
      y:      manualY,
      radius: 18,
      meta:   u,
      owned:  u.owned
    };
  });
}

function clusteredLayout(users, w, h) {
  const groupBy = u => u.skills?.[0] || u.availability || 'misc';
  const groups  = {};
  users.forEach(u => {
    const key = groupBy(u);
    (groups[key] = groups[key]||[]).push(u);
  });

  const keys = Object.keys(groups);
  const cx   = w/2, cy = h/2, R = Math.min(w,h)*0.35;
  const out  = [];

  keys.forEach((k,i) => {
    const ang    = 2*Math.PI * i / keys.length;
    const center = { x: cx + Math.cos(ang)*R, y: cy + Math.sin(ang)*R };
    groups[k].forEach((u,j) => {
      const off   = 2*Math.PI * j / groups[k].length;
      const sp    = 40 + j*5;
      const baseX = (typeof u.x === 'number' ? u.x : center.x);
      const baseY = (typeof u.y === 'number' ? u.y : center.y);
      out.push({
        x:      baseX + Math.cos(off)*sp,
        y:      baseY + Math.sin(off)*sp,
        radius: 18,
        meta:   u,
        owned:  u.owned
      });
    });
  });

  return out;
}

// ───── RENDERING ───────────────────────────────────────────────────────────
function drawNeuron(n, t) {
  const pulse = 1 + Math.sin(t/400 + n.x + n.y)*0.3;
  const r     = n.radius * pulse;
  const glow  = ctx.createRadialGradient(n.x,n.y,0, n.x,n.y,r);
  const col   = n.owned ? '#0ff' : 'rgba(255,255,255,0.3)';
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
    ctx.lineWidth   = 4;
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

// ───── BOOTSTRAP ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  // start on the login form
  showAuthUI(true);

  // grab UI nodes
  canvas   = document.getElementById('neural-canvas');
  ctx      = canvas.getContext('2d');
  tooltip  = document.getElementById('tooltip');
  const toggleBtn = document.getElementById('toggle-layout');
  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // resize handler
  window.addEventListener('resize', () => {
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
  });
  canvas.width  = innerWidth;
  canvas.height = innerHeight;

  // login status banner
  loginStatus = document.createElement('div');
  loginStatus.id = 'login-status';
  loginStatus.style.cssText = 'color:#0ff;text-align:center;margin:8px;font-weight:bold;';
  document.body.prepend(loginStatus);

  // toggle layout handler
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

  // logout hookup
  logoutBtn.addEventListener('click', logout);

  // tooltip
  canvas.addEventListener('mousemove', e => {
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
    if (hit) {
      tooltip.style.display = 'block';
      tooltip.style.left    = `${e.clientX+12}px`;
      tooltip.style.top     = `${e.clientY+12}px`;
      tooltip.textContent   =
        `${hit.meta.name}\n` +
        `Skills:      ${hit.meta.skills.join(', ')}\n` +
        `Endorsements: ${hit.meta.endorsements}\n` +
        `Status:      ${hit.meta.availability}`;
    } else {
      tooltip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', () => tooltip.style.display = 'none');

  // dragging
  let dragging = null, offset = {x:0,y:0};
  const onMove = e => {
    if (!dragging) return;
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    dragging.x = x - offset.x;
    dragging.y = y - offset.y;
    drawNetwork();
  };
  const onUp = () => {
    if (!dragging) return;
    canvas.style.cursor = '';
    supabase.from('community')
      .update({ x: dragging.x, y: dragging.y })
      .eq('id', dragging.meta.id);
    // bake into meta so grid will honor your drag next time
    dragging.meta.x = dragging.x;
    dragging.meta.y = dragging.y;
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
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

  // click → connect
  canvas.addEventListener('click', async e => {
    const {left,top} = canvas.getBoundingClientRect();
    const x = e.clientX - left, y = e.clientY - top;
    const hit = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
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

  // login button (60s cooldown)
  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) return setAuthStatus("Enter email", true);
    loginBtn.disabled = true;
    setAuthStatus("Sending link…");
    const { error } = await supabase.auth.signInWithOtp({
      email, options: { emailRedirectTo: location.href }
    });
    setAuthStatus(error ? error.message : "Check your inbox", !!error);
    setTimeout(() => loginBtn.disabled = false, 60_000);
  });

  // auth observer & initial session
  supabase.auth.onAuthStateChange(async (_, session) => {
    if (session?.user && !initialized) {
      initialized     = true;
      user            = session.user;
      userId          = user.id;
      loginStatus.textContent = `Welcome ${user.email}`;
      showAuthUI(false);
      await loadOrCreatePersonalNeurons();
    } else if (!session?.user) {
      initialized = false;
      loginStatus.textContent = '';
      showAuthUI(true);
    }
  });
  const { data:{session} } = await supabase.auth.getSession();
  if (session?.user) {
    initialized     = true;
    user            = session.user;
    userId          = user.id;
    loginStatus.textContent = `Welcome ${user.email}`;
    showAuthUI(false);
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
// file: neuralInteractive.js, at end of DOMContentLoaded
document.getElementById('edit-profile')
  .addEventListener('submit', async e => {
    e.preventDefault();
    const name  = document.getElementById('profile-name').value.trim();
    const skills    = document.getElementById('profile-skills').value.split(',')
                         .map(s=>s.trim()).filter(Boolean);
    const interests = document.getElementById('profile-interests').value.split(',')
                         .map(s=>s.trim()).filter(Boolean);
    const availability = document.getElementById('profile-availability').value;
    const endorsements = parseInt(document.getElementById('profile-endorsements').value,10) || 0;

    const meNode = combined.find(n=>n.owned);
    if (!meNode) return alert("Your neuron not found!");

    const { error } = await supabase.from('community')
      .update({ name, skills, interests, availability, endorsements })
      .eq('id', meNode.id);

    if (error) {
      console.error(error);
      return alert("Save failed: "+error.message);
    }

    // update in-memory and redraw
    Object.assign(meNode, { name, skills, interests, availability, endorsements });
    neurons = useGrid
      ? arrangeNeuronsInGrid(combined)
      : clusteredLayout(combined, canvas.width, canvas.height);
    drawNetwork();
    alert("Profile saved!");
  });

