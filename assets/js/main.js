import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { initDocsModal } from './docsModal.js';
import { loadLeaderboard } from './leaderboard.js';
import { generateUserCardHTML } from './cardRenderer.js';

// 1. Initialize Magic Link login & auth state
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
        options: { emailRedirectTo: window.location.href },
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
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

// 2. Initialize tab switching
function initTabs() {
  const buttons = document.querySelectorAll(".tab-button");
  const panes = document.querySelectorAll(".tab-content-pane");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active-tab-pane"));

      btn.classList.add("active");
      const target = btn.dataset.tab;
      const activePane = document.getElementById(target);
      if (activePane) activePane.classList.add("active-tab-pane");
    });
  });
}

// 3. Render search or team results into cards
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
    try {
      const cardHTML = await generateUserCardHTML(person);
      const wrapper = document.createElement("div");
      wrapper.innerHTML = cardHTML.trim();
      const cardEl = wrapper.firstElementChild;

      // Open modal on card click (excluding clicks on endorse buttons)
      cardEl.addEventListener("click", () => openEndorseModal(person));

      // Attach endorse button handlers (direct endorse via plus button)
      cardEl.querySelectorAll(".endorse-btn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const userId = btn.getAttribute("data-user-id");
          const skill = btn.getAttribute("data-skill");
          await endorseSkill(userId, skill);
        });
      });

      cardContainer.appendChild(cardEl);
    } catch (err) {
      console.error("[RenderResults] Error rendering card:", err);
    }
  }
}

// 4. Search logic (multi‑skill search or name search)
function initSearch() {
  const findTeamBtn = document.getElementById("find-team-btn");
  const searchNameBtn = document.getElementById("search-name-btn");

  // Multi‑skill search across skills[] OR interests[]
  if (findTeamBtn) {
    findTeamBtn.addEventListener("click", async () => {
      const rawInput = document.getElementById("teamSkillsInput").value.trim();
      if (!rawInput) return;

      const skillsArray = rawInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase
        .from("community")
        .select("*")
        .or(
          `skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(
            ","
          )}}`
        );

      if (error) {
        console.error("[Search] Supabase multi-skill search error:", error);
        return;
      }

      await renderResults(data);
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
        console.error("[Search] Supabase name search error:", error);
        return;
      }
      await renderResults(data);
    });
  }
}

// 5. Endorsement modal logic
function openEndorseModal(person) {
  const modal = document.getElementById("endorseSkillModal");
  const list = document.getElementById("endorse-skill-list");

  if (!modal || !list) return;

  list.innerHTML = "";

  // Helper to normalise skill strings or arrays
  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean).map((s) => s.toString().trim());
    return value
      .toString()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const skills = [...toArray(person.skills), ...toArray(person.interests)];

  if (skills.length === 0) {
    list.innerHTML = `<p>No skills/interests listed for ${person.name}.</p>`;
  } else {
    skills.forEach((skill) => {
      const item = document.createElement("div");
      item.className = "skill-endorse-item";
      item.innerHTML = `
        <span>${skill}</span>
        <button class="endorse-specific-skill-btn">Endorse</button>
      `;
      list.appendChild(item);
    });
  }

  // Attach handlers to the modal’s buttons
  list.querySelectorAll(".endorse-specific-skill-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const skill = btn.previousElementSibling.textContent.trim();
      await endorseSkill(person.id, skill);
      modal.style.display = "none";
    });
  });

  modal.style.display = "block";

  const closeBtn = modal.querySelector(".close-button");
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

// 6. Create or update an endorsement record
async function endorseSkill(endorsedUserId, skill) {
  try {
    // Get the current logged-in user to use as the endorser
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();
    if (!currentUser || userError) {
      showNotification("You must be logged in to endorse.", "error");
      return;
    }

    // Look up the endorser's community profile by email
    const { data: profile, error: profileError } = await supabase
      .from("community")
      .select("id")
      .eq("email", currentUser.email)
      .single();

    if (profileError || !profile) {
      console.warn("[Endorse] Profile lookup failed:", profileError);
      showNotification(
        "Please create your profile before endorsing others.",
        "error"
      );
      return;
    }

    const endorserId = profile.id;

    // Check if an endorsement from this endorser already exists
    const { data: existing, error: selectError } = await supabase
      .from("endorsements")
      .select("count")
      .eq("endorsed_user_id", endorsedUserId)
      .eq("endorsed_by_user_id", endorserId)
      .eq("skill", skill)
      .maybeSingle();

    if (
      selectError &&
      selectError.code &&
      selectError.code !== "PGRST116"
    ) {
      console.warn("[Endorse] select error:", selectError);
    }

    if (existing) {
      // Increment the existing count
      const newCount = (existing.count || 0) + 1;
      const { error: updateError } = await supabase
        .from("endorsements")
        .update({ count: newCount })
        .eq("endorsed_user_id", endorsedUserId)
        .eq("endorsed_by_user_id", endorserId)
        .eq("skill", skill);
      if (updateError) throw updateError;
    } else {
      // Insert a new endorsement record
      const { error: insertError } = await supabase
        .from("endorsements")
        .insert({
          endorsed_user_id: endorsedUserId,
          endorsed_by_user_id: endorserId,
          skill: skill,
          count: 1,
        });
      if (insertError) throw insertError;
    }

    // Re-fetch all endorsement counts for this skill to calculate the new total
    const { data: records } = await supabase
      .from("endorsements")
      .select("count")
      .eq("endorsed_user_id", endorsedUserId)
      .eq("skill", skill);
    const totalCount = (records || []).reduce(
      (acc, r) => acc + (r.count || 0),
      0
    );

    // Update UI
    updateCardCount(endorsedUserId, skill, totalCount);
    await loadLeaderboard();
    showNotification(`Endorsed ${skill}!`, "success");
  } catch (err) {
    console.error("[Endorse] Error:", err);
    showNotification("Failed to endorse.", "error");
  }
}

