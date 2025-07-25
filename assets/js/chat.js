// src/chat.js

export function initializeDiscordBubble() {
  const crateScript = document.createElement('script');
  crateScript.src = 'https://cdn.jsdelivr.net/npm/@widgetbot/crate@3';
  crateScript.async = true;
  crateScript.defer = true;
  crateScript.onload = () => {
    window.CrateInstance = new Crate({
      server: '1365587542975713320',
      channel: '1365587543696867384'
    });
  };
  document.body.appendChild(crateScript);

  const bubble = document.createElement('div');
  bubble.id = 'discord-bubble';
  bubble.innerHTML = '💬';
  document.body.appendChild(bubble);

  const saved = JSON.parse(localStorage.getItem('discordBubblePos'));
  if (saved) {
    bubble.style.left = saved.left;
    bubble.style.top = saved.top;
  }

  let offsetX, offsetY, dragging = false;
  const start = (e) => {
    dragging = true;
    const rect = bubble.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  };
  const move = (e) => {
    if (!dragging) return;
    e.preventDefault();
    bubble.style.left = `${e.clientX - offsetX}px`;
    bubble.style.top = `${e.clientY - offsetY}px`;
  };
  const end = () => {
    dragging = false;
    localStorage.setItem('discordBubblePos', JSON.stringify({
      left: bubble.style.left,
      top: bubble.style.top
    }));
  };

  bubble.addEventListener('mousedown', start);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', end);

  bubble.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    start({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    move({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: false });
  document.addEventListener('touchend', end);

  bubble.addEventListener('click', () => {
    if (window.CrateInstance) {
      window.CrateInstance.toggle();
    }
  });

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

