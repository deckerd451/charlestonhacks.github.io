// /assets/js/profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './globals.js';

const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginMessage = document.getElementById("login-message");

const skillsForm = document.getElementById("skills-form");
const successMessage = document.getElementById("success-message");
const errorMessage = document.getElementById("error-message");

// Utility: toggle UI between login and profile form
function toggleAuthUI(isLoggedIn) {
  if (isLoggedIn) {
    document.getElementById("login-section").style.display = "none";
    skillsForm.style.display = "block";
  } else {
    document.getElementById("login-section").style.display = "block";
    skillsForm.style.display = "none";
  }
}

// ---- Handle Magic Link login ----
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value.trim();
    if (!email) return;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/2card.html`
        }
      });

      if (error) throw error;
      loginMessage.style.display = "block";
      loginMessage.textContent = "Check your email for a sign-in link!";
    } catch (err) {
      console.error("[Profile] Login error:", err);
      loginMessage.style.display = "block";
      loginMessage.textContent = "Could not send magic link.";
    }
  });
}

// ---- Check auth state on load ----
supabase.auth.getSession().then(({ data }) => {
  toggleAuthUI(!!data.session);
});

supabase.auth.onAuthStateChange((_event, session) => {
  toggleAuthUI(!!session);
});

// ---- Handle profile submission ----
if (skillsForm) {
  skillsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    successMessage.style.display = "none";
    errorMessage.style.display = "none";

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const skills = document.getElementById("skills-input").value.trim();
    const bio = document.getElementById("bio-input").value.trim();
    const availability = document.getElementById("availability-input").value;
    const newsletterOptIn = document.getElementById("newsletter-opt-in").checked;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      // Insert/update profile in Supabase
      const { error } = await supabase.from("community").upsert({
        id: user.id,
        name: `${firstName} ${lastName}`,
        email: user.email,
        skills,
        bio,
        availability,
        newsletter: newsletterOptIn,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;

      successMessage.style.display = "block";
      showNotification("Profile saved successfully!", "success");
    } catch (err) {
      console.error("[Profile] Save error:", err);
      errorMessage.style.display = "block";
      errorMessage.textContent = "Could not save profile.";
      showNotification("Could not save profile.", "error");
    }
  });
}
