// main.js

// --- Mission Video/Image Toggling Module ---
const MissionController = (() => {
  let missionVideo = null;
  let missionImage = null;
  let missionContent = null;
  let IEBanner = null;
  let cardFrame = null;

  function init() {
    missionVideo = document.getElementById("missionVideo");
    missionImage = document.getElementById("missionImage");
    missionContent = document.getElementById("missionContent");
    IEBanner = document.getElementById("IEBanner");
    cardFrame = document.getElementById("cardFrame");

    setupEventListeners();
    setupVideoHandlers();

    resetState();
  }

  function setupEventListeners() {
    const missionToggle = document.getElementById("missionToggle");
    if (!missionToggle) return;

    missionToggle.addEventListener("click", toggleMissionContent);
    missionToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleMissionContent();
      }
    });

    if (IEBanner) {
      IEBanner.addEventListener("click", flipAndRedirect);
      IEBanner.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          flipAndRedirect();
        }
      });
    }
  }

  function setupVideoHandlers() {
    if (!missionVideo) return;
    missionVideo.addEventListener("ended", showSplash);
    missionVideo.addEventListener("error", () => {
      alert("Error loading video. Please try again later.");
    });
    missionVideo.addEventListener("ended", () => {
      if (cardFrame) cardFrame.style.display = "block";
    });
  }

  function toggleMissionContent() {
    if (MissionState.clicked) return;
    MissionState.clicked = true;

    AudioController.playSound("cardflip");

    // Show mission content, video, hide mission image visually
    missionContent.style.display = "block";
    missionVideo.hidden = false;
    missionVideo.style.opacity = 0;
    missionImage.style.opacity = 0;

    setTimeout(() => {
      missionVideo.style.opacity = 1;
      missionVideo.play();
    }, 100);

    if (IEBanner) IEBanner.style.display = "block";

    // Flip animation on missionImage
    const flipClass = CardController.getRandomFlip();
    missionImage.classList.add(flipClass);
  }

  function flipAndRedirect() {
    if (!IEBanner) return;
    const flipClass = CardController.getRandomFlip();
    IEBanner.classList.add(flipClass);
    setTimeout(() => {
      window.location.href = "https://innovation-engine.devpost.com/";
    }, 2000);
  }

  function showSplash() {
    if (missionImage) {
      missionImage.style.opacity = 1;
    }
  }

  function resetState() {
    if (!missionImage || !missionVideo || !missionContent) return;
    missionImage.src = "images/hsoftest.png";
    missionImage.classList.remove("flip-image-x", "flip-image-y");
    missionImage.style.opacity = 1;

    missionVideo.pause();
    missionVideo.hidden = true;
    missionVideo.style.opacity = 0;

    missionContent.style.display = "none";

    if (IEBanner) IEBanner.style.display = "none";
    if (cardFrame) cardFrame.style.display = "none";

    document.body.classList.remove("fade-out-body");

    MissionState.clicked = false;
  }

  // We keep state here so App or other modules can check if mission card clicked
  const MissionState = { clicked: false };

  return {
    init,
    toggleMissionContent,
    resetState,
    clicked: () => MissionState.clicked,
  };
})();

