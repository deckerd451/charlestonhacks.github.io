<!DOCTYPE HTML>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
    <title>Home</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"> <!-- Font Awesome CSS link -->
    <style>
        /* Resetting default margin and padding */
        body, h1, h2, h3, p, ul {
            margin: 0;
            padding: 0;
        }

        /* Your CSS styles go here */
        body {
            background-color: black; /* Setting the background color to black */
            color: white; /* Setting text color to white */
            font-family: 'Britannic Bold', Arial, sans-serif; /* Setting a default font */
            overflow-x: hidden; /* Hide horizontal scrollbar */
            position: relative; /* Set body position to relative */
        }

        /* Container for the main content */
        #main {
            width: 100%; /* Adjust width as needed */
            margin: 0 auto; /* Centering the container */
            padding: 10px; /* Adding some padding */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            position: relative; /* Set position to relative */
        }

        /* Panel style */
        .panel {
            text-align: center;
            margin: 10px auto; /* Adjust the margins as needed */
            position: relative; /* Add relative positioning */
            width: 100%; /* Set panel width to 100% */
            display: flex;
            justify-content: center; /* Center the content horizontally */
        }

        .panel img {
            max-width: 100%; /* Set maximum width to 100% */
            height: auto; /* Maintain aspect ratio */
            display: block;
            margin: 0 auto;
            transition: opacity 2s; /* Add a transition for opacity */
        }

        /* Post styles */
        .post {
            padding: 20px;
            border-bottom: 30px;
        }

        .post h2 {
            text-align: center; /* Centering the text */
            margin-bottom: 0; /* Remove the bottom margin */
        }

        /* Footer styles */
        footer {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: #000000;
            padding: 5px;
            color: white;
            text-align: center;
            display: flex;
            justify-content: center;
            align-items: center; /* Center items vertically */
        }

        footer section {
            display: flex;
            justify-content: center; /* Center the links horizontally */
            width: 100%;
        }

        footer section a {
    margin: 10px;
    color: #333333;
    font-size: 24px;
    text-decoration: none;
}

footer section a:hover {
    text-decoration: underline;
    color: green;
}

        /* Center the main image on mobile devices */
        @media (max-width: 768px) {
            .panel img {
                margin-left: auto;
                margin-right: auto;
                display: block;
            }
           
            footer {
                margin-top: 10px; /* Adjust the margin as needed */
            }
        }

        /* CSS for the video */
        #missionVideo {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%; /* Set width to 100% */
            max-height: 100%; /* Set max-height to 100% */
            object-fit: cover; /* Maintain aspect ratio and cover whole container */
            display: none; /* Hide the video initially */
            z-index: -1; /* Move video behind other content */
        }

        /* Centering the mission content */
        #missionContent {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100%; /* Adjust width as needed */
            background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent background */
            padding: 20px; /* Adding some padding */
            text-align: center;
            display: none; /* Hide the content initially */
            z-index: 1; /* Ensure content is above video */
        }

        /* Make the mission content text white */
        #missionContent p, #missionContent button {
            color: white;
        }

        /* Text overlay */
        .overlay-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            opacity: 0;
            transition: opacity 0.5s;
            pointer-events: none; /* Ensure text doesn't interfere with click */
        }

        footer section {
            display: flex;
            justify-content: center;
            width: 100%;
        }

        footer section a {
            margin: 0 10px;
        }

        /* Countdown timer styles */
        .countdown {
            position: absolute;
            bottom: 20px; /* Adjust the distance from the bottom */
            left: 50%;
            transform: translateX(-50%);
            background-color: magenta; /* Set the timer color to magenta */
            padding: 10px 20px;
            font-size: 24px;
            font-weight: bold;
            border-radius: 5px;
            z-index: 1; /* Ensure countdown timer is above the video */
        }

    </style>
    <noscript><link rel="stylesheet" href="assets/css/noscript.css" /></noscript>
</head>
<body class="is-preload">

<!-- Main -->
<div id="main">
    <!-- Post -->
    <article class="post featured">
        <header class="major">
            <div class="panel">
                <a class="image main" onclick="toggleMissionContent()" style="display: flex; justify-content: center;">
                    <img id="missionImage" src="images/finalcard2.png"
 alt="CharlestonHacks" style="max-width: 100vw; max-height: 100vh;" />
         <video id="missionVideo" volume="0.1">
    <source src="images/VID_40430923_151654_462.mp4" type="video/mp4">
    Your browser does not support the video tag.
</video>
<script>
    var video = document.getElementById('missionVideo');
    video.volume = 0.1; // Set the volume to 10%
</script>


                </a>
                <div id="missionContent">
                    <p style="font-size: larger;"><b>Make a plan, form a team, create a proto,</p> <p>build the future: HackOps</b></p>
                    <br>
                   
