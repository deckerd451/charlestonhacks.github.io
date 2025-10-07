// =========================================================
// Imports
// =========================================================
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

// =========================================================
// 1. Initialize Profile Form
// =========================================================
export function initProfileForm() {
  const form = document.getElementById("skills-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      // ---------------------------------------------------------
      // 1A. Verify logged-in user
      // ---------------------------------------------------------
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification("You must be logged in to create a profile.", "error");
        return;
      }

      const userId = user.id;

      // ---------------------------------------------------------
      // 1B. Gather form input values
      // ---------------------------------------------------------
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

      // =========================================================
      // 2. Check for Existing Profile (Safe Version)
      // =========================================================
      let existingImageUrl = null;

      try {
        const { data: existingProfile, error: existingError, status } = await supabase
          .from("community")
          .select("image_url")
          .eq("user_id", userId)
          .maybeSingle(); // ✅ returns null instead of throwing 406

        if (existingError && status !== 406) {
          console.warn("[Profile] existing profile error:", existingError.message);
        }

        if (existingProfile && existingProfile.image_url) {
          existingImageUrl = existingProfile.image_url;
          console.log("[Profile] Existing profile found, updating record.");
        } else {
          console.log("[Profile] No existing profile found, creating new record.");
        }
      } catch (err) {
        console.warn("[Profile] Unexpected error loading profile:", err);
      }

      // =========================================================
      // 3. Optional: Handle Image Upload
      // =========================================================
      let imageUrl = existingImageUrl;
      const photoInput = document.getElementById("photo-input");

      if (photoInput && photoInput.files.length > 0) {
        const photoFile = photoInput.files[0];
        const filePath = `profiles/${userId}/${Date.now()}-${photoFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) {
          console.error("[Profile] Image upload failed:", uploadError.message);
          showNotification("Photo upload failed. Keeping your existing photo.", "warning");
        } else {
          const { data: publicUrlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;

          // Delete old image from storage (if it exists)
          if (existingImageUrl && existingImageUrl.includes("/avatars/")) {
            try {
              const pathParts = existingImageUrl.split("/avatars/");
              if (pathParts.length > 1) {
                const oldPath = decodeURIComponent(pathParts[1]);
                const { error: deleteError } = await supabase.storage
                  .from("avatars")
                  .remove([oldPath]);
                if (deleteError) {
                  console.warn("[Profile] Failed to delete old image:", deleteError.message);
                }
              }
            } catch (deleteErr) {
              console.warn("[Profile] Unexpected error deleting old image:", deleteErr);
            }
          }
        }
      }

      // =========================================================
      // 4. Upsert Profile (Insert or Update)
      // =========================================================
      const { error: upsertError } = await supabase
        .from("community")
        .upsert(
          {
            user_id: userId,
            name: `${fname} ${lname}`,
            email,
            skills, // PostgreSQL array
            bio,
            availability,
            image_url: imageUrl,
            newsletter_opt_in: newsletterOptIn,
            newsletter_opt_in_at: newsletterOptIn ? new Date().toISOString() : null,
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        console.error("[Profile] Upsert error:", upsertError.message);
        showNotification("Error saving profile.", "error");
        return;
      }

      // =========================================================
      // 5. Optional: Mailchimp Newsletter Opt-In
      // =========================================================
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

      // =========================================================
      // 6. Completion and UI Feedback
      // =========================================================
      showNotification("Profile saved successfully!", "success");

      const successMessageEl = document.getElementById("success-message");
      if (successMessageEl) {
        successMessageEl.classList.remove("hidden");
        successMessageEl.style.display = "block";
      }

    } catch (err) {
      console.error("[Profile] Unexpected error:", err);
      showNotification("Unexpected error saving profile.", "error");
    }
  });
}

// =========================================================
// 2. Render Skills Utility
// =========================================================
/**
 * Render skills as neat tags (instead of a comma string)
 * @param {string[]|string} skills
 * @returns {string} HTML markup for skill tags
 */
export function renderSkills(skills) {
  if (!skills) return "";

  const list = Array.isArray(skills)
    ? skills
    : String(skills).split(",").map(s => s.trim()).filter(Boolean);

  if (list.length === 0) {
    return `<span class="skill-tag">No skills listed</span>`;
  }

  return list.map(skill => `<span class="skill-tag">${skill}</span>`).join(" ");
}
