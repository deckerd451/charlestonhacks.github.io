// ===============================
// UPDATED FILE: assets/js/login.js
// ===============================
// Handles Supabase Magic Link authentication, UI toggles, and session state.
// Works with profile.js to display the correct logged-in interface.
// ===============================

import { supabaseClient as supabase } from "./supabaseClient.js";
import { showNotification } from "./utils.js";
import { initProfileForm } from "./profile.js";

// Send Magic Link
export async function handleLogin(email) {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/2card.html" }
    });

    if (error) {
      console.error("[Login] Magic link error:", error);
      showNotification("Login failed: " + error.message, "error");
    } else {
      showNotification("✅ Check your email for the login link.", "success");
    }
  } catch (err) {
    console.error("[Login] Unexpected error:", err);
    showNotification("Unexpected login error.", "error");
  }
}

// Logout
export async function handleLogout() {
  await supabase.auth.signOut();
  showNotification("You have been logged out.", "info");
  document.getElementById("skills-form")?.reset();

  // Hide profile UI and show login
  document.getElementById("login-section")?.classList.remove("hidden");
  document.getElementById("profile-section")?.classList.add("hidden");
  document.getElementById("user-badge")?.classList.add("hidden");
  document.getElementById("logout-btn")?.classList.add("hidden");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Login] Initializing…");

  // UI references
  const loginSection = document.getElementById("login-section");
  const profileSection = document.getElementById("profile-section");
  const userBadge = document.getElementById("user-badge");
  const logoutBtn = document.getElementById("logout-btn");
  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const emailInput = document.getElementById("login-email");

  // 1️⃣ Attach login handler
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      if (!email) {
        showNotification("Please enter your email.", "error");
        return;
      }
      loginButton.disabled = true;
      await handleLogin(email);
      setTimeout(() => (loginButton.disabled = false), 3000);
    });
  }

  // 2️⃣ Attach logout handler
  logoutBtn?.addEventListener("click", handleLogout);

  // 3️⃣ Restore existing session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[Login] Session error:", error.message);
    showNotification("Auth error: " + error.message, "error");
  }

  if (session?.user) {
    console.log("[Login] User restored:", session.user.email);
    showNotification(`Signed in as ${session.user.email}`, "success");

    // ✅ Switch UI sections
    loginSection?.classList.add("hidden");
    profileSection?.classList.remove("hidden");
    userBadge.textContent = `Signed in as ${session.user.email}`;
    userBadge.classList.remove("hidden");
    logoutBtn?.classList.remove("hidden");

    initProfileForm();
  } else {
    console.log("[Login] No active session.");
    loginSection?.classList.remove("hidden");
    profileSection?.classList.add("hidden");
  }

  // 4️⃣ Listen for future auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Auth Event]", event);

    if (event === "SIGNED_IN" && session?.user) {
      console.log("[Auth] Signed in:", session.user.email);
      showNotification(`Welcome, ${session.user.email}`, "success");

      // ✅ Switch UI sections
      loginSection?.classList.add("hidden");
      profileSection?.classList.remove("hidden");
      userBadge.textContent = `Signed in as ${session.user.email}`;
      userBadge.classList.remove("hidden");
      logoutBtn?.classList.remove("hidden");

      initProfileForm();
    }

    if (event === "SIGNED_OUT") {
      console.log("[Auth] Signed out");
      showNotification("You are signed out.", "info");

      loginSection?.classList.remove("hidden");
      profileSection?.classList.add("hidden");
      userBadge?.classList.add("hidden");
      logoutBtn?.classList.add("hidden");
    }

    if (event === "TOKEN_REFRESHED") console.log("[Auth] Token refreshed");
    if (event === "USER_UPDATED") console.log("[Auth] User updated");
  });
});
