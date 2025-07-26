export function setupChatBubble() {
  if (window.CH_BUBBLE_INITIALIZED) return;
  window.CH_BUBBLE_INITIALIZED = true;

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

  // Create the bubble
  const discordBubble = document.createElement('div');
  discordBubble.id = 'discord-bubble';
  discordBubble.innerHTML = '💬';
  discordBubble.style.position = 'fixed';
  discordBubble.style.width = '54px';
  discordBubble.style.height = '54px';
  discordBubble.style.borderRadius = '50%';
  discordBubble.style.backgroundColor = '#5865F2';
  discordBubble.style.color = 'white';
  discordBubble.style.fontSize = '26px';
  discordBubble.style.display = 'flex';
  discordBubble.style.alignItems = 'center';
  discordBubble.style.justifyContent = 'center';
  discordBubble.style.zIndex = '10000';
  discordBubble.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  discordBubble.style.cursor = 'grab';
  discordBubble.style.userSelect = 'none';
  discordBubble.style.touchAction = 'none';

  // Position: Center by default or use saved position
  const saved = JSON.parse(localStorage.getItem('discordBubblePos'));
  if (saved && saved.left && saved.top) {
    discordBubble.style.left = saved.left;
    discordBubble.style.top = saved.top;
    discordBubble.style.transform = 'none';
  } else {
    discordBubble.style.left = '50%';
    discordBubble.style.top = '50%';
    discordBubble.style.transform = 'translate(-50%, -50%)';
  }

  document.body.appendChild(discordBubble);

  // Drag logic
  let offsetX, offsetY, dragging = false;

  const startDrag = (e) => {
    dragging = true;
    const rect = discordBubble.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    discordBubble.style.transform = 'none'; // remove centering once dragged
  };

  const drag = (e) => {
    if (!dragging) return;
    e.preventDefault();
    discordBubble.style.left = `${e.clientX - offsetX}px`;
    discordBubble.style.top = `${e.clientY - offsetY}px`;
  };

  const endDrag = () => {
    if (!dragging) return;
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

  // Toggle chat panel
  discordBubble.addEventListener('click', () => {
    if (window.CrateInstance) {
      window.CrateInstance.toggle();
    }
  });

  // Minimal styles for iframe toggle
  const style = document.createElement('style');
  style.textContent = `
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
