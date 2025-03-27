document.addEventListener("DOMContentLoaded", function() {
    function adjustClickablePositions() {
        let screenWidth = window.innerWidth;
        let clickableAreas = document.querySelectorAll('.clickable-area');

        if (screenWidth < 768) {
            // Stack clickable elements above and below the card
            document.querySelector('.clickable-wrapper').style.flexDirection = "column";
        } else if (screenWidth < 1024) {
            // Keep them closer to the card on tablets
            clickableAreas.forEach(el => el.style.margin = "5px");
        } else {
            // Default positions for desktop
            clickableAreas.forEach(el => el.style.margin = "0");
        }
    }

    // Adjust on load and on window resize
    adjustClickablePositions();
    window.addEventListener("resize", adjustClickablePositions);
});
