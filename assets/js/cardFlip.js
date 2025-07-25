// assets/js/cardFlip.js
export function initCardFlip(CONFIG) {
  const missionImage = document.getElementById('missionImage');
  const missionVideo = document.getElementById('missionVideo');
  const cardFrame = document.getElementById('cardFrame');

  if (!missionImage || !missionVideo || !cardFrame) return;

  const getRandomCardImage = () => {
    const arr = CONFIG.cardImages;
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const getRandomFlipClass = () => {
    return Math.random() > 0.5 ? 'flip-image-x' : 'flip-image-y';
  };

  const getRandomVideo = () => {
    const arr = CONFIG.videos;
    return arr[Math.floor(Math.random() * arr.length)];
  };

  const playSound = (soundKey) => {
    const audio = CONFIG.sounds[soundKey];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = soundKey === 'cardflip' ? 0.45 : 0.7;
      audio.play().catch(() => {});
    }
  };

  let videoPlaying = false;

  missionImage.addEventListener('click', () => {
    if (videoPlaying) return;

    const flipClass = getRandomFlipClass();
    missionImage.src = getRandomCardImage();
    missionImage.classList.add(flipClass);
    playSound('cardflip');

    setTimeout(() => missionImage.classList.remove(flipClass), 1200);

    const videoSrc = getRandomVideo();
    missionVideo.src = videoSrc;
    missionVideo.style.display = 'block';
    cardFrame.style.display = 'block';
    setTimeout(() => { missionVideo.style.opacity = 1; }, 100);
    missionVideo.muted = false;

    if (window.matchMedia('(max-width: 600px)').matches) {
      missionVideo.removeAttribute('controls');
    } else {
      missionVideo.setAttribute('controls', '');
    }

    missionVideo.load();
    missionVideo.play();
    videoPlaying = true;

    missionVideo.onended = () => {
      missionVideo.pause();
      missionVideo.style.display = 'none';
      missionVideo.style.opacity = 0;
      cardFrame.style.display = 'none';
      videoPlaying = false;
    };
  });

  // Optional accessibility
  missionImage.setAttribute('tabindex', '0');
  missionImage.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') missionImage.click();
  });
}
