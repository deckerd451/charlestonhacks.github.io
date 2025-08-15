// /assets/js/pages/onboarding.js
import { el } from '../ui/dom.js';
import { appState, showNotification } from '../globals.js';
import { upsertProfile, getMyProfile } from '../api/profiles.js';

export function onboardingPage() {
  const user = appState.session?.user;
  if (!user) return el('div', { class: 'p-4' }, 'Please log in to continue.');

  const container = el('section', { class: 'p-4', id: 'onboarding' },
    el('h2', {}, 'Create your profile'),
    el('form', { id: 'onboardForm', class: 'stack' },
      el('label', {}, 'Name', el('input', { name: 'name', required: true })),
      el('label', {}, 'Role', el('input', { name: 'role' })),
      el('label', {}, 'Interests (comma‑separated)', el('input', { name: 'interests' })),
      el('button', { type: 'submit' }, 'Save')
    )
  );

  // Load existing profile values
  queueMicrotask(async () => {
    try {
      const prof = await getMyProfile(user.id);
      if (prof) {
        const f = container.querySelector('#onboardForm');
        f.name.value = prof.name ?? '';
        f.role.value = prof.role ?? '';
        f.interests.value = Array.isArray(prof.interests) ? prof.interests.join(', ') : (prof.interests ?? '');
      }
    } catch (e) {
      console.warn('[DEX] load profile:', e);
    }
  });

  container.querySelector('#onboardForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await upsertProfile({
        id: user.id,
        name: (fd.get('name') || '').toString().trim(),
        role: (fd.get('role') || '').toString().trim(),
        interests: (fd.get('interests') || '').toString().split(',').map(s => s.trim()).filter(Boolean)
      });
      showNotification?.('Profile saved');
      location.hash = '/dashboard';
    } catch (err) {
      console.error(err);
      showNotification?.('Error saving profile');
    }
  });

  return container;
}
