export function setupChatBubble() {
  if (document.getElementById('discord-bubble')) return;

  // Load WidgetBot Crate v3
  const crateScript = document.createElement('script');
  crateScript.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/crate@3';
  crateScript.async = true;
  crateScript.defer = true;
  crateScript.onload = () => {
    window.CrateInstance = new window.Crate({
  server: '1365587542975713320',
  channel: '1365587543696867384'
});
 };
  crateScript.onerror = () => console.error('WidgetBot Crate failed to load.');
  document.body.appendChild(crateScript);

  // Create draggable bubble
  const discordBubble = document.createElement('div');
  discordBubble.id = 'discord-bubble';
  discordBubble.innerHTML = '💬';
  document.body.appendChild(discordBubble);

  // Restore position
  const saved = JSON.parse(localStorage.getItem('discordBubblePos'));
  if (saved) {
    discordBubble.style.left = saved.left;
    discordBubble.style.top = saved.top;
  }

  // Drag handlers
  let offsetX, offsetY, dragging = false;
  const startDrag = (e) => {
    dragging = true;
    const rect = discordBubble.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  };
  const drag = (e) => {
    if (!dragging) return;
    e.preventDefault();
    discordBubble.style.left = `${e.clientX - offsetX}px`;
    discordBubble.style.top = `${e.clientY - offsetY}px`;
  };
  const endDrag = () => {
    dragging = false;
    localStorage.setItem('discordBubblePos', JSON.stringify({
      left: discordBubble.style.left,
      top: discordBubble.style.top
    }));
  };

  // Mouse events
  discordBubble.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);

  // Touch events
  discordBubble.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startDrag({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    drag({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });
  document.addEventListener('touchend', endDrag);

  // Toggle chat
  discordBubble.addEventListener('click', () => {
    if (window.CrateInstance) {
      window.CrateInstance.toggle();
    }
  });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    #discord-bubble {
      position: fixed;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background-color: #5865F2;
      color: white;
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    #discord-bubble:active {
      cursor: grabbing;
    }
    iframe[src*="widgetbot.io"] {
      pointer-events: none !important;
      opacity: 0 !important;
    }
    iframe[src*="widgetbot.io"].visible {
      pointer-events: auto !important;
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}