// --- Audio Controller (Improved with caching) ---
const AudioController = (() => {
  const audioMap = {};
  let preloaded = false;

  function preloadAudio() {
    if (preloaded) return;
    const audioFiles = {
      cardflip: "assets/atmospherel.m4a",
      keys: "assets/keys.m4a",
      chime: "assets/chime.mp3",
    };
    for (const [key, src] of Object.entries(audioFiles)) {
      const audio = new Audio(src);
      audio.volume = 0.2;
      audioMap[key] = audio;
    }
    preloaded = true;
  }

  function playSound(key) {
    const audio = audioMap[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch((e) => console.error("Audio playback failed:", e));
  }

  return {
    preloadAudio,
    playSound,
  };
})();

// --- Card Controller (Partial, needed for MissionController flip effects) ---
const CardController = (() => {
  const cardImages = [
    "images/yellowscullcard.png",
    "images/redscullcard.png",
    "images/Descartes.png",
    "images/Alexandor.png",
    "images/Medusa.png",
    "images/Elara.png",
    "images/adventurercard.png",
    "images/collaboratorcard.png",
    "images/humanitariancard.png",
    "images/nextcard.png",
    "images/Aegis.png",
    "images/resilientcard.png",
    "images/Astrid.png",
    "images/nicolecard.png",
  ];

  function getRandomImage() {
    return cardImages[Math.floor(Math.random() * cardImages.length)];
  }

  function getRandomFlip() {
    return Math.random() > 0.5 ? "flip-image-x" : "flip-image-y";
  }

  return {
    getRandomImage,
    getRandomFlip,
  };
})();

// --- Countdown Controller (KEEP AS IS) ---
const CountdownController = (() => {
  const targetDate = new Date("2025-06-28T00:00:00Z").getTime();
  let intervalId = null;
  let countdownElement = null;

  function init() {
    countdownElement = document.getElementById("countdown");
    start();
  }

  function start() {
    if (!countdownElement) return;
    intervalId = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;

      if (distance <= 0) {
        stop();
        countdownElement.textContent = "Welcome to CharlestonHacks";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return { init, stop };
})();

// --- App Core Logic (Your existing big main.js logic) ---

// I'll simplify and merge your app with these modules.

const App = (() => {
  // Use cached elements, app state and functions here

  // Cache DOM element references
  // (from your prior code in main.js)
  const DOMElements = {
    // Keep your existing cached elements here
    firstNameInput: document.getElementById("first-name"),
    lastNameInput: document.getElementById("last-name"),
    emailInput: document.getElementById("email"),
    skillsInput: document.getElementById("skills-input"),
    photoInput: document.getElementById("photo-input"),
    availabilityInput: document.getElementById("availability-input"),
    bioInput: document.getElementById("bio-input"),
    skillsProficiencyContainer: document.getElementById("skills-proficiency-container"),
    autocompleteSkillsInput: document.getElementById("autocomplete-skills-input"),
    profileBarInner: document.querySelector("#profile-bar .profile-bar-inner"),
    profileProgressMsg: document.getElementById("profile-progress-msg"),
    skillsForm: document.getElementById("skills-form"),
    previewImage: document.getElementById("preview"),
    findTeamBtn: document.getElementById("find-team-btn"),
    teamSkillsInput: document.getElementById("teamSkillsInput"),
    autocompleteTeamSkills: document.getElementById("autocomplete-team-skills"),
    nameInput: document.getElementById("nameInput"),
    searchNameBtn: document.getElementById("search-name-btn"),
    cardContainer: document.getElementById("cardContainer"),
    bestTeamContainer: document.getElementById("bestTeamContainer"),
    teamBuilderSkillsInput: document.getElementById("team-skills-input"),
    autocompleteTeamsSkills: document.getElementById("autocomplete-teams-skills"),
    teamSizeInput: document.getElementById("teamSize"),
    leaderboardSection: document.getElementById("leaderboard-section"),
    leaderboardRows: document.getElementById("leaderboard-rows"),
    matchNotification: document.getElementById("matchNotification"),
    noResults: document.getElementById("noResults"),
    successMessage: document.getElementById("success-message"),
    endorseModal: document.getElementById("endorseSkillModal"),
    endorseModalClose: document.querySelector("#endorseSkillModal .close-button"),
    endorseModalSkillList: document.getElementById("endorse-skill-list"),
    achievements: document.getElementById('achievements')
  };

  // Application state
  const appState = {
    discoveredCards: new Set(),
    achievements: [],
    dynamicSkills: [],
    skillProficiencies: {},
    currentUserEmail: localStorage.getItem("demo_user_email") || ""
  };

  // Supabase client initialization
  const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
  const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE'; // Replace with your actual key, or import from config
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // All your existing helper and async functions here...

  // For space, I won't repeat everything; just note you should put your existing:
  //  - updateProfileProgress()
  //  - handleSkillsInput()
  //  - handlePhotoInputChange()
  //  - fetchUniqueSkills()
  //  - setupAutocomplete()
  //  - handleProfileSubmit()
  //  - isValidEmail()
  //  - renderUserCards()
  //  - findMatchingUsers()
  //  - searchUserByName()
  //  - buildBestTeam()
  //  - showEndorseSkillModal()
  //  - handleEndorsementSelection()
  //  - generateUserCardHTML()
  //  - loadLeaderboard()
  //  - showNotification(), hideNotifications()

  // The only big changes below are event delegation and adding hooks to MissionController and AudioController

  function setupEventListeners() {
    // Mission toggle handled by MissionController
    // preload sounds on pointerdown for performance
    window.addEventListener("pointerdown", () => {
      AudioController.preloadAudio();
    }, { once: true });

    // Mission video/image toggle (init in MissionController)

    // Profile form events
    if (DOMElements.skillsInput)
      DOMElements.skillsInput.addEventListener("input", handleSkillsInput);
    if (DOMElements.photoInput)
      DOMElements.photoInput.addEventListener("change", handlePhotoInputChange);
    if (DOMElements.skillsForm)
      DOMElements.skillsForm.addEventListener("submit", handleProfileSubmit);

    // Autocomplete
    setupAutocomplete(DOMElements.skillsInput, DOMElements.autocompleteSkillsInput);
    setupAutocomplete(DOMElements.teamSkillsInput, DOMElements.autocompleteTeamSkills);
    setupAutocomplete(DOMElements.teamBuilderSkillsInput, DOMElements.autocompleteTeamsSkills);

    // Search and team finders
    if (DOMElements.findTeamBtn) DOMElements.findTeamBtn.addEventListener("click", findMatchingUsers);
    if (DOMElements.searchNameBtn) DOMElements.searchNameBtn.addEventListener("click", searchUserByName);

    // Modal close button
    if (DOMElements.endorseModalClose) {
      DOMElements.endorseModalClose.addEventListener("click", () => {
        DOMElements.endorseModal.style.display = "none";
      });
    }

    // Close modal when clicking outside it
    window.addEventListener("click", (event) => {
      if (event.target === DOMElements.endorseModal) {
        DOMElements.endorseModal.style.display = "none";
      }
    });

    // Event delegation for endorsements in cards (both containers)
    [DOMElements.cardContainer, DOMElements.bestTeamContainer].forEach((container) => {
      if (!container) return;
      container.addEventListener("click", async (event) => {
        const btn = event.target.closest(".endorse-btn");
        if (!btn || btn.disabled) return;

        const emailToEndorse = btn.dataset.email;
        try {
          const { data, error } = await supabaseClient.from("skills").select("*").eq("email", emailToEndorse).single();
          if (error || !data) throw error;
          showEndorseSkillModal(data.email, data.first_name, data.last_name, data.skills);
        } catch (err) {
          console.error("Failed to load user for endorsement modal:", err);
          showNotification("Could not load user's skills for endorsement.", "error");
        }
      });
    });

    // Build best team invoked globally; you can keep exposing it on window:
    window.buildBestTeam = buildBestTeam;

    // On page show (bfcache restore), reset mission state and fade out UI
    window.addEventListener("pageshow", () => {
      document.body.classList.remove("fade-out-body");
      MissionController.resetState();
    });
  }

  // Initialization function
  async function init() {
    MissionController.init();
    CountdownController.init();
    setupEventListeners();

    await fetchUniqueSkills();
    await loadLeaderboard();
    updateProfileProgress();
  }

  // Expose public API
  return {
    init,
    // For testing or module interoperability
    AudioController,
    MissionController,
    supabaseClient,
    appState,
    DOMElements,
  };
})();

// Initialize app on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  App.init().catch(console.error);
});
