// /assets/js/main.js
import { supabaseClient as supabase } from "./supabaseClient.js";
import { loadLeaderboard } from "./leaderboard.js";
import { generateUserCardHTML } from "./cardRenderer.js";
import { showNotification } from "./utils.js";
import { initDocsModal } from "./docsModal.js";

/* -----------------------------
   Tabs
----------------------------- */
function initTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panes = document.querySelectorAll(".tab-content-pane");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active-tab-pane"));

      btn.classList.add("active");
      const target = btn.dataset.tab;
      document.getElementById(target)?.classList.add("active-tab-pane");
    });
  });
}

/* -----------------------------
   Render Cards
----------------------------- */
async function renderResults(data) {
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

  for (const person of data) {
    const cardHTML = await generateUserCardHTML(person);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = cardHTML.trim();
    const cardEl = wrapper.firstElementChild;

    // Attach endorsement buttons
    attachEndorseButtons(cardEl, person);

    cardContainer.appendChild(cardEl);
  }
}

/* -----------------------------
   Search
----------------------------- */
function initSearch() {
  const findTeamBtn = document.getElementById("find-team-btn");
  const searchNameBtn = document.getElementById("search-name-btn");

  if (findTeamBtn) {
    findTeamBtn.addEventListener("click", async () => {
      const rawInput = document.getElementById("teamSkillsInput").value.trim();
      if (!rawInput) return;
      const skillsArray = rawInput.split(",").map((s) => s.trim()).filter(Boolean);

      const { data, error } = await supabase
        .from("community")
        .select("*")
        .or(
          `skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(",")}}`
        );
      if (error) {
        console.error("[Search] Supabase error:", error);
        showNotification("Error searching.", "error");
        return;
      }
      renderResults(data);
    });
  }

  if (searchNameBtn) {
    searchNameBtn.addEventListener("click", async () => {
      const name = document.getElementById("nameInput").value.trim();
      if (!name) return;

      const { data, error } = await supabase
        .from("community")
        .select("*")
        .ilike("name", `%${name}%`);
      if (error) {
        console.error("[Search] Supabase error:", error);
        showNotification("Error searching by name.", "error");
        return;
      }
      renderResults(data);
    });
  }
}

/* -----------------------------
   Team Builder
----------------------------- */
async function buildBestTeam() {
  const skillsInput = document.getElementById("team-skills-input");
  const teamSizeInput = document.getElementById("teamSize");
  const container = document.getElementById("bestTeamContainer");

  if (!skillsInput || !container) return;

  const raw = skillsInput.value.trim();
  if (!raw) {
    showNotification("Please enter required team skills.", "error");
    return;
  }

  const skillsArray = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const teamSize = parseInt(teamSizeInput?.value, 10) || 3;

  const { data, error } = await supabase
    .from("community")
    .select("*")
    .or(
      `skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(",")}}`
    );
  if (error) {
    console.error("[TeamBuilder] Supabase error:", error);
    showNotification("Error building team.", "error");
    return;
  }

  container.innerHTML = "";
  const results = (data || []).slice(0, teamSize);
  if (results.length === 0) {
    container.innerHTML = "<p>No matching team members found.</p>";
    return;
  }

  for (const person of results) {
    const cardHTML = await generateUserCardHTML(person);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = cardHTML.trim();
    const cardEl = wrapper.firstElementChild;

    // Attach endorsement buttons
    attachEndorseButtons(cardEl, person);

    container.appendChild(cardEl);
  }
}
globalThis.buildBestTeam = buildBestTeam;

/* -----------------------------
   Endorsements
----------------------------- */
function attachEndorseButtons(cardEl, person) {
  const endorseBtns = cardEl.querySelectorAll(".endorse-btn");
  endorseBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const skill = btn.dataset.skill;
      if (skill) openEndorseModal(person.id, skill);
    });
  });
}

function openEndorseModal(userId, skill) {
  const modal = document.getElementById("endorseSkillModal");
  const skillList = document.getElementById("endorse-skill-list");
  const closeBtn = modal.querySelector(".close-button");

  skillList.innerHTML = `<div class="skill-endorse-item">
    <span>${skill}</span>
    <button class="endorse-specific-skill-btn" data-user="${userId}" data-skill="${skill}">Endorse</button>
  </div>`;

  modal.style.display = "block";

  closeBtn.onclick = () => (modal.style.display = "none");

  const endorseBtns = skillList.querySelectorAll(".endorse-specific-skill-btn");
  endorseBtns.forEach((b) =>
    b.addEventListener("click", async () => {
      await endorseSkill(b.dataset.user, b.dataset.skill);
      modal.style.display = "none";
    })
  );
}

async function endorseSkill(userId, skill) {
  try {
    const { error } = await supabase.from("endorsements").insert({
      endorsed_user_id: userId,
      skill,
    });

    if (error) throw error;

    showNotification(`You endorsed ${skill}!`, "success");
    loadLeaderboard();
  } catch (err) {
    console.error("[Endorse] Error:", err);
    showNotification("Failed to endorse skill.", "error");
  }
}

/* -----------------------------
   App Bootstrap
----------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Main] App Initialized");

  initTabs();
  initSearch();
  loadLeaderboard();

  if (document.getElementById("docsModal")) {
    initDocsModal();
  }
});
