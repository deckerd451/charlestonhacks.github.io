// ===============================================
// ENHANCED FILE: assets/js/login.js
// ===============================================
// Improvements:
//  - Animated login button + spinner
//  - Inline email validation
//  - Persistent user status bar
//  - Enhanced notifications via utils.js
//  - Smooth transitions for login/profile sections
// ===============================================

import { supabaseClient as supabase } from "./supabaseClient.js";
import { showNotification, isValidEmail } from "./utils.js";
import { initProfileForm } from "./profile.js";
import { appState } from "./globals.js";   // ✅ this belongs here, at the top

// ===== Handle Login =====
export async function handleLogin(email) {
  const loginBtn = document.getElementById("login-btn");
  const spinner = document.getElementById("login-spinner");

  try {
    if (!isValidEmail(email)) {
      showNotification("Please enter a valid email address.", "error");
      return;
    }

    loginBtn.disabled = true;
    spinner?.classList.remove("hidden");
    loginBtn.textContent = "Sending...";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/2card.html" },
    });

    if (error) {
      console.error("[Login] Magic link error:", error);
      showNotification("❌ Login failed: " + error.message, "error");
    } else {
      showNotification("✅ Check your email for the login link.", "success");
    }
  } catch (err) {
    console.error("[Login] Unexpected error:", err);
    showNotification("Unexpected login error.", "error");
  } finally {
    spinner?.classList.add("hidden");
    loginBtn.disabled = false;
    loginBtn.textContent = "Send Magic Link";
  }
}

// ===== Handle Logout =====
export async function handleLogout() {
  await supabase.auth.signOut();
  showNotification("You have been logged out.", "info");
  document.getElementById("skills-form")?.reset();
  document.body.classList.remove("logged-in");
  document.getElementById("user-status")?.classList.add("hidden");
  appState.session = null;   // ✅ clear global session on logout
}

// ===== Initialize on Page Load =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Login] Initializing…");

  // Get session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[Login] Session error:", error.message);
    showNotification("Auth error: " + error.message, "error");
  }

  // Restore user if already signed in
  if (session?.user) {
    appState.session = session;     // ✅ sync global state immediately on load
    handleUserSignedIn(session.user);
  } else {
    console.log("[Login] No active session.");
  }

  // Auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Auth Event]", event);

    if (event === "SIGNED_IN" && session?.user) {
      appState.session = session;   // ✅ global sync on new login
      handleUserSignedIn(session.user);
    }

    if (event === "SIGNED_OUT") {
      appState.session = null;
      handleLogout();
    }

    if (event === "TOKEN_REFRESHED") {
      appState.session = session;   // ✅ keep refreshed tokens
      console.log("[Auth] Token refreshed");
    }

    if (event === "USER_UPDATED") console.log("[Auth] User updated");
  });
});

// ===== Helper: Handle Signed In User =====
function handleUserSignedIn(user) {
  console.log("[Auth] Signed in:", user.email);
  showNotification(`Welcome, ${user.email}`, "success");

  // Update UI
  const userStatus = document.getElementById("user-status");
  const userEmail = document.getElementById("user-email");

  if (userStatus && userEmail) {
    userEmail.textContent = user.email;
    userStatus.classList.remove("hidden");
    document.body.classList.add("logged-in");
  }

  initProfileForm();
}
