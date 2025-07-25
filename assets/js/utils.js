// utils.js
import { DOMElements } from './globals.js';

export function showNotification(message, type = 'info') {
  const notification = document.getElementById('achievements');
  notification.textContent = message;
  notification.className = \`achievements \${type}\`;
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
    notification.className = 'achievements';
  }, 5000);
}

export function renderUserCards(users, container) {
  container.innerHTML = users.map(user => \`
    <div class="team-member-card">
      <div class="member-name">\${user.first_name} \${user.last_name}</div>
      <div class="member-email">\${user.email}</div>
    </div>
  \`).join('');
}
