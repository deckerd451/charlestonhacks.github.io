// scripts.js — Homepage-specific interactivity for CharlestonHacks

// =======================
// SPLASH SCREEN HANDLING
// =======================
(function initSplashScreen() {
  const splashOverlay = document.getElementById('splash-overlay');
  const skipBtn = document.getElementById('skip-splash-btn');
  const splashKey = 'chs_splash_seen_v2';

  function hideSplash(immediate = false) {
    splashOverlay.classList.add('fade-out');
    document.body.classList.remove('splash-active');
    setTimeout(() => { splashOverlay.style.display = 'none'; }, immediate ? 0 : 700);
  }

  function dismissSplash() {
    localStorage.setItem(splashKey, 'yes');
    hideSplash();
  }

  function maybeShowSplash() {
    if (localStorage.getItem(splashKey)) {
      hideSplash(true);
    } else {
      document.body.classList.add('splash-active');
      splashOverlay.style.display = 'flex';
      skipBtn.onclick = dismissSplash;
      skipBtn.onkeyup = e => { if (e.key === 'Enter' || e.key === ' ') dismissSplash(); };
      window.addEventListener('keydown', e => {
        if (splashOverlay.style.display !== 'none' && (e.key === 'Enter' || e.key === ' ')) {
          skipBtn.focus();
          dismissSplash();
        }
      });
      setTimeout(dismissSplash, 3000);
    }
  }

  window.addEventListener('DOMContentLoaded', maybeShowSplash);
})();

// =======================
// BTC PRICE FETCH
// =======================
function updateBTCPrice() {
  fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
    .then(res => res.json())
    .then(data => {
      const price = data.bitcoin.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      document.getElementById('btcPrice').textContent = `BTC: ${price}`;
    })
    .catch(() => {
      document.getElementById('btcPrice').textContent = 'BTC price unavailable';
    });
}

// =======================
// COUNTDOWN TIMER
// =======================
function updateCountdown() {
  const eventDate = new Date('2025-10-03T00:00:00-04:00');
  const now = new Date();
  let diff = Math.max(0, eventDate - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  const pad = n => n.toString().padStart(2, '0');

  document.getElementById('countdown').innerHTML = `
    <span><b>TBD:</b></span>
    <span>${days}<small>d</small></span>
    <span>${pad(hours)}<small>h</small></span>
    <span>${pad(minutes)}<small>m</small></span>
    <span>${pad(seconds)}<small>s</small></span>
  `;
}

// =======================
// CARD INTERACTIVITY
// =======================
const CONFIG = {
  cardImages: [
    'images/yellowscullcard.png', 'images/redscullcard.png', 'images/Descartes.png',
    'images/Alexandor.png', 'images/Medusa.png', 'images/Elara.png',
    'images/adventurercard.png', 'images/collaboratorcard.png', 'images/humanitariancard.png',
    'images/nextcard.png', 'images/Aegis.png', 'images/resilientcard.png',
    'images/Astrid.png', 'images/nicolecard.png'
  ],
  videos: [
    'images/Descartesvideo.mp4', 'images/medusa best.mp4', 'images/medusa 1.mp4',
    'images/young medusa.mp4', 'images/Alexandorvideo.mp4', 'images/Elaravideo.mp4',
    'images/elara rage.mp4', 'images/astridvideo.mp4', 'images/aegisvideo.mp4',
    'images/wolfvideo.mp4', 'images/merlin.mp4', 'images/hermesvideo.mp4',
    'images/Mystery.mp4'
  ],
  sounds: {
    cardflip: document.getElementById('cardflipSound'),
    chime: document.getElementById('chimeSound'),
    keys: document.getElementById('keysSound')
  }
};

function getRandomCardImage() {
  const arr = CONFIG.cardImages;
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomFlipClass() {
  return Math.random() > 0.5 ? 'flip-image-x' : 'flip-image-y';
}
function playSound(soundKey) {
  const audio = CONFIG.sounds[soundKey];
  if (audio) {
    audio.currentTime = 0;
    audio.volume = soundKey === 'cardflip' ? 0.45 : 0.7;
    audio.play().catch(() => {});
  }
}

// =======================
// DOM INTERACTIONS ON LOAD
// =======================
document.addEventListener('DOMContentLoaded', () => {
  updateBTCPrice();
  updateCountdown();
  setInterval(updateBTCPrice, 60000);
  setInterval(updateCountdown, 1000);

  const buttons = document.querySelectorAll('.clickable-area');
  const missionImage = document.getElementById('missionImage');
  const missionVideo = document.getElementById('missionVideo');
  const cardFrame = document.getElementById('cardFrame');
  const infoLine = document.getElementById('infoLine');
  const infoParticle = document.getElementById('infoParticle');
  const infoText = document.getElementById('infoText');
  let videoPlaying = false;
  const infoParticles = ['✨', '⚡', '🌟', '🔮', '💡', '🪄', '🔥', '🌠'];

  missionImage.addEventListener('click', () => {
    if (videoPlaying) return;
    playSound('cardflip');
    missionImage.src = getRandomCardImage();
    const flipClass = getRandomFlipClass();
    missionImage.classList.add(flipClass);
    setTimeout(() => missionImage.classList.remove(flipClass), 1200);

    const randomVideo = CONFIG.videos[Math.floor(Math.random() * CONFIG.videos.length)];
    missionVideo.src = randomVideo;
    missionVideo.style.display = 'block';
    cardFrame.style.display = 'block';
    setTimeout(() => { missionVideo.style.opacity = 1; }, 100);
    missionVideo.muted = false;
    missionVideo.load();
    missionVideo.play();
    videoPlaying = true;
    buttons.forEach(b => b.disabled = true);

    missionVideo.onended = () => {
      missionVideo.pause();
      missionVideo.style.display = 'none';
      missionVideo.style.opacity = 0;
      cardFrame.style.display = 'none';
      buttons.forEach(b => b.disabled = false);
      videoPlaying = false;
      hideInfoLine();
    };
  });

  missionImage.setAttribute('tabindex', '0');
  missionImage.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') missionImage.click();
  });

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      playSound(btn.dataset.sound);
      showInfoLine(btn.dataset.info);
      btn.classList.add('glow-animate');
      setTimeout(() => window.location.href = btn.dataset.url, 460);
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        btn.click();
      }
    });
    btn.addEventListener('animationend', e => {
      if (e.animationName === 'glow') {
        btn.classList.remove('glow-animate');
      }
    });
  });

  function showInfoLine(text) {
    const particle = infoParticles[Math.floor(Math.random() * infoParticles.length)];
    infoParticle.innerHTML = '';
    const pEl = document.createElement('span');
    pEl.className = 'info-particle';
    pEl.textContent = particle;
    infoParticle.appendChild(pEl);
    infoText.textContent = text;
    infoLine.classList.add('visible', 'glow');
    setTimeout(() => infoLine.classList.remove('glow'), 580);
    clearTimeout(window.infoTimeout);
    window.infoTimeout = setTimeout(hideInfoLine, 2500);
  }

  function hideInfoLine() {
    infoLine.classList.remove('visible');
    infoParticle.innerHTML = '';
    infoText.textContent = '';
  }
});
