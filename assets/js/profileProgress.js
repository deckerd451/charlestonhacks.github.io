// profileProgress.js
import { DOMElements } from './globals.js';

export function updateProfileProgress() {
  const fields = [
    DOMElements.firstNameInput.value.trim(),
    DOMElements.lastNameInput.value.trim(),
    DOMElements.emailInput.value.trim(),
    DOMElements.skillsInput.value.trim(),
    DOMElements.photoInput.value,
    DOMElements.availabilityInput.value,
  ];
  const filled = fields.filter(Boolean).length;
  const percent = Math.floor((filled / fields.length) * 100);
  DOMElements.profileBarInner.style.width = \`\${percent}%\`;
  DOMElements.profileProgressMsg.textContent = percent === 100 ? "Profile Complete!" : "Profile Incomplete";
  DOMElements.profileProgressMsg.className = percent === 100 ? "profile-complete" : "profile-incomplete";
}
