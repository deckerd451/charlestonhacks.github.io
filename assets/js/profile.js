// profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

export function initProfileForm() {
  const form = document.getElementById("skills-form");
  if (!form) return;

  // Profile progress tracking
  const inputs = [
    document.getElementById("first-name"),
    document.getElementById("last-name"),
    document.getElementById("email"),
    document.getElementById("skills-input"),
    document.getElementById("photo-input"),
    document.getElementById("availability-input")
  ];

  const progressBar = document.querySelector('.profile-bar-inner');
  const progressMsg = document.getElementById('profile-progress-msg');

  function updateProgress() {
    const filled = inputs.filter(el => el && el.value && el.value.trim()).length;
    const percent = Math.floor((filled / inputs.length) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressMsg) {
      progressMsg.textContent = percent === 100 ? "Profile Complete!" : "Profile Incomplete";
      progressMsg.className = percent === 100 ? "profile-complete" : "profile-incomplete";
    }
  }

  inputs.forEach(el => {
    if (el) el.addEventListener('input', updateProgress);
  });

  // Photo preview
  const photoInput = document.getElementById("photo-input");
  const preview = document.getElementById("preview");
  if (photoInput && preview) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          preview.src = ev.target.result;
          preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification("You must be logged in to create a profile.", "error");
        return;
      }

      const userId = user.id;
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
      const successMessageEl = document.getElementById("success-message");
      if (successMessageEl) {
        successMessageEl.classList.remove("hidden");
        successMessageEl.style.display = "block";
      }
      updateProgress();
    } catch (err) {
      console.error("Unexpected error:", err);
      showNotification("Unexpected error saving profile.", "error");
    }
  });

  updateProgress();
}
