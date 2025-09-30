import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

/**
 * Initialize profile form and saving logic
 */
export function initProfileForm() {
  const form = document.getElementById("skills-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
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

      const newsletterOptIn = document.getElementById("newsletter-opt-in")?.checked || false;

      // Fetch existing profile first (so we can preserve old image_url if needed)
      let existingImageUrl = null;
      const { data: existingProfile, error: existingError } = await supabase
        .from("community")
        .select("image_url")
        .eq("user_id", userId)
        .single();

      if (!existingError && existingProfile) {
        existingImageUrl = existingProfile.image_url;
      }

      // Optional: handle image upload
      let imageUrl = existingImageUrl;
      const photoInput = document.getElementById("photo-input");
      if (photoInput && photoInput.files.length > 0) {
        const photoFile = photoInput.files[0];
        const filePath = `profiles/${userId}/${Date.now()}-${photoFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) {
          console.error("Image upload failed:", uploadError.message);
          showNotification("Photo upload failed. Keeping your existing photo.", "warning");
        } else {
          // ✅ Successfully uploaded new image
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;

          // 🧹 Delete old image from storage (if it exists and is in the same bucket)
          if (existingImageUrl && existingImageUrl.includes("/avatars/")) {
            try {
              const pathParts = existingImageUrl.split("/avatars/");
              if (pathParts.length > 1) {
                const oldPath = decodeURIComponent(pathParts[1]);
                const { error: deleteError } = await supabase.storage
                  .from("avatars")
                  .remove([oldPath]);
                if (deleteError) {
                  console.warn("Failed to delete old profile image:", deleteError.message);
                }
              }
            } catch (deleteErr) {
              console.warn("Unexpected error deleting old profile image:", deleteErr);
            }
          }
        }
      }

      // Insert or update profile in community table
      const { error: upsertError } = await supabase
        .from("community")
        .upsert(
          {
            user_id: userId,
            name: `${fname} ${lname}`,
            email,
            skills, // saves as Postgres array
            bio,
            availability,
            image_url: imageUrl,
            newsletter_opt_in: newsletterOptIn,
            newsletter_opt_in_at: newsletterOptIn ? new Date().toISOString() : null,
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("Supabase error:", upsertError.message);
        showNotification("Error saving profile.", "error");
        return;
      }

      // ✅ If opted-in, send to Mailchimp
      if (newsletterOptIn) {
        const mcForm = document.createElement("form");
        mcForm.action =
          "https://charlestonhacks.us12.list-manage.com/subscribe/post?u=79363b7a43970f760d61360fd&id=3b95e0177a";
        mcForm.method = "POST";
        mcForm.target = "_blank";

        mcForm.innerHTML = `
          <input type="hidden" name="FNAME" value="${fname}">
          <input type="hidden" name="LNAME" value="${lname}">
          <input type="hidden" name="EMAIL" value="${email}">
        `;

        document.body.appendChild(mcForm);
        mcForm.submit();
        document.body.removeChild(mcForm);
      }

      showNotification("Profile saved successfully!", "success");

      // Show success message
      const successMessageEl = document.getElementById("success-message");
      if (successMessageEl) {
        successMessageEl.classList.remove("hidden");
        successMessageEl.style.display = "block";
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      showNotification("Unexpected error saving profile.", "error");
    }
  });
}

/**
 * Render skills as neat tags (instead of comma string)
 * @param {string[]|string} skills
 * @returns {string} HTML markup for skill tags
 */
export function renderSkills(skills) {
  if (!skills) return "";
  let list = Array.isArray(skills)
    ? skills
    : String(skills).split(",").map(s => s.trim()).filter(Boolean);

  if (list.length === 0) {
    return `<span class="skill-tag">No skills listed</span>`;
  }

  return list
    .map(skill => `<span class="skill-tag">${skill}</span>`)
    .join(" ");
}
