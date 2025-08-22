// login.js
import { supabaseClient as supabase } from "./supabaseClient.js";
import { showNotification } from "./utils.js";
import { initProfileForm } from "./profile.js";

// Handle magic link login
export async function handleLogin(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + "/2card.html" }
  });

  if (error) {
    console.error("[Login] Magic link error:", error);
    showNotification("Login failed: " + error.message, "error");
  } else {
    showNotification("Check your email for the login link!", "success");
  }
}

// Auto-init profile form after login redirect
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log("[Login] User is logged in:", user.email);
    initProfileForm();
  } else {
    console.log("[Login] No logged-in user yet.");
  }
});
