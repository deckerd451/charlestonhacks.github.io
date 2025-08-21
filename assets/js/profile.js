// assets/js/profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

// Cache DOM
const magicForm = document.getElementById("magic-link-form");
const magicEmailInput = document.getElementById("magic-email");
const magicMsg = document.getElementById("magic-link-msg");
const profileForm = document.getElementById("skills-form");
const successMessage = document.getElementById("success-message");

let currentUser = null; // Will hold logged-in user

/* ------------------------------
   MAGIC LINK LOGIN
--------------------------------*/
if (magicForm) {
  magicForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = magicEmailInput.value.trim();

    if (!email) {
      showNotification("Please enter a valid email", "error");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });

    if (error) {
      showNotification("Magic link error: " + error.message, "error");
    } else {
      magicMsg.style.display = "block";
      magicMsg.textContent = `✅ A login link has been sent to ${email}. Check your inbox!`;
    }
  });
}

/* ------------------------------
   CHECK LOGIN STATE
--------------------------------*/
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    console.log("[Profile] Logged in:", currentUser.email);
    showNotification(`Welcome ${currentUser.email}`, "success");

    // Prefill email field in profile form
    const emailInput = document.getElementById("email");
    if (emailInput) emailInput.value = currentUser.email;
  } else {
    currentUser = null;
  }
});

/* ------------------------------
   PROFILE CREATION
--------------------------------*/
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentUser) {
      showNotification("You must log in with Magic Link before creating a profile.", "error");
      return;
    }

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const skills = document.getElementById("skills-input").value.trim();
    const bio = document.getElementById("bio-input").value.trim();
    const availability = document.getElementById("availability-input").value;
    const newsletter = document.getElementById("newsletter-opt-in").checked;

    // Handle photo upload
    const photoInput = document.getElementById("photo-input");
    let photoUrl = null;

    if (photoInput?.files?.length) {
      const file = photoInput.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `profiles/${currentUser.id}.${fileExt}`;

      let { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        showNotification("Photo upload failed: " + uploadError.message, "error");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      photoUrl = data.publicUrl;
    }

    // Save profile into `community` table
    const { error } = await supabase.from("community").upsert({
      id: currentUser.id, // keep id stable
      name: `${firstName} ${lastName}`,
      email,
      skills,
      interests: bio,
      availability,
      image_url: photoUrl,
      newsletter_opt_in: newsletter
    });

    if (error) {
      showNotification("Profile save error: " + error.message, "error");
    } else {
      successMessage.style.display = "block";
      showNotification("✅ Profile saved successfully!", "success");
    }
  });
}
