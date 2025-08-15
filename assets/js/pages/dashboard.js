// /assets/js/pages/dashboard.js
import { el } from '../ui/dom.js';
import { appState } from '../globals.js';

// If you already have it, import your renderer and mount it below:
import { renderCards } from '../ui/cardRenderer.js'; // ← keep your existing implementation

export function dashboardPage() {
  const loggedIn = !!appState.session?.user;

  const container = el('section', { class: 'p-4', id: 'dashboard' },
    el('nav', { class: 'tabs', style: 'margin-bottom:1rem;' },
      el('a', { href: '#/dashboard' }, 'Dashboard'), ' | ',
      el('a', { href: '#/onboarding' }, 'Onboarding')
    ),
    el('h2', {}, 'Innovation Engine'),
    el('div', { id: 'cards' }, loggedIn ? 'Loading…' : 'Log in to see content.')
  );

  queueMicrotask(() => {
    if (!loggedIn) return;
    const mount = container.querySelector('#cards');
    // Hand off to your existing code to render tabs/cards/profile UI
    try {
      renderCards(mount); // your function should accept a mount element
    } catch (e) {
      console.error('[DEX] renderCards failed:', e);
      mount.textContent = 'There was a problem rendering your cards.';
    }
  });

  return container;
}
