// src/state.js

import { supabaseClient as supabase } from './supabaseClient.js';
export { supabase };


// Global App State
export const appState = {
  discoveredCards: new Set(),
  achievements: [],
  dynamicSkills: [],
  skillProficiencies: {},
  currentUserEmail: localStorage.getItem("demo_user_email") || ''
};

// DOM References
export const DOMElements = {
  firstNameInput: document.getElementById("first-name"),
  lastNameInput: document.getElementById("last-name"),
  emailInput: document.getElementById("email"),
  skillsInput: document.getElementById("skills-input"),
  photoInput: document.getElementById("photo-input"),
  availabilityInput: document.getElementById("availability-input"),
  bioInput: document.getElementById("bio-input"),
  skillsProficiencyContainer: document.getElementById('skills-proficiency-container'),
  autocompleteSkillsInput: document.getElementById('autocomplete-skills-input'),
  profileBarInner: document.querySelector("#profile-bar .profile-bar-inner"),
  profileProgressMsg: document.getElementById("profile-progress-msg"),
  skillsForm: document.getElementById('skills-form'),
  previewImage: document.getElementById('preview'),
  findTeamBtn: document.getElementById('find-team-btn'),
  teamSkillsInput: document.getElementById('teamSkillsInput'),
  autocompleteTeamSkills: document.getElementById('autocomplete-team-skills'),
  nameInput: document.getElementById('nameInput'),
  searchNameBtn: document.getElementById('search-name-btn'),
  cardContainer: document.getElementById('cardContainer'),
  bestTeamContainer: document.getElementById('bestTeamContainer'),
  teamBuilderSkillsInput: document.getElementById('team-skills-input'),
  autocompleteTeamsSkills: document.getElementById('autocomplete-teams-skills'),
  teamSizeInput: document.getElementById('teamSize'),
  leaderboardSection: document.getElementById('leaderboard-section'),
  leaderboardRows: document.getElementById('leaderboard-rows'),
  matchNotification: document.getElementById('matchNotification'),
  noResults: document.getElementById('noResults'),
  successMessage: document.getElementById('success-message'),
  endorseModal: document.getElementById('endorseSkillModal'),
  endorseModalClose: document.querySelector('#endorseSkillModal .close-button'),
  endorseModalSkillList: document.getElementById('endorse-skill-list')
};
