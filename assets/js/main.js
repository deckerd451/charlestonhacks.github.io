// main.js
import { showNotification } from "./utils.js";
import { initProfileForm } from "./profile.js";
import { loadLeaderboard } from "./leaderboard.js";
import { supabaseClient as supabase } from "./supabaseClient.js";

// Initialize app on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Main] App Initialized");

  // Init profile form
  initProfileForm();

  // Load leaderboard
  loadLeaderboard();

  // Example auth state check
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    showNotification(`Welcome back, ${user.email}`, "success");
  } else {
    console.log("[Main] No logged-in user");
  }
});
