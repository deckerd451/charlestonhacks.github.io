// /assets/js/globals.js
// Backward-compatible globals + ES module exports

// Reuse existing window-level objects if present, otherwise create them.
export const appState = (globalThis.appState && typeof globalThis.appState === 'object')
  ? globalThis.appState
  : (globalThis.appState = { 
      session: null,
      // add feature flags safely if not present
      features: {
        connectionEngine: false,
        eventMode: false,
        aiGlia: false
      }
    });

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

// -------------------
// NEW: Event bus utils
// -------------------
export const Events = globalThis.Events || new EventTarget();
globalThis.Events = Events;

export function emit(name, detail = {}) {
  Events.dispatchEvent(new CustomEvent(name, { detail }));
}
export function on(name, cb) {
  Events.addEventListener(name, (e) => cb(e.detail));
}

// Quick debug check
on("debug:pong", (d) => console.log("[globals] got pong:", d));
