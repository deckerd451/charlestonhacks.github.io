// /assets/js/globals.js
// Backward-compatible globals + ES module exports

// Reuse existing window-level objects if present, otherwise create them.
export const appState = (globalThis.appState && typeof globalThis.appState === 'object')
  ? globalThis.appState
  : (globalThis.appState = { session: null });

// Keep DOMElements if you already rely on it elsewhere.
export const DOMElements = (globalThis.DOMElements && typeof globalThis.DOMElements === 'object')
  ? globalThis.DOMElements
  : (globalThis.DOMElements = {});

// Minimal notification; replace with your toast/snackbar later.
// Also mirror to window for any legacy code that calls window.showNotification.
export function showNotification(msg) {
  try {
    // If you have a custom UI notifier, call it here:
    // return YourToast.show(msg);
    console.log('[DEX]', msg);
  } catch (e) {
    console.log('[DEX]', msg);
  }
}
globalThis.showNotification = showNotification;

// Optional: tiny helper to register frequently-used DOM nodes (legacy support)
export function registerDomElement(key, el) {
  DOMElements[key] = el;
  return el;
}
globalThis.registerDomElement = registerDomElement;
