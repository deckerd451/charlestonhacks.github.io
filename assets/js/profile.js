// UPDATED FILE: assets/js/profile.js
// This version of profile.js uses maybeSingle() when loading an existing
// profile to avoid 406 errors and automatically pre-fills the profile form
// when data exists. It also keeps the newsletter opt-in logic intact.

import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

/**
 * Initialize profile form and saving logic. When the form is loaded it
 * pre-populates existing profile data if available. Using maybeSingle()
 * ensures that missing profiles do not trigger 406 errors.
 */
export function initProfileForm() {
  const form = document.getElementById('skills-form');
  if (!form) return;

  // Prefill the profile form on load
  autoFillProfileForm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      // 🔑 Get logged in user from magic link
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification('You must be logged in to create a profile.', 'error');
        return;
      }

      const userId = user.id; // This matches community.user_id
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

      // Fetch existing profile first (so we can preserve old image_url if needed)
      let existingImageUrl = null;
      try {
        const { data: existingProfile, error: existingError, status } = await supabase
          .from('community')
          .select('image_url')
          .eq('user_id', userId)
          .maybeSingle();

        if (existingError && status !== 406) {
          console.warn('[Profile] existing profile error:', existingError.message);
        }
        if (existingProfile && existingProfile.image_url) {
          existingImageUrl = existingProfile.image_url;
          console.log('[Profile] Existing profile found, updating record.');
        } else {
          console.log('[Profile] No existing profile found, creating new record.');
        }
      } catch (err) {
        console.warn('[Profile] Unexpected error loading profile:', err);
      }

      // Optional: handle image upload
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

          // Delete old image if replaced
          if (existingImageUrl && existingImageUrl.includes('/avatars/')) {
            try {
              const pathParts = existingImageUrl.split('/avatars/');
              if (pathParts.length > 1) {
                const oldPath = decodeURIComponent(pathParts[1]);
                const { error: deleteError } = await supabase.storage
                  .from('avatars')
                  .remove([oldPath]);
                if (deleteError) {
                  console.warn('[Profile] Failed to delete old image:', deleteError.message);
                }
              }
            } catch (deleteErr) {
              console.warn('[Profile] Unexpected error deleting old image:', deleteErr);
            }
          }
        }
      }

      // Insert or update profile in community table
      const { error: upsertError } = await supabase
        .from('community')
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
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.error('[Profile] Supabase error:', upsertError.message);
        showNotification('Error saving profile.', 'error');
        return;
      }

      // ✅ If opted-in, send to Mailchimp
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

      showNotification('Profile saved successfully!', 'success');

      // Show success message
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
 * Auto-fill the profile form with existing data if a profile exists.
 *
 * Exported so other modules (e.g. main.js) can trigger a refill after
 * authentication events. When called, it attempts to fetch the current
 * user's profile from the community table and populate the form. If no
 * profile exists (status 406), the form remains blank and a console
 * message is printed.
 */
export async function autoFillProfileForm() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;

    const userId = user.id;

    // Attempt to fetch by user_id first
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

    // If nothing found by user_id and an email is available, fall back to email lookup
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

    // Handle unexpected errors
    if (profileError && status !== 406) {
      console.warn('[Profile] Prefill error:', profileError.message);
      return;
    }
    if (!profile) {
      console.log('[Profile] No existing data to prefill.');
      return;
    }

    console.log('[Profile] Prefilling form with existing data:', profile);

    // Split name into first and last components
    const [firstName, ...rest] = (profile.name || '').split(' ');
    document.getElementById('first-name').value = firstName || '';
    document.getElementById('last-name').value = rest.join(' ') || '';
    document.getElementById('email').value = profile.email || '';
    document.getElementById('skills-input').value = (profile.skills || []).join(', ');
    document.getElementById('bio-input').value = profile.bio || '';
    document.getElementById('availability-input').value = profile.availability || '';

    // Optional: preview avatar
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
// Automatically trigger autoFillProfileForm when a user logs in.  Without
// this listener, the prefill only runs once on initial page load, which can
// occur before the session has been restored. Listening for auth state
// changes ensures that any logged-in user will see their saved profile
// populated immediately after sign-in.
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    autoFillProfileForm();
  }
});

/**
 * Render skills as neat tags (instead of comma string)
 * @param {string[]|string} skills
 * @returns {string} HTML markup for skill tags
 */
export function renderSkills(skills) {
  if (!skills) return '';
  const list = Array.isArray(skills)
    ? skills
    : String(skills).split(',').map(s => s.trim()).filter(Boolean);

  if (list.length === 0) {
    return `<span class="skill-tag">No skills listed</span>`;
  }

  return list
    .map(skill => `<span class="skill-tag">${skill}</span>`)
    .join(' ');
}