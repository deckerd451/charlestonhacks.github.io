// ===============================================
// FINAL ENHANCED FILE: assets/js/login.js
// ===============================================
// Improvements:
//  - Inline email validation with visual feedback
//  - Persistent Supabase session sync (appState.session)
//  - Smooth transitions between login and profile sections
//  - Global session propagation to other modules
//  - Auto-disable "Connect" / "Endorse" buttons if not logged in
// ===============================================

import { supabaseClient as supabase } from "./supabaseClient.js";
import { showNotification, isValidEmail } from "./utils.js";
import { initProfileForm } from "./profile.js";
import { appState } from "./globals.js"; // ✅ global state sync

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
  appState.session = null; // ✅ clear global session
  disableAuthDependentButtons(true); // disable Connect/Endorse buttons
}

// ===== Initialize on Page Load =====
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Login] Initializing…");

  // Get session from Supabase
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[Login] Session error:", error.message);
    showNotification("Auth error: " + error.message, "error");
  }

  // Restore user if already signed in
  if (session?.user) {
    appState.session = session; // ✅ sync global state
    handleUserSignedIn(session.user);
  } else {
    console.log("[Login] No active session.");
    disableAuthDependentButtons(true); // disable buttons if no session
  }

  // Listen for auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Auth Event]", event);

    if (event === "SIGNED_IN" && session?.user) {
      appState.session = session; // ✅ global sync on new login
      handleUserSignedIn(session.user);
      disableAuthDependentButtons(false); // re-enable buttons
    }

    if (event === "SIGNED_OUT") {
      appState.session = null;
      handleLogout();
      disableAuthDependentButtons(true);
    }

    if (event === "TOKEN_REFRESHED") {
      appState.session = session; // ✅ keep refreshed token
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

  disableAuthDependentButtons(false); // enable Connect/Endorse buttons
  initProfileForm();
}

// ===== Utility: Disable or enable endorsement/connect buttons =====
function disableAuthDependentButtons(disabled = true) {
  // Targets all buttons or links that require authentication
  const connectButtons = document.querySelectorAll(
    "button.connect-btn, .endorse-btn, [data-auth-required]"
  );

  connectButtons.forEach((btn) => {
    if (disabled) {
      btn.disabled = true;
      btn.classList.add("disabled");
      btn.style.opacity = "0.6";
      btn.title = "Login required";
    } else {
      btn.disabled = false;
      btn.classList.remove("disabled");
      btn.style.opacity = "1";
      btn.title = "";
    }
  });
}
