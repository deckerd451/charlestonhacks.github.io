// /assets/js/profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

export async function handleProfileFormSubmit(event) {
  event.preventDefault();

  // 🔑 Ensure logged in via magic link
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    showNotification("Please log in first (magic link required).", "error");
    return;
  }

  const userId = user.id;

  // 📥 Gather form data
  const fname = document.getElementById("first-name").value.trim();
  const lname = document.getElementById("last-name").value.trim();
  const email = document.getElementById("email").value.trim();
  const skills = document.getElementById("skills-input").value.split(",").map(s => s.trim());
  const bio = document.getElementById("bio-input").value.trim();
  const availability = document.getElementById("availability-input").value;

  // 📸 Handle photo upload (optional)
  let photoUrl = null;
  const fileInput = document.getElementById("photo-input");
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}.${fileExt}`;
    const filePath = `profile-photos/${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      showNotification("Photo upload failed.", "error");
    } else {
      // Public URL
      const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
      photoUrl = data.publicUrl;
    }
  }

  // 📝 Upsert into community
  const { error: upsertError } = await supabase
    .from('community')
    .upsert({
      user_id: userId,
      name: `${fname} ${lname}`,
      email,
      skills,
      bio,
      availability,
      image_url: photoUrl,
    }, { onConflict: 'user_id' });

  if (upsertError) {
    showNotification("Failed to save profile: " + upsertError.message, "error");
    return;
  }

  showNotification("Profile saved successfully!", "success");

  // 📧 Newsletter opt-in (Mailchimp) if checkbox is ticked
  const newsletterOptIn = document.getElementById("newsletter-opt-in").checked;
  if (newsletterOptIn) {
    const mailchimpForm = document.createElement("form");
    mailchimpForm.action = "https://charlestonhacks.us12.list-manage.com/subscribe/post?u=79363b7a43970f760d61360fd&id=3b95e0177a";
    mailchimpForm.method = "POST";
    mailchimpForm.target = "_blank";
    mailchimpForm.innerHTML = `
      <input type="hidden" name="FNAME" value="${fname}">
      <input type="hidden" name="LNAME" value="${lname}">
      <input type="hidden" name="EMAIL" value="${email}">
    `;
    document.body.appendChild(mailchimpForm);
    mailchimpForm.submit();
    document.body.removeChild(mailchimpForm);
  }
}

// 🔗 Attach handler on DOM load
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("skills-form");
  if (form) {
    form.addEventListener("submit", handleProfileFormSubmit);
  }
});
