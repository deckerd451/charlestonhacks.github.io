// login.js
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
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Login] Initializing…");

  // Get current session
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[Login] Session error:", error.message);
    showNotification("Auth error: " + error.message, "error");
  }

  if (session?.user) {
    console.log("[Login] User restored:", session.user.email);
    showNotification(`Signed in as ${session.user.email}`, "success");
    initProfileForm();
  } else {
    console.log("[Login] No active session.");
  }

  // Listen for future auth changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Auth Event]", event);

    if (event === "SIGNED_IN" && session?.user) {
      console.log("[Auth] Signed in:", session.user.email);
      showNotification(`Welcome, ${session.user.email}`, "success");
      initProfileForm();
    }

    if (event === "SIGNED_OUT") {
      console.log("[Auth] Signed out");
      showNotification("You are signed out.", "info");
    }

    if (event === "TOKEN_REFRESHED") {
      console.log("[Auth] Token refreshed");
    }

    if (event === "USER_UPDATED") {
      console.log("[Auth] User updated");
    }
  });
});
