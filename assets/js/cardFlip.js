// assets/js/cardFlip.js
export function initCardFlip() {
  const missionImage = document.getElementById('missionImage');
  const cardFrame = document.getElementById('cardFrame');
  const missionVideo = document.getElementById('missionVideo');
  const flipSound = document.getElementById('cardflipSound');

  if (missionImage) {
    missionImage.addEventListener('click', () => {
      missionImage.classList.add('flipped');

      if (cardFrame) cardFrame.style.display = 'block';
      if (missionVideo) {
        missionVideo.style.display = 'block';
        missionVideo.play();
        missionVideo.style.opacity = '1';
      }
      if (flipSound) flipSound.play();
    });
  }
}
