var missionVideo = document.getElementById("missionVideo");
var missionImage = document.getElementById("missionImage");

// Function to toggle mission content visibility
function toggleMissionContent() {
    var missionContent = document.getElementById("missionContent");
    if (missionContent.style.display === "none") {
        missionContent.style.display = "block";
        missionVideo.style.display = "block";
        missionVideo.play(); // Autoplay the video
        missionImage.style.opacity = 0; // Fade out the image
    } else {
        missionContent.style.display = "none";
        missionVideo.style.display = "none";
        missionVideo.pause();
        missionImage.style.opacity = 1; // Fade in the image
    }
}

// Function to toggle visibility of elements by class name
function toggleVisibility(className) {
    var element = document.querySelector('.' + className);
    element.style.display = (element.style.display === 'none') ? 'block' : 'none';
}

// Function to hide the Splash image
function hideSplash() {
    missionImage.style.opacity = 0;
}

// Function to show the Splash image
function showSplash() {
    missionImage.style.opacity = 1;
}

// Function to hide the welcome layer
function hideWelcomeLayer() {
    var welcomeLayer = document.querySelector('.welcome-layer');
    welcomeLayer.style.display = 'none';
}

// Add event listener to detect when the video has ended
missionVideo.addEventListener('ended', function() {
    showSplash();
});

// Add event listeners to clickable areas
document.querySelectorAll('.clickable-area').forEach(element => {
    element.addEventListener('click', function() {
        const sound = element.getAttribute('data-sound');
        const image = element.getAttribute('data-image');
        const url = element.getAttribute('data-url');
        
        playSound(sound);
        
        if (image) {
            missionImage.src = image;
        }
        
        if (url) {
            window.location.href = url;
        }
    });
});

// Function to play sound
function playSound(soundKey) {
    const audio = sounds[soundKey];
    if (audio) {
        audio.currentTime = 0; // Reset to start
        audio.play().catch(error => {
            console.error('Audio playback failed:', error);
        });
    }
}

// Additional functions from the previous script
const sounds = {
    cardflip: new Audio('assets/atmospherel.m4a'),
    keys: new Audio('assets/keys.m4a'),
    ding: new Audio('assets/ding.mp3')
};

// Lower the volume of all sounds by 30%
Object.keys(sounds).forEach(key => {
    sounds[key].volume = 0.7;
});

function getRandomImage() {
    var randomIndex = Math.floor(Math.random() * cardImages.length);
    return cardImages[randomIndex];
}

let cardClicked = false;

function toggleMissionContent() {
    if (cardClicked) return;
    cardClicked = true;

    var image = document.getElementById('missionImage');
    image.src = getRandomImage();

    var video = document.getElementById('missionVideo');
    video.style.display = 'block';
    video.style.opacity = 0;
    setTimeout(function() {
        video.style.opacity = 1;
    }, 100); // Delay to allow transition to take effect
    video.play();

    document.getElementById('missionContent').style.display = 'block';

    setTimeout(function () {
        video.classList.add('fadeOut');
        setTimeout(function () {
            video.style.display = 'none';
        }, 18000);
    }, 18000);

    var randomFlip = Math.random() > 0.5 ? 'flip-image-x' : 'flip-image-y';
    image.classList.add(randomFlip);
}

function flipAndRedirect() {
    var banner = document.getElementById('aiffBanner');
    var randomFlip = Math.random() > 0.5 ? 'flip-image-x' : 'flip-image-y';
    banner.classList.add(randomFlip);
    setTimeout(function () {
        window.location.href = 'https://charlestonhacks.com/techweek.html';
    }, 2000);
}
