// main.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';
import { initDocsModal } from './docsModal.js';
import { loadLeaderboard } from './leaderboard.js';

// 🔑 Initialize Magic Link login form
async function initAuth() {
  const loginForm = document.getElementById("login-form");
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

  // Check for existing session
  const { data: { user }, error } = await supabase.auth.getUser();
  if (user) {
    console.log("[Login] User is logged in:", user.email);
    document.getElementById("login-section")?.classList.add("hidden");
    document.getElementById("profile-section")?.classList.remove("hidden");
  } else if (error) {
    console.warn("[Login] No active session:", error.message);
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
