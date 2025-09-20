export function startCountdown(elementId, eventDateStr) {
  const countdownEl = document.getElementById(elementId);
  if (!countdownEl) return;

  function updateCountdown() {
    const eventDate = new Date(eventDateStr);
    const now = new Date();
    let diff = Math.max(0, eventDate - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const pad = n => n.toString().padStart(2, '0');

    countdownEl.innerHTML = `
      <span><b>HH:</b></span>
      <span>${days}<small>d</small></span>
      <span>${pad(hours)}<small>h</small></span>
      <span>${pad(minutes)}<small>m</small></span>
      <span>${pad(seconds)}<small>s</small></span>
    `;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}
