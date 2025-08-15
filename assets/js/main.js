// /assets/js/main.js
import { initAuth } from './auth/dexAuth.js';
import { startRouter } from './ui/router.js';

// Ensure globals.js is parsed (it sets appState, DOMElements, showNotification)
import './globals.js';

(async function boot() {
  await initAuth(); // sets appState.session first
  startRouter();    // then render the right page
})();
