// neuralInteractive.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { fetchConnections }         from './loadConnections.js';

window.supabase = supabase;

// ───── GLOBAL STATE ─────────────────────────────────────────────────────────
const DEFAULT_NEURONS = [
  { name: "You", skills: ["Explorer"], interests: ["AI","Networks"], availability: "online", endorsements: 3 }
];

let combined       = [];
let rawConnections = [];
let useGrid        = false;
let neurons        = [];
let connections    = [];
let selectedNeuron = null;

let canvas, ctx, tooltip, user, userId;
let animationId, lastFrame = 0;
const FRAME_INTERVAL = 1000/30;

let initialized      = false;
let animationStarted = false;
let loginStatus      = null;

// ───── UI HELPERS ───────────────────────────────────────────────────────────
function setAuthStatus(msg, isError=false) {
  const el = document.getElementById('auth-status');
  el.textContent = msg;
  el.className   = isError ? 'error':'success';
}

function showAuthUI(needsLogin) {
  // always show the outer container (title, toggle, logout)
  document.getElementById('container').style.display = '';
  // only hide/show the auth form itself
  document.getElementById('auth-pane'   ).style.display = needsLogin ? 'block':'none';
  document.getElementById('toggle-layout').style.display = needsLogin ? 'none' :'inline-block';
  document.getElementById('logout-btn'   ).style.display = needsLogin ? 'none' :'inline-block';
  document.getElementById('neural-canvas').style.display = needsLogin ? 'none' :'block';
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
    console.error(error);
    return setAuthStatus("Error loading neurons", true);
  }

  const mine   = data.filter(n => n.user_id === userId);
  const others = data.filter(n => n.user_id !== userId);

  if (!mine.length) {
    const toInsert = DEFAULT_NEURONS.map(n => ({ ...n, user_id:userId, x:0, y:0 }));
    const { error: insErr } = await supabase.from('community').insert(toInsert);
    if (insErr) {
      console.error(insErr);
      return setAuthStatus("Could not seed defaults", true);
    }
    return loadOrCreatePersonalNeurons();
  }

  combined = [
    ...mine .map(n => ({ ...n, owned:true  })),
    ...others.map(n => ({ ...n, owned:false }))
  ];

  neurons = useGrid
    ? arrangeNeuronsInGrid(combined)
    : clusteredLayout(combined, canvas.width, canvas.height);

  if (selectedNeuron) {
    const id = selectedNeuron.meta.id;
    selectedNeuron = neurons.find(n => n.meta.id === id) || null;
  }

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

// ───── LAYOUT ───────────────────────────────────────────────────────────────
function arrangeNeuronsInGrid(users) {
  const total = users.length;
  const cols  = Math.ceil(Math.sqrt(total));
  const rows  = Math.ceil(total / cols);
  const sx    = canvas.width  / (cols + 1);
  const sy    = canvas.height / (rows + 1);

  return users.map((u, i) => {
    // compute the “ideal” grid spot
    const defaultX = sx * ((i % cols) + 1);
    const defaultY = sy * (Math.floor(i / cols) + 1);

    // if the user has manually dragged this node before,
    // u.x/u.y will be set on the meta; honor that
    const x = u.x != null ? u.x : defaultX;
    const y = u.y != null ? u.y : defaultY;

    return {
      x,
      y,
      radius: 18,
      meta: u,
      owned: u.owned
    };
  });
}


function clusteredLayout(users,w,h) {
  const groupBy = u=>u.skills?.[0]||u.availability||'misc';
  const groups  = {};
  users.forEach(u=> (groups[groupBy(u)] ||= []).push(u));

  const keys = Object.keys(groups);
  const cx   = w/2, cy = h/2, R = Math.min(w,h)*0.35;
  const out  = [];

  keys.forEach((k,i)=>{
    const ang = 2*Math.PI*i/keys.length;
    const center = { x:cx+Math.cos(ang)*R, y:cy+Math.sin(ang)*R };
    groups[k].forEach((u,j)=>{
      const off   = 2*Math.PI*j/groups[k].length;
      const sp    = 40 + j*5;
      const baseX = u.x ?? center.x;
      const baseY = u.y ?? center.y;
      out.push({
        x:      baseX + Math.cos(off)*sp,
        y:      baseY + Math.sin(off)*sp,
        radius: 18, meta:u, owned:u.owned
      });
    });
  });

  return out;
}

// ───── RENDERING ───────────────────────────────────────────────────────────
function drawNeuron(n,t) {
  const pulse = 1 + Math.sin(t/400 + n.x + n.y)*0.3;
  const r     = n.radius*pulse;
  const glow  = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r);
  const col   = n.owned?'#0ff':'rgba(255,255,255,0.3)';
  glow.addColorStop(0,col);
  glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(n.x,n.y,r,0,2*Math.PI); ctx.fill();

  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(n.x,n.y,5,0,2*Math.PI); ctx.fill();

  ctx.font      = '15px sans-serif';
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.fillText(n.meta.name, n.x, n.y - r - 10);

  if (n === selectedNeuron) {
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth   = 4;
    ctx.beginPath(); ctx.arc(n.x,n.y,r+6,0,2*Math.PI); ctx.stroke();
  }
}

