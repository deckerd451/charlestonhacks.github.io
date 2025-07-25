// src/profile.js

import { DOMElements, appState, supabaseClient } from './state.js';
import { showNotification, updateProfileProgress } from './utils.js';
import { fetchUniqueSkills, loadLeaderboard } from './data.js';

export function handleSkillsInput() {
  const skills = this.value.split(',').map(s => s.trim()).filter(Boolean);
  DOMElements.skillsProficiencyContainer.innerHTML = '';

  skills.forEach(skill => {
    if (!skill) return;
    if (!(skill in appState.skillProficiencies)) {
      appState.skillProficiencies[skill] = "Intermediate";
    }
    DOMElements.skillsProficiencyContainer.insertAdjacentHTML('beforeend', `
      <div style="margin-bottom: 7px;">
        <span style="color:var(--primary-color);">${skill}</span>
        <select class="proficiency-select" data-skill="${skill}" aria-label="Proficiency for ${skill}">
          <option value="Beginner" ${appState.skillProficiencies[skill] === "Beginner" ? "selected" : ""}>Beginner</option>
          <option value="Intermediate" ${appState.skillProficiencies[skill] === "Intermediate" ? "selected" : ""}>Intermediate</option>
          <option value="Expert" ${appState.skillProficiencies[skill] === "Expert" ? "selected" : ""}>Expert</option>
        </select>
      </div>
    `);
  });

  DOMElements.skillsProficiencyContainer.querySelectorAll('.proficiency-select').forEach(sel => {
    sel.addEventListener('change', function() {
      appState.skillProficiencies[this.dataset.skill] = this.value;
    });
  });
}

export function handlePhotoInputChange() {
  const file = this.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = e => {
      DOMElements.previewImage.src = e.target.result;
      DOMElements.previewImage.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    DOMElements.previewImage.style.display = 'none';
    DOMElements.previewImage.src = '#';
  }
}

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
    showNotification("Please fill in all required fields.", 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showNotification("Please enter a valid email address.", 'error');
    return;
  }

  try {
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${Date.now()}-${firstName.toLowerCase()}-${lastName.toLowerCase()}.${fileExt}`;
    const { error: uploadError } = await supabaseClient.storage.from('hacksbucket').upload(fileName, photoFile);

    if (uploadError) throw new Error('Failed to upload image.');

    const imageUrl = `${supabaseClient.storageUrl}/object/public/hacksbucket/${fileName}`;

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

    if (insertError) {
      if (insertError.code === '23505') throw new Error('This email is already registered.');
      throw new Error('Failed to register profile.');
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
