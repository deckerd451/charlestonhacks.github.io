// assets/js/profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { appState, DOMElements, showNotification } from './globals.js';

// Load the session and current user
async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
  return data.user;
}

// Show profile form only after login
export async function initProfileForm() {
  const user = await getCurrentUser();

  if (!user) {
    console.log("No user logged in yet — waiting for magic link.");
    return;
  }

  // Save user in appState
  appState.currentUser = user;
  console.log("Logged in as:", user.email);

  // Hide login, show profile form
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('skills-form').style.display = 'block';

  // Pre-fill email
  document.getElementById('email').value = user.email;

  // Attach form listener
  const form = document.getElementById('skills-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const bio = document.getElementById('bio-input').value.trim();
    const availability = document.getElementById('availability-input').value;
    const skills = document.getElementById('skills-input').value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const { error } = await supabase.from('community').upsert({
        id: user.id,               // user UUID from Supabase
        name: `${firstName} ${lastName}`,
        email: email,
        bio: bio,
        availability: availability,
        interests: skills,
        image_url: null // placeholder until we wire photo upload
      });

      if (error) throw error;

      document.getElementById('success-message').style.display = 'block';
      showNotification("Profile saved successfully!", "success");
    } catch (err) {
      console.error("Error saving profile:", err);
      showNotification("Failed to save profile", "error");
    }
  });
}
