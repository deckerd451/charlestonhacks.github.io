// utils.js

/**
 * Show a temporary notification message
 * @param {string} message - The text to display
 * @param {"success"|"error"|"info"} type - Type of notification
 */
export function showNotification(message, type = "info") {
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.textContent = message;

  document.body.appendChild(notif);

  setTimeout(() => {
    notif.remove();
  }, 4000);
}

/**
 * Validate an email address format
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Helper: clear all children from an element
 */
export function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}