function drawConnections() {
  ctx.lineWidth   = 1.5;
  ctx.strokeStyle = 'rgba(0,255,255,0.16)';
  connections.forEach(({from,to})=>{
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
window.addEventListener('DOMContentLoaded', async()=>{
  // show login form first
  showAuthUI(true);

  canvas   = document.getElementById('neural-canvas');
  ctx      = canvas.getContext('2d');
  tooltip  = document.getElementById('tooltip');

  const toggleBtn = document.getElementById('toggle-layout');
  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');

  window.addEventListener('resize',()=>{
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
  });
  canvas.width  = innerWidth;
  canvas.height = innerHeight;

  loginStatus = document.createElement('div');
  loginStatus.id = 'login-status';
  loginStatus.style.cssText = 'color:#0ff;text-align:center;margin:8px;font-weight:bold;';
  document.body.prepend(loginStatus);

  toggleBtn.addEventListener('click', ()=>{
    useGrid = !useGrid;
    toggleBtn.textContent = useGrid ? 'Use Cluster':'Use Grid';

    neurons = useGrid
      ? arrangeNeuronsInGrid(combined)
      : clusteredLayout(combined, canvas.width, canvas.height);

    if (selectedNeuron) {
      const selId = selectedNeuron.meta.id;
      selectedNeuron = neurons.find(n=>n.meta.id===selId) || null;
    }

    connections = rawConnections.map(({from_id,to_id})=>({
      from: neurons.find(n=>n.meta.id===from_id),
      to:   neurons.find(n=>n.meta.id===to_id)
    }));

    drawNetwork();
  });

  logoutBtn.addEventListener('click', logout);

  canvas.addEventListener('mousemove',e=>{
    const {left,top}=canvas.getBoundingClientRect();
    const x=e.clientX-left, y=e.clientY-top;
    const hit=neurons.find(n=>Math.hypot(n.x-x,n.y-y)<n.radius);
    if(hit){
      tooltip.style.display='block';
      tooltip.style.left=`${e.clientX+12}px`;
      tooltip.style.top =`${e.clientY+12}px`;
      tooltip.textContent=
        `${hit.meta.name}\nSkills: ${hit.meta.skills.join(', ')}\n`+
        `Endorsements: ${hit.meta.endorsements}\nStatus: ${hit.meta.availability}`;
    } else tooltip.style.display='none';
  });
  canvas.addEventListener('mouseleave', ()=>tooltip.style.display='none');

  let dragging=null, offs={x:0,y:0};
  const onMove=e=>{
    if(!dragging) return;
    const {left,top}=canvas.getBoundingClientRect();
    const x=e.clientX-left, y=e.clientY-top;
    dragging.x=x-offs.x; dragging.y=y-offs.y;
    drawNetwork();
  };
  const onUp=()=>{
    if(!dragging) return;
    canvas.style.cursor='';
    supabase.from('community')
      .update({x:dragging.x,y:dragging.y})
      .eq('id',dragging.meta.id);
    dragging.meta.x=dragging.x;
    dragging.meta.y=dragging.y;
    window.removeEventListener('mousemove',onMove);
    window.removeEventListener('mouseup',  onUp);
    dragging=null;
  };
  canvas.addEventListener('mousedown',e=>{
    const {left,top}=canvas.getBoundingClientRect();
    const x=e.clientX-left, y=e.clientY-top;
    const hit=neurons.find(n=>Math.hypot(n.x-x,n.y-y)<n.radius && n.owned);
    if(!hit) return;
    dragging=hit;
    offs.x=x-hit.x; offs.y=y-hit.y;
    canvas.style.cursor='grabbing';
    window.addEventListener('mousemove',onMove);
    window.addEventListener('mouseup',  onUp);
  });

  canvas.addEventListener('click',async e=>{
    const {left,top}=canvas.getBoundingClientRect();
    const x=e.clientX-left,y=e.clientY-top;
    const hit=neurons.find(n=>Math.hypot(n.x-x,n.y-y)<n.radius);
    if(!hit){ selectedNeuron=null; return; }
    if(!selectedNeuron){
      if(hit.owned) selectedNeuron=hit;
    } else if(hit!==selectedNeuron){
      await supabase.from('connections')
        .insert({from_id:selectedNeuron.meta.id,to_id:hit.meta.id});
      connections.push({from:selectedNeuron,to:hit});
      selectedNeuron=null;
      drawNetwork();
    }
  });

  loginBtn.addEventListener('click',async()=>{
    const email = document.getElementById('email').value.trim();
    if(!email) return setAuthStatus("Enter email",true);
    loginBtn.disabled = true;
    setAuthStatus("Sending link…");
    const { error } = await supabase.auth.signInWithOtp({
      email, options:{ emailRedirectTo: location.href }
    });
    setAuthStatus(error?error.message:"Check your inbox",!!error);
    setTimeout(()=> loginBtn.disabled=false,60000);
  });

  supabase.auth.onAuthStateChange(async(_,sess)=>{
    if(sess?.user && !initialized){
      initialized=true;
      user=sess.user; userId=user.id;
      loginStatus.textContent=`Welcome ${user.email}`;
      showAuthUI(false);
      await loadOrCreatePersonalNeurons();
    } else if(!sess?.user){
      initialized=false;
      loginStatus.textContent='';
      showAuthUI(true);
    }
  });

  const { data:{session} } = await supabase.auth.getSession();
  if(session?.user){
    initialized=true;
    user=session.user; userId=user.id;
    loginStatus.textContent=`Welcome ${user.email}`;
    showAuthUI(false);
    await loadOrCreatePersonalNeurons();
  } else {
    showAuthUI(true);
  }
});
