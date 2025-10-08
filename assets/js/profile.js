// UPDATED FILE: assets/js/profile.js
// This version of profile.js prevents duplicate submit listeners, uses maybeSingle()
// to avoid 406 errors, and pre-fills the profile form automatically when data exists.
// Newsletter opt-in logic and image upload handling remain intact.

import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

/**
 * Initialize profile form and saving logic.
 * This function is idempotent — it will only attach one listener per session.
 */
export function initProfileForm() {
  const form = document.getElementById('skills-form');
  if (!form) return;

  // 🧠 Prevent duplicate event listeners
  if (form.dataset.listenerAdded === 'true') {
    console.log('[Profile] Listener already attached, skipping rebind.');
    return;
  }
  form.dataset.listenerAdded = 'true';

  // Prefill the profile form on load
  autoFillProfileForm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      // 🔑 Get logged-in user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification('You must be logged in to create a profile.', 'error');
        return;
      }

      const userId = user.id;
      const fname = document.getElementById('first-name').value.trim();
      const lname = document.getElementById('last-name').value.trim();
      const email = document.getElementById('email').value.trim();
      const skills = document.getElementById('skills-input').value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const bio = document.getElementById('bio-input').value.trim();
      const availability = document.getElementById('availability-input').value;
      const newsletterOptIn = document.getElementById('newsletter-opt-in')?.checked || false;

      // 🔍 Check for existing profile
      let existingProfileRecord = null;
      let existingImageUrl = null;
      try {
        const resp = await supabase
          .from('community')
          .select('id, image_url, user_id, email')
          .eq('user_id', userId)
          .maybeSingle();

        if (resp.data) existingProfileRecord = resp.data;
        else if (email) {
          const respEmail = await supabase
            .from('community')
            .select('id, image_url, user_id, email')
            .eq('email', email)
            .maybeSingle();
          if (respEmail.data) existingProfileRecord = respEmail.data;
        }
      } catch (err) {
        console.warn('[Profile] Unexpected error loading profile:', err);
      }

      if (existingProfileRecord && existingProfileRecord.image_url) {
        existingImageUrl = existingProfileRecord.image_url;
        console.log('[Profile] Updating existing record.');
      } else {
        console.log('[Profile] Creating new profile record.');
      }

      // 🖼️ Optional: handle image upload
      let imageUrl = existingImageUrl;
      const photoInput = document.getElementById('photo-input');
      if (photoInput && photoInput.files.length > 0) {
        const photoFile = photoInput.files[0];
        const filePath = `profiles/${userId}/${Date.now()}-${photoFile.name}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, photoFile, { upsert: true });

        if (uploadError) {
          console.error('[Profile] Image upload failed:', uploadError.message);
          showNotification('Photo upload failed. Keeping your existing photo.', 'warning');
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          imageUrl = publicUrlData.publicUrl;

          // Remove old image if replaced
          if (existingImageUrl && existingImageUrl.includes('/avatars/')) {
            try {
              const oldPath = decodeURIComponent(existingImageUrl.split('/avatars/')[1]);
              const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([oldPath]);
              if (deleteError) console.warn('[Profile] Failed to delete old image:', deleteError.message);
            } catch (deleteErr) {
              console.warn('[Profile] Unexpected error deleting old image:', deleteErr);
            }
          }
        }
      }

      // 🧱 Build record payload
      const recordData = {
        user_id: userId,
        name: `${fname} ${lname}`,
        email,
        skills,
        bio,
        availability,
        image_url: imageUrl,
        newsletter_opt_in: newsletterOptIn,
        newsletter_opt_in_at: newsletterOptIn ? new Date().toISOString() : null,
      };

      // 📝 Save to Supabase
      let saveError = null;
      try {
        if (existingProfileRecord) {
          const { error: updateError } = await supabase
            .from('community')
            .update(recordData)
            .eq('id', existingProfileRecord.id);
          saveError = updateError;
        } else {
          const { error: insertError } = await supabase
            .from('community')
            .insert(recordData);
          saveError = insertError;
        }
      } catch (err) {
        console.error('[Profile] Unexpected error during save:', err);
        saveError = err;
      }

      if (saveError) {
        console.error('[Profile] Supabase error:', saveError.message || saveError);
        showNotification('Error saving profile.', 'error');
        return;
      }

      // 📬 Optional: Mailchimp subscription
      if (newsletterOptIn) {
        const mcForm = document.createElement('form');
        mcForm.action =
          'https://charlestonhacks.us12.list-manage.com/subscribe/post?u=79363b7a43970f760d61360fd&id=3b95e0177a';
        mcForm.method = 'POST';
        mcForm.target = '_blank';
        mcForm.innerHTML = `
          <input type="hidden" name="FNAME" value="${fname}">
          <input type="hidden" name="LNAME" value="${lname}">
          <input type="hidden" name="EMAIL" value="${email}">
        `;
        document.body.appendChild(mcForm);
        mcForm.submit();
        document.body.removeChild(mcForm);
      }

      // ✅ Success feedback
      showNotification('Profile saved successfully!', 'success');
      const successMessageEl = document.getElementById('success-message');
      if (successMessageEl) {
        successMessageEl.classList.remove('hidden');
        successMessageEl.style.display = 'block';
      }

    } catch (err) {
      console.error('[Profile] Unexpected error:', err);
      showNotification('Unexpected error saving profile.', 'error');
    }
  });
}

/**
 * Auto-fill the profile form with existing data if available.
 */
export async function autoFillProfileForm() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const userId = user.id;
    let profile = null;
    let profileError = null;
    let status = null;

    try {
      const resp = await supabase
        .from('community')
        .select('name, email, skills, bio, availability, image_url')
        .eq('user_id', userId)
        .maybeSingle();
      profile = resp.data;
      profileError = resp.error;
      status = resp.status;
    } catch (err) {
      console.warn('[Profile] Prefill error (by user_id):', err);
    }

    if ((!profile || status === 406) && user.email) {
      try {
        const respEmail = await supabase
          .from('community')
          .select('name, email, skills, bio, availability, image_url')
          .eq('email', user.email)
          .maybeSingle();
        if (respEmail.data) {
          profile = respEmail.data;
          profileError = respEmail.error;
          status = respEmail.status;
        }
      } catch (err2) {
        console.warn('[Profile] Prefill error (by email):', err2);
      }
    }

    if (profileError && status !== 406) {
      console.warn('[Profile] Prefill error:', profileError.message);
      return;
    }
    if (!profile) {
      console.log('[Profile] No existing data to prefill.');
      return;
    }

    console.log('[Profile] Prefilling form with:', profile);
    const [firstName, ...rest] = (profile.name || '').split(' ');
    document.getElementById('first-name').value = firstName || '';
    document.getElementById('last-name').value = rest.join(' ') || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('skills-input').value = (profile.skills || []).join(', ');
    document.getElementById('bio-input').value = profile.bio || '';
    document.getElementById('availability-input').value = profile.availability || '';

    const photoPreview = document.getElementById('preview');
    if (photoPreview && profile.image_url) {
      photoPreview.src = profile.image_url;
      photoPreview.classList.remove('hidden');
    }
  } catch (err) {
    console.warn('[Profile] Error during prefill:', err);
  }
}

// -------------------------------------------------------------------------
// Auto-prefill when auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    autoFillProfileForm();
  }
});

/**
 * Render skills as tags
 */
export function renderSkills(skills) {
  if (!skills) return '';
  const list = Array.isArray(skills)
    ? skills
    : String(skills).split(',').map(s => s.trim()).filter(Boolean);

  if (list.length === 0) {
    return `<span class="skill-tag">No skills listed</span>`;
  }

  return list.map(skill => `<span class="skill-tag">${skill}</span>`).join(' ');
}
