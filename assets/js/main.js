import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { initDocsModal } from './docsModal.js';
import { loadLeaderboard } from './leaderboard.js';

// 🔑 Initialize Magic Link login & auth state
async function initAuth() {
  const loginForm = document.getElementById("login-form");
  const loginSection = document.getElementById("login-section");
  const profileSection = document.getElementById("profile-section");
  const logoutBtn = document.getElementById("logout-btn");
  const userBadge = document.getElementById("user-badge");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value.trim();
      if (!email) {
        showNotification("Please enter a valid email.", "error");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href }
      });

      if (error) {
        console.error("[Login] Error:", error.message);
        showNotification("Failed to send magic link.", "error");
      } else {
        showNotification("Magic link sent! Check your inbox.", "success");
      }
    });
  }

  function setLoggedInUI(user) {
    loginSection?.classList.add("hidden");
    profileSection?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    if (userBadge) {
      userBadge.textContent = `Signed in as ${user.email}`;
      userBadge.classList.remove("hidden");
    }
  }

  function setLoggedOutUI() {
    loginSection?.classList.remove("hidden");
    profileSection?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    if (userBadge) {
      userBadge.textContent = "";
      userBadge.classList.add("hidden");
    }
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) {
    console.log("[Auth] Logged in as:", user.email);
    setLoggedInUI(user);
  } else if (error) {
    console.warn("[Auth] No active session:", error.message);
    setLoggedOutUI();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      console.log("[Auth] Signed in:", session.user.email);
      setLoggedInUI(session.user);
    } else {
      console.log("[Auth] Signed out");
      setLoggedOutUI();
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      showNotification("Signed out.", "success");
      setLoggedOutUI();
    });
  }
}

// 📑 Initialize tab switching
function initTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panes = document.querySelectorAll(".tab-content-pane");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active-tab-pane"));

      btn.classList.add("active");
      const target = btn.dataset.tab;
      const activePane = document.getElementById(target);
      if (activePane) activePane.classList.add("active-tab-pane");
    });
  });
}

// 🔎 Render search results into cards
function renderResults(data) {
  const cardContainer = document.getElementById("cardContainer");
  const noResults = document.getElementById("noResults");
  const matchNotification = document.getElementById("matchNotification");

  cardContainer.innerHTML = "";
  matchNotification.style.display = "none";
  noResults.style.display = "none";

  if (!data || data.length === 0) {
    noResults.style.display = "block";
    return;
  }

  matchNotification.textContent = `Found ${data.length} result(s).`;
  matchNotification.style.display = "block";

  data.forEach(person => {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <img src="${person.image_url || 'images/default-avatar.png'}" 
           alt="${person.name}" 
           class="profile-avatar"/>
      <h3>${person.name || "Unnamed User"}</h3>
      <p><strong>Skills:</strong> ${person.skills || "Not specified"}</p>
      <p><strong>Interests:</strong> ${person.interests || "Not specified"}</p>
      <p><strong>Availability:</strong> ${person.availability || "Unknown"}</p>
      <p><strong>Bio:</strong> ${person.bio || ""}</p>
    `;

    // 👇 Clicking a card opens endorse modal
    card.addEventListener("click", () => openEndorseModal(person));

    cardContainer.appendChild(card);
  });
}

// 🔎 Search logic (skills + name)
function initSearch() {
  const findTeamBtn = document.getElementById("find-team-btn");
  const searchNameBtn = document.getElementById("search-name-btn");

// Multi-skill AND search across skills[] OR interests[]
if (findTeamBtn) {
  findTeamBtn.addEventListener("click", async () => {
    const rawInput = document.getElementById("teamSkillsInput").value.trim();
    if (!rawInput) return;

    const skillsArray = rawInput.split(",").map(s => s.trim()).filter(Boolean);

    const { data, error } = await supabase
      .from("community")
      .select("*")
      .or(
        `skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(",")}}`
      );

    if (error) {
      console.error("Supabase multi-skill search error:", error);
      return;
    }

    renderResults(data);
  });
}
 // Name search
  if (searchNameBtn) {
    searchNameBtn.addEventListener("click", async () => {
      const name = document.getElementById("nameInput").value.trim();
      if (!name) return;

      const { data, error } = await supabase
        .from("community")
        .select("*")
        .ilike("name", `%${name}%`);

      if (error) {
        console.error("Supabase name search error:", error);
        return;
      }
      renderResults(data);
    });
  }
}

// ...imports and other functions above...
function openEndorseModal(person) {
  const modal = document.getElementById("endorseSkillModal");
  const list = document.getElementById("endorse-skill-list");
  if (!modal || !list) return;

  list.innerHTML = "";

  // Coerce skills & interests into arrays (handles strings, arrays or null)
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(Boolean).map(s => s.toString().trim());
    }
    return value.toString().split(",").map(s => s.trim()).filter(Boolean);
  };

  const skills = [...toArray(person.skills), ...toArray(person.interests)];

  if (skills.length === 0) {
    list.innerHTML = `<p>No skills/interests listed for ${person.name}.</p>`;
  } else {
    skills.forEach(skill => {
      const item = document.createElement("div");
      item.className = "skill-endorse-item";
      item.innerHTML = `
        <span>${skill}</span>
        <button class="endorse-specific-skill-btn">Endorse</button>
      `;
      list.appendChild(item);
    });
  }

  modal.style.display = "block";
  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = (event) => {
    if (event.target === modal) modal.style.display = "none";
  };
}

async function buildBestTeam() {
  const skillsInput = document.getElementById("team-skills-input");
  const teamSizeInput = document.getElementById("teamSize");
  const container = document.getElementById("bestTeamContainer");
  if (!skillsInput || !container) {
    console.warn("[TeamBuilder] Required elements not found.");
    return;
  }

  const raw = skillsInput.value.trim();
  if (!raw) {
    showNotification("Please enter required team skills.", "error");
    return;
  }

  const skillsArray = raw.split(",").map(s => s.trim()).filter(Boolean);
  const teamSize = teamSizeInput ? parseInt(teamSizeInput.value, 10) || 3 : 3;

  const { data, error } = await supabase
    .from("community")
    .select("*")
    .or(`skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(",")}}`);

  if (error) {
    console.error("[TeamBuilder] Supabase error:", error);
    showNotification("Error fetching team members.", "error");
    return;
  }

  const results = (data || []).slice(0, teamSize);
  container.innerHTML = "";
  if (results.length === 0) {
    container.innerHTML = "<p>No matching team members found.</p>";
    return;
  }

  results.forEach(person => {
    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <img src="${person.image_url || 'images/default-avatar.png'}"
           alt="${person.name || ''}"
           class="profile-avatar"/>
      <h3>${person.name || 'Unnamed User'}</h3>
      <p><strong>Skills:</strong> ${person.skills || 'Not specified'}</p>
      <p><strong>Interests:</strong> ${person.interests || 'Not specified'}</p>
      <p><strong>Availability:</strong> ${person.availability || 'Unknown'}</p>
      <p><strong>Bio:</strong> ${person.bio || ''}</p>
    `;
    container.appendChild(card);
  });
}

// Make buildBestTeam globally available for inline HTML handlers
globalThis.buildBestTeam = buildBestTeam;

document.addEventListener("DOMContentLoaded", async () => {
  await initAuth();
  initTabs();

  // Initialise docs modal if either ID exists
  if (document.getElementById("docsModal") || document.getElementById("docs-modal")) {
    initDocsModal();
  }

  loadLeaderboard();
  initSearch();
});