// Update endorsement count on all visible cards for a user and skill
function updateCardCount(endorsedUserId, skill, newCount) {
  document
    .querySelectorAll(
      `.endorse-btn[data-user-id="${endorsedUserId}"][data-skill="${skill}"]`
    )
    .forEach((btn) => {
      const countSpan = btn.parentElement.querySelector(
        ".endorsement-count"
      );
      if (countSpan) {
        countSpan.textContent = newCount;
      }
    });
}

// 7. Team builder – build a best‑match team
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

  const skillsArray = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const teamSize = teamSizeInput
    ? parseInt(teamSizeInput.value, 10) || 3
    : 3;

  try {
    const { data, error } = await supabase
      .from("community")
      .select("*")
      .or(
        `skills.cs.{${skillsArray.join(",")}},interests.cs.{${skillsArray.join(
          ","
        )}}`
      );

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

    for (const person of results) {
      try {
        const cardHTML = await generateUserCardHTML(person);
        const wrapper = document.createElement("div");
        wrapper.innerHTML = cardHTML.trim();
        const cardEl = wrapper.firstElementChild;

        // Open endorse modal on card click
        cardEl.addEventListener("click", () => openEndorseModal(person));

        // Attach endorse button handlers
        cardEl.querySelectorAll(".endorse-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute("data-user-id");
            const skill = btn.getAttribute("data-skill");
            await endorseSkill(userId, skill);
          });
        });

        container.appendChild(cardEl);
      } catch (err) {
        console.error("[TeamBuilder] Error rendering team card:", err);
      }
    }
  } catch (err) {
    console.error("[TeamBuilder] Unexpected error:", err);
    showNotification("Unexpected error building team.", "error");
  }
}

// Expose buildBestTeam globally so inline onclick works
globalThis.buildBestTeam = buildBestTeam;

// 8. App bootstrap
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Main] App Initialized");
  await initAuth();
  initTabs();

  // Initialize docs modal if present
  if (
    document.getElementById("docsModal") ||
    document.getElementById("docs-modal")
  ) {
    initDocsModal();
  }

  // Load leaderboard and attach search listeners
  loadLeaderboard();
  initSearch();

  // Initialize the profile form submission using magic link authentication
  initProfileForm();
});

// 9. Handle profile form submission with magic link
function initProfileForm() {
  const form = document.getElementById("skills-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Grab values from the form
    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const skills = document.getElementById("skills-input").value.trim();
    const bio = document.getElementById("bio-input").value.trim();
    const availability = document.getElementById("availability-input").value;

    if (!email) {
      showNotification("Please enter a valid email.", "error");
      return;
    }

    try {
      // Send a magic link to the user's email. This will create the user if they don't exist.
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
        },
      });
      if (error) {
        console.error("[Profile] Magic link error:", error);
        showNotification("Failed to send magic link.", "error");
        return;
      }

      showNotification("Magic link sent! Check your inbox.", "success");

      // Optionally subscribe the user to Mailchimp here using a hidden form as before.
      // (This step requires no response back to this page.)
      const mailchimpForm = document.createElement("form");
      mailchimpForm.action =
        "https://charlestonhacks.us12.list-manage.com/subscribe/post?u=79363b7a43970f760d61360fd&id=3b95e0177a";
      mailchimpForm.method = "POST";
      mailchimpForm.target = "_blank";
      mailchimpForm.innerHTML = `
        <input type="hidden" name="FNAME" value="${firstName}">
        <input type="hidden" name="LNAME" value="${lastName}">
        <input type="hidden" name="EMAIL" value="${email}">
      `;
      document.body.appendChild(mailchimpForm);
      mailchimpForm.submit();
      document.body.removeChild(mailchimpForm);

      // Reset form after sending magic link
      form.reset();
    } catch (err) {
      console.error("[Profile] Magic link exception:", err);
      showNotification("An unexpected error occurred.", "error");
    }
  });
}

