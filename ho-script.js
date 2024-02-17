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

// Add event listener to detect when the video has ended
missionVideo.addEventListener('ended', function() {
    showSplash();
});
