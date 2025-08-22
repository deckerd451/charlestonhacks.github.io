// profile.js
import { supabaseClient as supabase } from "./supabaseClient.js";
import { showNotification, isValidEmail } from "./utils.js";

/**
 * Initialize the profile form logic
 */
export function initProfileForm() {
  const form = document.getElementById("skills-form");
  if (!form) {
    console.warn("[Profile] Form not found in DOM.");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      showNotification("You must log in via Magic Link before creating a profile.", "error");
      return;
    }

    // Collect form fields
    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const skillsInput = document.getElementById("skills-input").value.trim();
    const bio = document.getElementById("bio-input").value.trim();
    const availability = document.getElementById("availability-input").value;
    const photoFile = document.getElementById("photo-input").files[0];

    if (!isValidEmail(email)) {
      showNotification("Please provide a valid email address.", "error");
      return;
    }

    // Upload photo if provided
    let imageUrl = null;
    if (photoFile) {
      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(`${user.id}/${photoFile.name}`, photoFile, { upsert: true });

      if (error) {
        showNotification("Photo upload failed: " + error.message, "error");
        return;
      }
      const { data: publicUrl } = supabase.storage.from("profile-photos").getPublicUrl(`${user.id}/${photoFile.name}`);
      imageUrl = publicUrl.publicUrl;
    }

    // Insert or update profile in community table
    const { error: upsertError } = await supabase.from("community").upsert({
      id: user.id, // use Supabase auth UID
      user_id: user.id,
      name: `${firstName} ${lastName}`,
      email,
      skills: skillsInput ? skillsInput.split(",").map(s => s.trim()) : [],
      bio,
      availability,
      image_url: imageUrl,
      newsletter_opt_in: document.getElementById("newsletter-opt-in").checked,
      newsletter_opt_in_at: new Date().toISOString()
    });

    if (upsertError) {
      console.error(upsertError);
      showNotification("Error saving profile: " + upsertError.message, "error");
      return;
    }

    showNotification("Profile saved successfully!", "success");
    form.reset();
    const preview = document.getElementById("preview");
    if (preview) preview.style.display = "none";
  });
}
