// main.js
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

  // Handle login form
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

  // Helper to update UI for logged-in state
  function setLoggedInUI(user) {
    loginSection?.classList.add("hidden");
    profileSection?.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");
    if (userBadge) {
      userBadge.textContent = `Signed in as ${user.email}`;
      userBadge.classList.remove("hidden");
    }
  }

  // Helper to reset UI for logged-out state
  function setLoggedOutUI() {
    loginSection?.classList.remove("hidden");
    profileSection?.classList.add("hidden");
    logoutBtn?.classList.add("hidden");
    if (userBadge) {
      userBadge.textContent = "";
      userBadge.classList.add("hidden");
    }
  }

  // Check current session
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) {
    console.log("[Auth] Logged in as:", user.email);
    setLoggedInUI(user);
  } else if (error) {
    console.warn("[Auth] No active session:", error.message);
    setLoggedOutUI();
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      console.log("[Auth] Signed in:", session.user.email);
      setLoggedInUI(session.user);
    } else {
      console.log("[Auth] Signed out");
      setLoggedOutUI();
    }
  });

  // Handle logout
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
      // deactivate all
      buttons.forEach(b => b.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active-tab-pane"));

      // activate selected
      btn.classList.add("active");
      const target = btn.dataset.tab;
      const activePane = document.getElementById(target);
      if (activePane) activePane.classList.add("active-tab-pane");
    });
  });
}

// 🚀 App bootstrap
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Main] App Initialized");

  await initAuth();
  initTabs();
  initDocsModal();
  loadLeaderboard();
});
