// src/profileForm.js

import { showNotification } from './notifications.js';
import { fetchUniqueSkills } from './skills.js';
import { loadLeaderboard } from './leaderboard.js';
import { supabaseClient, SUPABASE_URL } from './supabaseClient.js';
import { DOMElements, appState } from './state.js';
import { updateProfileProgress } from './profileProgress.js';

export async function handleProfileSubmit(e) {
  e.preventDefault();

  const firstName = DOMElements.firstNameInput.value.trim();
  const lastName = DOMElements.lastNameInput.value.trim();
  const email = DOMElements.emailInput.value.trim();
  const rawSkills = DOMElements.skillsInput.value.trim().replace(/,\s*$/, '');
  const skillsArr = rawSkills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const profs = skillsArr.map(skill => appState.skillProficiencies[skill] || "Intermediate");
  const skillsWithProfs = skillsArr.map((skill, i) => `${skill}(${profs[i]})`).join(',');
  const bio = DOMElements.bioInput.value.trim();
  const availability = DOMElements.availabilityInput.value;
  const photoFile = DOMElements.photoInput.files[0];

  if (!photoFile) {
    showNotification("Please select a profile image.", 'error');
    return;
  }

  if (!firstName || !lastName || !email || !skillsArr.length) {
    showNotification("Please fill in all required fields (First Name, Last Name, Email, Skills).", 'error');
    return;
  }
  if (!isValidEmail(email)) {
    showNotification("Please enter a valid email address.", 'error');
    return;
  }

  try {
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${firstName.toLowerCase()}-${lastName.toLowerCase()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('hacksbucket').upload(fileName, photoFile);
    if (uploadError) throw new Error('Failed to upload image. Please try again.');

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/hacksbucket/${fileName}`;

    const { error: insertError } = await supabaseClient.from('skills').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      skills: skillsWithProfs,
      image_url: imageUrl,
      Bio: bio,
      Availability: availability,
      endorsements: "{}",
      created_at: new Date().toISOString()
    });

    if (insertError?.code === '23505') {
      throw new Error('This email is already registered. Please use a different email.');
    } else if (insertError) {
      throw new Error('Failed to register profile. Please try again later.');
    }

    showNotification('Registration successful!', 'success');
    DOMElements.skillsForm.reset();
    DOMElements.previewImage.style.display = 'none';
    DOMElements.previewImage.src = '#';
    appState.skillProficiencies = {};
    DOMElements.skillsProficiencyContainer.innerHTML = '';
    updateProfileProgress();
    await fetchUniqueSkills();
    loadLeaderboard();
  } catch (error) {
    showNotification(`Error: ${error.message}`, 'error');
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
