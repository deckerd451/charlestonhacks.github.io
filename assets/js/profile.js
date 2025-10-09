// ===============================
// UPDATED FILE: assets/js/profile.js
// ===============================
// Handles profile creation, update, and photo uploads.
// Compatible with Supabase 'hacksbucket' public bucket.
//
// Depends on: supabaseClient.js, utils.js (showNotification)
// ===============================

import { supabaseClient as supabase } from './supabaseClient.js';
import { showNotification } from './utils.js';

const bucketName = 'hacksbucket';

export function initProfileForm() {
  const form = document.getElementById('skills-form');
  if (!form) return;

  // Autofill profile data on load
  autoFillProfileForm();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        showNotification('You must be logged in to update your profile.', 'error');
        return;
      }

      showNotification('Saving profile…', 'info');

      // Collect form data
      const first = document.getElementById('first-name').value.trim();
      const last = document.getElementById('last-name').value.trim();
      const skills = document.getElementById('skills-input').value.trim();
      const bio = document.getElementById('bio-input').value.trim();
      const newsletter = document.getElementById('newsletter-opt-in').checked;
      const file = document.getElementById('photo-input').files[0];

      let image_url = '';

      // Upload photo if provided
      if (file) {
        const fileName = `${user.id}_${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file);

        if (uploadErr) {
          console.error('[Profile] Image upload failed:', uploadErr.message);
          showNotification('Image upload failed. Check bucket permissions.', 'error');
        } else {
          const { data: publicData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);
          image_url = publicData.publicUrl;
        }
      }

      // Save or update profile record
      const { error: upsertError } = await supabase
        .from('community')
        .upsert({
          id: user.id,
          name: `${first} ${last}`,
          email: user.email,
          skills,
          bio,
          image_url,
          newsletter,
        });

      if (upsertError) {
        console.error('[Profile] Upsert error:', upsertError);
        showNotification('Error saving profile. Try again.', 'error');
      } else {
        showNotification('Profile saved successfully!', 'success');
      }
    } catch (err) {
      console.error('Profile save failed:', err);
      showNotification('Unexpected error while saving profile.', 'error');
    }
  });

  // Preview uploaded photo
  const fileInput = document.getElementById('photo-input');
  const previewImg = document.getElementById('preview');
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
      previewImg.classList.add('hidden');
      previewImg.src = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      previewImg.src = event.target.result;
      previewImg.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });
}

// ===============================
// Helper: Prefill profile form
// ===============================
async function autoFillProfileForm() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('community')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[Profile] Prefill skipped (no record yet):', error.message);
      return;
    }

    if (data) {
      document.getElementById('first-name').value = data.name?.split(' ')[0] || '';
      document.getElementById('last-name').value = data.name?.split(' ')[1] || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('skills-input').value = data.skills || '';
      document.getElementById('bio-input').value = data.bio || '';
      document.getElementById('newsletter-opt-in').checked = data.newsletter || false;

      if (data.image_url) {
        const img = document.getElementById('preview');
        img.src = data.image_url;
        img.classList.remove('hidden');
      }

      console.log('[Profile] Prefilled form with:', data);
    }
  } catch (err) {
    console.error('[Profile] Prefill error:', err);
  }
}
