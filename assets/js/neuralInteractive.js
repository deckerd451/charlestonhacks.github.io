// neuralInteractive.js
// Personalized neuron network with Supabase auth and skill-based clustering

import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections } from './loadConnections.js';

window.supabase = supabase; // for debugging in console

const DEFAULT_NEURONS = [
  { name: "You",  skills:["Explorer"],  interests:["AI","Networks"],  availability:"online",  endorsements:3 },
  { name: "Ada",  skills:["Mentor"],    interests:["Math","Logic"],   availability:"offline", endorsements:11 },
  { name: "Grace",skills:["Peer"],      interests:["Coding","Music"],availability:"online",  endorsements:7 },
  { name: "Alan", skills:["Partner"],   interests:["AI","Art"],      availability:"online",  endorsements:5 },
  { name: "Linus",skills:["Peer"],      interests:["Open Source"],     availability:"offline", endorsements:2 }
];

let canvas, ctx;
let neurons = [], connections = [];
let selectedNeuron = null, hoverNeuron = null;
let user, userId, initialized = false;
let lastFrame = 0, animationStarted = false;
const FRAME_INTERVAL = 1000 / 30;
let showAllNames = true;

/*–– AUTH UI HELPERS ––*/
function setAuthStatus(msg, isError = false) {
  const el = document.getElementById('auth-status');
  el.textContent = msg;
  el.className = isError ? 'error' : 'success';
}

function showAuthUI(show) {
  document.getElementById('auth-pane').classList.toggle('hidden', !show);
  // canvas is always present underneath
}

/*–– LOGOUT ––*/
async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

/*–– LOAD OR CREATE PERSONAL NEURONS ––*/
async function loadOrCreatePersonalNeurons() {
  const { data, error } = await supabase.from('community').select('*');
  if (error) {
    console.error("Supabase fetch error:", error);
    return setAuthStatus("Supabase error: " + error.message, true);
  }

  // split my vs others
  const mine  = data.filter(n => n.user_id === userId);
  const other = data.filter(n => n.user_id !== userId);

  if (!mine.length) {
    // first-time: insert defaults around a circle
    const toInsert = DEFAULT_NEURONS.map((n,i) => ({
      ...n,
      user_id: userId,
      x: Math.round(350 + 320 * Math.cos(2*Math.PI*i/DEFAULT_NEURONS.length)),
      y: Math.round(350 + 220 * Math.sin(2*Math.PI*i/DEFAULT_NEURONS.length))
    }));
    const { error: insErr } = await supabase.from('community').insert(toInsert);
    if (insErr) {
      console.error("Insert failed:", insErr);
      return setAuthStatus("Insert failed: " + insErr.message, true);
    }
    return loadOrCreatePersonalNeurons();
  }

  // cluster & draw
  const combined = [
    ...mine.map(n => ({ ...n, owned: true })),
    ...other.map(n => ({ ...n, owned: false }))
  ];
  neurons = clusteredLayout(combined, canvas.width, canvas.height);

  const connData = await fetchConnections();
  connections = connData
    .map(({ from_id, to_id }) => {
      const from = neurons.find(n => n.meta.id === from_id);
      const to   = neurons.find(n => n.meta.id === to_id);
      return (from && to) ? { from, to } : null;
    })
    .filter(c => c);

  drawNetwork();
  if (!animationStarted) {
    animationStarted = true;
    requestAnimationFrame(animate);
  }
}

/*–– LAYOUT ––*/
function clusteredLayout(users, W, H) {
  const groupBy = u => u.skills?.[0] || u.availability || 'misc';
  const groups = {};
  users.forEach(u => (groups[groupBy(u)] ||= []).push(u));

  const keys = Object.keys(groups);
  const cx = W/2, cy = H/2, clusterR = 220;
  const result = [];

  keys.forEach((key,i) => {
    const ang = (2*Math.PI*i)/keys.length;
    const gx  = cx + clusterR * Math.cos(ang);
    const gy  = cy + clusterR * Math.sin(ang);

    groups[key].forEach((u,j) => {
      const off   = (2*Math.PI*j)/groups[key].length;
      const spread= 50 + Math.floor(j/3)*20;
      const x     = u.x ?? (gx + spread*Math.cos(off));
      const y     = u.y ?? (gy + spread*Math.sin(off));
      result.push({ x:+x, y:+y, radius:18, meta:u, owned:u.owned });
    });
  });

  return result;
}

