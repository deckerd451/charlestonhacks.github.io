// /assets/js/profile.js
import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './globals.js';

const form = document.getElementById('skills-form');
const successMsg = document.getElementById('success-message');
const errorMsg = document.getElementById('error-message');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  successMsg.style.display = "none";
  errorMsg.style.display = "none";

  try {
    // ✅ Ensure user is logged in with Magic Link
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showNotification("Please log in with the magic link before creating your profile.", "error");
      errorMsg.textContent = "You must be logged in.";
      errorMsg.style.display = "block";
      return;
    }

    const user = session.user;

    // Collect form values
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const skills = document.getElementById('skills-input').value.trim();
    const bio = document.getElementById('bio-input').value.trim();
    const availability = document.getElementById('availability-input').value;
    const newsletter = document.getElementById('newsletter-opt-in').checked;

    // Handle photo upload if provided
    const photoFile = document.getElementById('photo-input').files[0];
    let photoUrl = null;
    if (photoFile) {
      const filePath = `profiles/${user.id}/${photoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      photoUrl = publicUrl.publicUrl;
    }

    // Save to community table
    const { error } = await supabase
      .from('community')
      .upsert({
        id: user.id,
        name: `${firstName} ${lastName}`,
        email,
        skills,
        bio,
        availability,
        image_url: photoUrl,
        newsletter_opt_in: newsletter
      });

    if (error) throw error;

    successMsg.textContent = "Profile created successfully!";
    successMsg.style.display = "block";
    form.reset(); // clear the form
  } catch (err) {
    console.error("[Profile] Error:", err.message);
    errorMsg.textContent = "There was a problem saving your profile.";
    errorMsg.style.display = "block";
  }
});
