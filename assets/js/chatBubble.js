// src/chatBubble.js

export function setupChatBubble() {
  // 1. Create Crate container
const crateScript = document.createElement('script');
crateScript.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/html-embed';
crateScript.async = true;
crateScript.defer = true;
crateScript.onload = () => {
  window.CrateInstance = new window.WidgetBot.Crate({
    server: '1365587542975713320',  // Charleston Hacks Server
    channel: '1365587543696867384' // #general
  });
};
document.body.appendChild(crateScript);

  // 2. Create the chat bubble
  const discordBubble = document.createElement('div');
  discordBubble.id = 'discord-bubble';
  discordBubble.innerHTML = '💬';
  document.body.appendChild(discordBubble);

  // 3. Load last position from localStorage (if available)
  const savedPosition = JSON.parse(localStorage.getItem('discordBubblePos'));
  if (savedPosition) {
    discordBubble.style.left = savedPosition.left;
    discordBubble.style.top = savedPosition.top;
  }

  // 4. Make the bubble draggable (mouse + touch)
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
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    discordBubble.style.left = `${x}px`;
    discordBubble.style.top = `${y}px`;
  };

  const endDrag = () => {
    dragging = false;
    localStorage.setItem('discordBubblePos', JSON.stringify({
      left: discordBubble.style.left,
      top: discordBubble.style.top
    }));
  };

  // Mouse
  discordBubble.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);

  // Touch
  discordBubble.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    startDrag({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const touch = e.touches[0];
    drag({ clientX: touch.clientX, clientY: touch.clientY });
  }, { passive: false });

  document.addEventListener('touchend', endDrag);

  // 5. Toggle Crate on click
  discordBubble.addEventListener('click', () => {
    if (window.CrateInstance) {
      window.CrateInstance.toggle();
    }
  });

  // 6. Add styles
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
  `;
  document.head.appendChild(style);
}