/*–– DRAWING ––*/
function drawNeuron(n, t) {
  const pulse  = 1 + Math.sin(t/400 + n.x + n.y)*0.3;
  const rad    = n.radius * pulse;
  const glow   = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,rad);
  const color  = n.owned ? '#0ff' : 'rgba(255,255,255,0.3)';
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x,n.y,rad,0,2*Math.PI); ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(n.x,n.y,5,0,2*Math.PI); ctx.fill();

  if (showAllNames) {
    ctx.font      = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(n.meta.name, n.x, n.y - rad - 10);
  }
}

function drawConnections() {
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(c => {
    ctx.beginPath();
    ctx.moveTo(c.from.x, c.from.y);
    ctx.lineTo(c.to.x,   c.to.y);
    ctx.stroke();
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
  requestAnimationFrame(animate);
}

/*–– INITIALIZATION ––*/
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('neural-canvas');
  ctx    = canvas.getContext('2d');

  // Resize helper
  function resizeCanvas() {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    drawNetwork();
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Insert login-status div
  const loginStatus = document.createElement('div');
  loginStatus.id    = 'login-status';
  loginStatus.style.cssText = 'color:#0ff; text-align:center; margin:10px; font-weight:bold;';
  document.body.prepend(loginStatus);

  // Wire up login button
  document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('email').value.trim();
    if (!email) return setAuthStatus("Please enter your email.", true);
    setAuthStatus("Sending magic link...");
    const redirectTo = `${window.location.origin}/neural.html?source=neuron`;
    const { error } = await supabase.auth.signInWithOtp({
      email, options:{ emailRedirectTo:redirectTo }
    });
    setAuthStatus(error ? "Error: " + error.message : "Check your email!", !!error);
  };

  // Wire up logout
  document.getElementById('logout-btn').onclick = logout;

  // Canvas click to connect
  canvas.addEventListener('click', async e => {
    const rect = canvas.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const clicked = neurons.find(n => Math.hypot(n.x-x,n.y-y) < n.radius);
    if (!clicked) return selectedNeuron = null;

    if (!selectedNeuron) {
      if (!clicked.owned) return;
      selectedNeuron = clicked;
      console.log('Select:', clicked.meta.name);
    } else if (clicked !== selectedNeuron) {
      const { error } = await supabase.from('connections').insert({
        from_id: selectedNeuron.meta.id,
        to_id:   clicked.meta.id
      });
      if (!error) {
        connections.push({ from:selectedNeuron, to:clicked });
        console.log(`Connected ${selectedNeuron.meta.name} → ${clicked.meta.name}`);
      }
      selectedNeuron = null;
    }
  });

  // Auth state watcher
  supabase.auth.onAuthStateChange(async (_evt, session) => {
    if (session?.user && !initialized) {
      initialized = true;
      user        = session.user;
      userId      = user.id;
      loginStatus.textContent = `Welcome back, ${user.email}`;
      showAuthUI(false);
      document.getElementById('logout-btn').style.display = '';
      await loadOrCreatePersonalNeurons();
    } else if (!session?.user) {
      showAuthUI(true);
      document.getElementById('logout-btn').style.display = 'none';
      loginStatus.textContent = '';
    }
  });

  // On page load check session
  const { data:{ session } } = await supabase.auth.getSession();
  if (session?.user) {
    user   = session.user;
    userId = user.id;
    initialized = true;
    loginStatus.textContent = `Welcome back, ${user.email}`;
    showAuthUI(false);
    document.getElementById('logout-btn').style.display = '';
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
