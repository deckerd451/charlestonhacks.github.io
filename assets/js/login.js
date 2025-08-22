// assets/js/login.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './globals.js';
import { initProfileForm } from './profile.js';

export async function initLogin() {
  const loginSection = document.getElementById('login-section');
  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('login-email');

  // Handle Magic Link email submission
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href } // redirect back here
      });

      if (error) throw error;

      showNotification(`Magic link sent to ${email}`, "success");
    } catch (err) {
      console.error("Login error:", err);
      showNotification("Failed to send magic link", "error");
    }
  });

  // After returning via magic link, Supabase stores session
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
      console.log("Signed in via Magic Link:", session.user.email);

      if (loginSection) loginSection.style.display = 'none';
      await initProfileForm(); // now show profile form
    }
  });

  // Auto-init profile if already logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    console.log("Already logged in:", user.email);
    if (loginSection) loginSection.style.display = 'none';
    await initProfileForm();
  }
}

// Start login flow on page load
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
});
