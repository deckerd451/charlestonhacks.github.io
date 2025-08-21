import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

document.getElementById("skills-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    // 🔑 Get logged in user from magic link
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      showNotification("You must be logged in to create a profile.", "error");
      return;
    }

    const userId = user.id; // This matches community.user_id
    const fname = document.getElementById("first-name").value.trim();
    const lname = document.getElementById("last-name").value.trim();
    const email = document.getElementById("email").value.trim();
    const skills = document.getElementById("skills-input").value
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    const bio = document.getElementById("bio-input").value.trim();
    const availability = document.getElementById("availability-input").value;

    // Optional: handle image upload
    let imageUrl = null;
    const photoFile = document.getElementById("photo-input").files[0];
    if (photoFile) {
      const filePath = `profiles/${userId}/${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) {
        console.error("Image upload failed:", uploadError.message);
        showNotification("Photo upload failed, profile not saved.", "error");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }

    // Insert or update profile in community table
    const { error: upsertError } = await supabase
      .from("community")
      .upsert(
        {
          user_id: userId,
          name: `${fname} ${lname}`,
          email,
          skills,
          bio,
          availability,
          image_url: imageUrl,
        },
        { onConflict: "user_id" } // ensures one profile per user
      );

    if (upsertError) {
      console.error("Supabase error:", upsertError.message);
      showNotification("Error saving profile.", "error");
    } else {
      showNotification("Profile saved successfully!", "success");
      document.getElementById("success-message").style.display = "block";
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    showNotification("Unexpected error saving profile.", "error");
  }
});
