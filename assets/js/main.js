// Innovation Engine main.js
import { supabaseClient as supabase } from './supabaseClient.js';

// --- UTILITIES ---
function showNotification(msg) {
  const achievements = document.getElementById("achievements");
  if (!achievements) return;
  const div = document.createElement("div");
  div.className = "toast";
  div.textContent = msg;
  achievements.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// --- PROFILE CREATION ---
document.getElementById("skills-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const first = document.getElementById("first-name").value.trim();
  const last = document.getElementById("last-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const skills = document.getElementById("skills-input").value.split(",").map(s => s.trim());
  const bio = document.getElementById("bio-input").value.trim();
  const availability = document.getElementById("availability-input").value;

  let photoUrl = null;
  const file = document.getElementById("photo-input").files[0];
  if (file) {
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(`profiles/${Date.now()}-${file.name}`, file);
    if (!error) {
      photoUrl = `${supabase.storageUrl}/object/public/photos/${data.path}`;
    }
  }

  const { error } = await supabase.from('community').insert({
    name: `${first} ${last}`,
    email,
    skills,
    bio,
    availability,
    image_url: photoUrl
  });

  if (error) {
    console.error(error);
    showNotification("❌ Error saving profile");
  } else {
    showNotification("✅ Profile saved!");
    document.getElementById("success-message").style.display = "block";
  }
});

// --- INDIVIDUAL SEARCH ---
document.getElementById("find-team-btn")?.addEventListener("click", async () => {
  const input = document.getElementById("teamSkillsInput").value.toLowerCase();
  const { data, error } = await supabase.from('community').select('*');
  if (error) return console.error(error);

  const matches = data.filter(p =>
    p.skills?.some(skill => input.split(",").map(s => s.trim()).includes(skill.toLowerCase()))
  );
  renderCards(matches, "cardContainer");
});

document.getElementById("search-name-btn")?.addEventListener("click", async () => {
  const input = document.getElementById("nameInput").value.toLowerCase();
  const { data, error } = await supabase.from('community').select('*');
  if (error) return console.error(error);

  const matches = data.filter(p => p.name.toLowerCase().includes(input));
  renderCards(matches, "cardContainer");
});

// --- TEAM BUILDER ---
window.buildBestTeam = async function() {
  const input = document.getElementById("team-skills-input").value.toLowerCase().split(",");
  const size = parseInt(document.getElementById("teamSize").value, 10);
  const { data, error } = await supabase.from('community').select('*');
  if (error) return console.error(error);

  let matches = data.filter(p =>
    p.skills?.some(skill => input.includes(skill.toLowerCase()))
  );

  matches = matches.slice(0, size); // naive selection
  renderCards(matches, "bestTeamContainer");
};

// --- LEADERBOARD ---
async function loadLeaderboard() {
  const { data, error } = await supabase.from('community').select('skills, endorsements');
  if (error) return console.error(error);

  const counts = {};
  data.forEach(user => {
    (user.skills || []).forEach(skill => {
      counts[skill] = (counts[skill] || 0) + (user.endorsements?.[skill] || 0);
    });
  });

  const rows = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([skill, count]) => `<div>${skill}: ${count}</div>`)
    .join("");

  document.getElementById("leaderboard-rows").innerHTML = rows;
}
loadLeaderboard();

// --- ENDORSEMENTS ---
function renderCards(users, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  users.forEach(u => {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <img src="${u.image_url || "images/default.png"}" alt="${u.name}" />
      <h3>${u.name}</h3>
      <p>${u.bio || ""}</p>
      <p>Skills: ${(u.skills || []).join(", ")}</p>
      <button class="endorse-btn" data-id="${u.id}">+ Endorse</button>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".endorse-btn").forEach(btn => {
    btn.addEventListener("click", () => openEndorseModal(btn.dataset.id));
  });
}

function openEndorseModal(userId) {
  const modal = document.getElementById("endorseSkillModal");
  modal.classList.remove("hidden");
  modal.dataset.userId = userId;
  loadUserSkills(userId);
}

async function loadUserSkills(userId) {
  const { data } = await supabase.from('community').select('*').eq('id', userId).single();
  const list = document.getElementById("endorse-skill-list");
  list.innerHTML = "";
  (data.skills || []).forEach(skill => {
    const item = document.createElement("div");
    item.className = "skill-endorse-item";
    item.innerHTML = `
      <span>${skill}</span>
      <button class="endorse-specific-skill-btn">${skill}</button>
    `;
    item.querySelector("button").addEventListener("click", () => endorseSkill(userId, skill));
    list.appendChild(item);
  });
}

async function endorseSkill(userId, skill) {
  const { data, error } = await supabase.from('community').select('endorsements').eq('id', userId).single();
  if (error) return console.error(error);

  const endorsements = data.endorsements || {};
  endorsements[skill] = (endorsements[skill] || 0) + 1;

  const { error: upErr } = await supabase.from('community').update({ endorsements }).eq('id', userId);
  if (upErr) return console.error(upErr);

  showNotification(`✅ Endorsed ${skill}!`);
  document.getElementById("endorseSkillModal").classList.add("hidden");
  loadLeaderboard();
}

// --- MODAL CLOSE HANDLER ---
document.querySelector("#endorseSkillModal .close-button")?.addEventListener("click", () => {
  document.getElementById("endorseSkillModal").classList.add("hidden");
});
