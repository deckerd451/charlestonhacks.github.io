// main.js

// Supabase Configuration (keep as is)
const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global State (for achievements and potential future features)
const appState = {
    discoveredCards: new Set(),
    achievements: [],
    dynamicSkills: [],
    skillProficiencies: {},
    currentUserEmail: localStorage.getItem("demo_user_email") || ''
};

// --- DOM Element References ---
const DOMElements = {
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
    // NEW: Modal elements for endorsement
    endorseModal: document.getElementById('endorseSkillModal'),
    endorseModalClose: document.querySelector('#endorseSkillModal .close-button'),
    endorseModalSkillList: document.getElementById('endorse-skill-list')
};


// --- Utility Functions (Keep as is, or modified as per previous discussion) ---

/**
 * Updates the profile completion progress bar and message.
 */
function updateProfileProgress() {
    const fields = [
        DOMElements.firstNameInput.value.trim(),
        DOMElements.lastNameInput.value.trim(),
        DOMElements.emailInput.value.trim(),
        DOMElements.skillsInput.value.trim(),
        DOMElements.photoInput.value,
        DOMElements.availabilityInput.value,
    ];
    const filledCount = fields.filter(Boolean).length;
    const totalFields = fields.length;
    const percent = Math.floor((filledCount / totalFields) * 100);

    DOMElements.profileBarInner.style.width = `${percent}%`;
    DOMElements.profileProgressMsg.textContent = percent === 100 ? "Profile Complete!" : "Profile incomplete, fill all fields";
    DOMElements.profileProgressMsg.className = percent === 100 ? "profile-complete" : "profile-incomplete";
}

/**
 * Handles the display of skill proficiency selects.
 * @param {Event} event - The input event from the skills input.
 */
function handleSkillsInput() {
    const skills = this.value.split(',').map(s => s.trim()).filter(Boolean);
    DOMElements.skillsProficiencyContainer.innerHTML = '';

    skills.forEach(skill => {
        if (!skill) return;
        if (!(skill in appState.skillProficiencies)) {
            appState.skillProficiencies[skill] = "Intermediate";
        }
        DOMElements.skillsProficiencyContainer.insertAdjacentHTML('beforeend', `
            <div style="margin-bottom: 7px;">
                <span style="color:var(--primary-color);">${skill}</span>
                <select class="proficiency-select" data-skill="${skill}" aria-label="Proficiency for ${skill}">
                    <option value="Beginner" ${appState.skillProficiencies[skill] === "Beginner" ? "selected" : ""}>Beginner</option>
                    <option value="Intermediate" ${appState.skillProficiencies[skill] === "Intermediate" ? "selected" : ""}>Intermediate</option>
                    <option value="Expert" ${appState.skillProficiencies[skill] === "Expert" ? "selected" : ""}>Expert</option>
                </select>
            </div>
        `);
    });

    // Event delegation for proficiency selects
    DOMElements.skillsProficiencyContainer.querySelectorAll('.proficiency-select').forEach(sel => {
        sel.addEventListener('change', function() {
            appState.skillProficiencies[this.dataset.skill] = this.value;
        });
    });
}

/**
 * Handles image file selection and displays a preview.
 * @param {Event} event - The change event from the file input.
 */
function handlePhotoInputChange() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = e => {
            DOMElements.previewImage.src = e.target.result;
            DOMElements.previewImage.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        DOMElements.previewImage.style.display = 'none';
        DOMElements.previewImage.src = '#';
    }
}

/**
 * Fetches unique skills from Supabase and populates the dynamicSkills array.
 */
async function fetchUniqueSkills() {
    try {
        const { data, error } = await supabaseClient.from('skills').select('skills');
        if (error) throw error;
        appState.dynamicSkills = [...new Set(data.flatMap(item => item.skills.split(',').map(skill => skill.trim().toLowerCase().replace(/\(.*?\)/, ''))))];
    } catch (error) {
        console.error("Error fetching unique skills:", error.message);
        appState.dynamicSkills = []; // Ensure it's an empty array on error
    }
}

/**
 * Sets up autocomplete functionality for a given input field.
 * @param {HTMLElement} inputElement - The input field for autocomplete.
 * @param {HTMLElement} autocompleteBoxElement - The div to display suggestions.
 */
function setupAutocomplete(inputElement, autocompleteBoxElement) {
    let timeoutId;
    inputElement.addEventListener('input', () => {
        clearTimeout(timeoutId); // Clear previous timeout
        timeoutId = setTimeout(() => { // Debounce input
            const userInput = inputElement.value.toLowerCase().trim().split(',').pop().trim();
            autocompleteBoxElement.innerHTML = '';
            if (!userInput || !appState.dynamicSkills.length) {
                autocompleteBoxElement.style.display = 'none';
                return;
            }

            const matches = appState.dynamicSkills.filter(skill => skill.includes(userInput)).slice(0, 10);

            if (!matches.length) {
                autocompleteBoxElement.style.display = 'none';
                return;
            }

            matches.forEach(skill => {
                const item = document.createElement('div');
                item.textContent = skill;
                item.setAttribute('role', 'option');
                item.tabIndex = -1; // Make it focusable but not part of tab order initially
                item.onclick = () => {
                    const parts = inputElement.value.split(',');
                    parts.pop();
                    parts.push(skill);
                    inputElement.value = parts.map(p => p.trim()).join(', ');
                    autocompleteBoxElement.innerHTML = '';
                    autocompleteBoxElement.style.display = 'none';
                    inputElement.focus(); // Keep focus on input after selection
                    inputElement.dispatchEvent(new Event("input")); // Trigger input event for proficiency
                };
                autocompleteBoxElement.appendChild(item);
            });

            const rect = inputElement.getBoundingClientRect();
            autocompleteBoxElement.style.left = `${rect.left + window.scrollX}px`;
            autocompleteBoxElement.style.top = `${rect.bottom + window.scrollY}px`;
            autocompleteBoxElement.style.width = `${rect.width}px`;
            autocompleteBoxElement.style.display = 'block';

        }, 300); // Debounce time in ms
    });

    document.addEventListener('click', (e) => {
        if (!autocompleteBoxElement.contains(e.target) && e.target !== inputElement) {
            autocompleteBoxElement.style.display = 'none';
        }
    });

    // Keyboard navigation for accessibility
    inputElement.addEventListener('keydown', (e) => {
        const activeItem = autocompleteBoxElement.querySelector('.autocomplete-active');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('autocomplete-active');
                if (activeItem.nextElementSibling) {
                    activeItem.nextElementSibling.classList.add('autocomplete-active');
                    activeItem.nextElementSibling.focus();
                } else {
                    autocompleteBoxElement.firstElementChild.classList.add('autocomplete-active');
                    autocompleteBoxElement.firstElementChild.focus();
                }
            } else if (autocompleteBoxElement.firstElementChild) {
                autocompleteBoxElement.firstElementChild.classList.add('autocomplete-active');
                autocompleteBoxElement.firstElementChild.focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activeItem) {
                activeItem.classList.remove('autocomplete-active');
                if (activeItem.previousElementSibling) {
                    activeItem.previousElementSibling.classList.add('autocomplete-active');
                    activeItem.previousElementSibling.focus();
                } else {
                    autocompleteBoxElement.lastElementChild.classList.add('autocomplete-active');
                    autocompleteBoxElement.lastElementChild.focus();
                }
            }
        } else if (e.key === 'Enter') {
            if (activeItem) {
                activeItem.click(); // Simulate click
            } else if (inputElement.value.trim()) {
                // If no item is selected but there's text, close autocomplete
                autocompleteBoxElement.style.display = 'none';
                inputElement.dispatchEvent(new Event("input")); // Trigger proficiency update
            }
        } else if (e.key === 'Escape') {
            autocompleteBoxElement.style.display = 'none';
        }
    });
}

/**
 * Submits the user's profile data to Supabase.
 * @param {Event} e - The submit event.
 */
async function handleProfileSubmit(e) {
    e.preventDefault();

    const firstName = DOMElements.firstNameInput.value.trim();
    const lastName = DOMElements.lastNameInput.value.trim();
    const email = DOMElements.emailInput.value.trim();
    const rawSkills = DOMElements.skillsInput.value.trim().replace(/,\s*$/, '');
    const skillsArr = rawSkills.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const profs = skillsArr.map(skill => appState.skillProficiencies[skill] || "Intermediate");
    const skillsWithProfs = skillsArr.map((skill, i) => `${skill}(${profs[i]})`).join(',');
    const bio = DOMElements.bioInput.value.trim();
    const availability = DOMElements.availabilityInput.value;
    const photoFile = DOMElements.photoInput.files[0];

    if (!photoFile) {
        showNotification("Please select a profile image.", 'error');
        return;
    }

    // Input validation
    if (!firstName || !lastName || !email || !skillsArr.length) {
        showNotification("Please fill in all required fields (First Name, Last Name, Email, Skills).", 'error');
        return;
    }
    if (!isValidEmail(email)) {
        showNotification("Please enter a valid email address.", 'error');
        return;
    }

    try {
        // Upload image to Supabase Storage
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${firstName.toLowerCase()}-${lastName.toLowerCase()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage.from('hacksbucket').upload(fileName, photoFile);

        if (uploadError) {
            console.error("Image upload error:", uploadError);
            throw new Error('Failed to upload image. Please try again.');
        }

        const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/hacksbucket/${fileName}`;

        // Insert user data into Supabase database
        const { error: insertError } = await supabaseClient.from('skills').insert({
            first_name: firstName,
            last_name: lastName,
            email: email,
            skills: skillsWithProfs,
            image_url: imageUrl,
            Bio: bio,
            Availability: availability,
            endorsements: "{}", // Initialize as empty JSON string
            created_at: new Date().toISOString()
        });

        if (insertError) {
            console.error("Data insertion error:", insertError);
            // Check for unique constraint violation (e.g., email already exists)
            if (insertError.code === '23505') { // PostgreSQL unique violation error code
                throw new Error('This email is already registered. Please use a different email or update your existing profile.');
            } else {
                throw new Error('Failed to register profile. Please try again later.');
            }
        }

        showNotification('Registration successful!', 'success');
        DOMElements.skillsForm.reset(); // Clear form
        DOMElements.previewImage.style.display = 'none';
        DOMElements.previewImage.src = '#';
        appState.skillProficiencies = {}; // Clear proficiencies
        DOMElements.skillsProficiencyContainer.innerHTML = ''; // Clear proficiency selects
        updateProfileProgress(); // Reset progress bar
        await fetchUniqueSkills(); // Refresh skills for autocomplete
        loadLeaderboard(); // Update leaderboard
    } catch (error) {
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Validates if the given string is a valid email format.
 * @param {string} email - The email string to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Renders user cards in the specified container.
 * MODIFIED: endorsement button now triggers modal
 * @param {Array<Object>} users - Array of user objects.
 * @param {HTMLElement} container - The DOM element to render cards into.
 */
async function renderUserCards(users, container) {
    container.innerHTML = ''; // Clear existing cards
    hideNotifications(); // Hide any previous notifications

    if (!users.length) {
        DOMElements.noResults.textContent = 'No matching users found.';
        DOMElements.noResults.style.display = 'block';
        return;
    }

    const cardsHtml = users.map(user => {
        return generateUserCardHTML(user); // Use the helper function
    }).join('');

    container.innerHTML = cardsHtml;

    // REMOVED: Individual event listener attachment here.
    // Event delegation will handle this from the parent container.
}

/**
 * Finds and displays users matching the entered skills.
 */
async function findMatchingUsers() {
    const skillsInput = DOMElements.teamSkillsInput.value.trim();
    if (!skillsInput) {
        showNotification('Please enter at least one skill.', 'warning');
        DOMElements.cardContainer.innerHTML = '';
        return;
    }
    const requiredSkills = skillsInput.toLowerCase().split(',').map(skill => skill.trim()).filter(Boolean);

    try {
        const { data, error } = await supabaseClient.from('skills').select('*');
        if (error) throw error;

        // Fuzzy match function
        const isFuzzyMatch = (userSkill, requiredSkill) => {
            userSkill = userSkill.toLowerCase();
            requiredSkill = requiredSkill.toLowerCase();
            // Remove proficiency from userSkill for matching
            const cleanedUserSkill = userSkill.replace(/\(.*?\)/, '');
            return cleanedUserSkill.includes(requiredSkill) || requiredSkill.includes(cleanedUserSkill) || cleanedUserSkill === requiredSkill;
        };

        const matchedUsers = data.filter(user => {
            const userSkillsRaw = user.skills.split(',').map(s => s.trim());
            return requiredSkills.every(skill =>
                userSkillsRaw.some(us => isFuzzyMatch(us, skill))
            );
        });
        renderUserCards(matchedUsers, DOMElements.cardContainer);
        if (matchedUsers.length > 0) {
            showNotification(`Found ${matchedUsers.length} matching user(s).`, 'success');
        }
    } catch (error) {
        console.error("Error finding matching users:", error);
        showNotification('Error fetching user data. Please try again.', 'error');
        DOMElements.cardContainer.innerHTML = '<span style="color:red;">Error fetching data.</span>';
    }
}

/**
 * Searches and displays users by first or last name.
 */
async function searchUserByName() {
    const nameInput = DOMElements.nameInput.value.trim().toLowerCase();
    if (!nameInput) {
        showNotification('Please enter a name to search.', 'warning');
        DOMElements.cardContainer.innerHTML = '';
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('skills').select('*');
        if (error) throw error;

        const matchedUsers = data.filter(user => {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            return fullName.includes(nameInput) || user.first_name.toLowerCase().includes(nameInput) || user.last_name.toLowerCase().includes(nameInput);
        });
        renderUserCards(matchedUsers, DOMElements.cardContainer);
        if (matchedUsers.length > 0) {
            showNotification(`Found ${matchedUsers.length} user(s) matching "${nameInput}".`, 'success');
        }
    } catch (error) {
        console.error("Error searching by name:", error);
        showNotification('Error fetching user data. Please try again.', 'error');
        DOMElements.cardContainer.innerHTML = '<span style="color:red;">Error fetching data.</span>';
    }
}

/**
 * Builds the best team based on required skills and team size.
 */
window.buildBestTeam = async function () {
    const skillInputRaw = DOMElements.teamBuilderSkillsInput.value;
    const teamSize = parseInt(DOMElements.teamSizeInput.value, 10);

    const skillInput = skillInputRaw
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean); // remove empty strings

    if (!skillInput.length || isNaN(teamSize) || teamSize < 1) {
        showNotification('Please enter required skills and a valid team size (1 or more).', 'warning');
        DOMElements.bestTeamContainer.innerHTML = '';
        return;
    }

    try {
        const { data: users, error } = await supabaseClient
            .from('skills')
            .select('*');

        if (error || !users) throw error;

        const scoredUsers = users
            .map(user => {
                // Normalize user skills
                const userSkillsRaw = user.skills
                    .split(',')
                    .map(s => s.replace(/\(.*?\)/, '').trim().toLowerCase());

                // Find exact skill matches
                const matchingSkills = skillInput.filter(requiredSkill =>
                    userSkillsRaw.includes(requiredSkill)
                );

                return matchingSkills.length
                    ? {
                        ...user,
                        matchingSkills,
                        matchCount: matchingSkills.length
                    }
                    : null;
            })
            .filter(Boolean)
            .sort((a, b) =>
                b.matchCount - a.matchCount ||
                (b.endorsements?.length || 0) - (a.endorsements?.length || 0) // Sort by endorsements if matchCount is same
            )
            .slice(0, teamSize);

        // Ensure defaults for missing avatars or bios
        const scoredUsersCleaned = scoredUsers.map(user => ({
            ...user,
            avatar_url: user.avatar_url || "https://via.placeholder.com/150",
            bio: user.bio || "No bio provided."
        }));

        renderUserCards(scoredUsersCleaned, DOMElements.bestTeamContainer);

        if (scoredUsers.length > 0) {
            showNotification(`Built a team of ${scoredUsers.length} member(s).`, 'success');
        } else {
            showNotification('No team members matched the required skills.', 'info');
        }
    } catch (error) {
        console.error("Error building team:", error);
        showNotification('Error loading users for team building. Please try again.', 'error');
        DOMElements.bestTeamContainer.innerHTML = '<span style="color:white;">Error loading users.</span>';
    }
};

/**
 * Shows a modal allowing the user to select which skill to endorse.
 * @param {string} userEmail - The email of the user to be endorsed.
 * @param {string} firstName - The first name of the user.
 * @param {string} lastName - The last name of the user.
 * @param {string} skillsString - A comma-separated string of skills for the user.
 */
function showEndorseSkillModal(userEmail, firstName, lastName, skillsString) {
    if (!appState.currentUserEmail) {
        const userEmailPrompt = prompt("Enter your email to endorse:");
        if (userEmailPrompt) {
            appState.currentUserEmail = userEmailPrompt.trim();
            localStorage.setItem("demo_user_email", appState.currentUserEmail);
            showNotification("Your email has been saved for future endorsements.", "info");
        } else {
            showNotification("Endorsement canceled. Please provide your email to endorse.", "warning");
            return;
        }
    }

    if (userEmail === appState.currentUserEmail) {
        showNotification("You cannot endorse yourself.", "warning");
        return;
    }

    DOMElements.endorseModalSkillList.innerHTML = ''; // Clear previous skills

    const skills = skillsString.split(',').map(s => s.replace(/\(.*?\)/, '').trim()).filter(Boolean);

    if (skills.length === 0) {
        showNotification("This user has no skills listed to endorse.", "warning");
        return;
    }

    const titleElement = DOMElements.endorseModal.querySelector('h3');
    if (titleElement) {
        titleElement.textContent = `Endorse ${firstName} ${lastName} for...`;
    }

    skills.forEach(skill => {
        const skillItem = document.createElement('div');
        skillItem.className = 'skill-endorse-item';
        skillItem.innerHTML = `
            <span>${skill}</span>
            <button class="endorse-specific-skill-btn" data-email="${userEmail}" data-skill="${skill}">Endorse</button>
        `;
        DOMElements.endorseModalSkillList.appendChild(skillItem);
    });

    // Add event listeners for the new buttons within the modal
    DOMElements.endorseModalSkillList.querySelectorAll('.endorse-specific-skill-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const email = event.currentTarget.dataset.email;
            const skill = event.currentTarget.dataset.skill;
            handleEndorsementSelection(email, skill);
        });
    });

    DOMElements.endorseModal.style.display = 'block'; // Show the modal
}

/**
 * Handles the selection of a specific skill to endorse from the modal.
 * @param {string} emailToEndorse - The email of the user whose skill is being endorsed.
 * @param {string} skillToEndorse - The specific skill to endorse.
 */
async function handleEndorsementSelection(emailToEndorse, skillToEndorse) {
    DOMElements.endorseModal.style.display = 'none'; // Hide the modal

    try {
        const { data, error } = await supabaseClient.from('skills').select('endorsements').eq('email', emailToEndorse).single();
        if (error || !data) throw new Error("User not found or database error.");

        let endorsements = {};
        try {
            endorsements = data.endorsements ? JSON.parse(data.endorsements) : {};
        } catch (e) {
            console.warn(`Error parsing existing endorsements for ${emailToEndorse}:`, e);
            endorsements = {};
        }

        endorsements[skillToEndorse] = (endorsements[skillToEndorse] || 0) + 1;

        const { error: updateError } = await supabaseClient.from('skills').update({ endorsements: JSON.stringify(endorsements) }).eq('email', emailToEndorse);
        if (updateError) throw updateError;

        showNotification(`Skill "${skillToEndorse}" endorsed successfully!`, "success");
        loadLeaderboard(); // Update leaderboard after endorsement

        // Re-render the specific card to show updated endorsement count without full page refresh
        // Find the specific card to update. This might be in DOMElements.cardContainer or DOMElements.bestTeamContainer
        const cardElementInCardContainer = DOMElements.cardContainer.querySelector(`button[data-email="${emailToEndorse}"]`)?.closest('.team-member-card');
        const cardElementInBestTeamContainer = DOMElements.bestTeamContainer.querySelector(`button[data-email="${emailToEndorse}"]`)?.closest('.team-member-card');

        if (cardElementInCardContainer) {
            const updatedUserData = await supabaseClient.from('skills').select('*').eq('email', emailToEndorse).single();
            if (updatedUserData.data) {
                const newCardHtml = generateUserCardHTML(updatedUserData.data);
                cardElementInCardContainer.outerHTML = newCardHtml;
                // REMOVED: Re-attachment here. Event delegation will handle it.
            }
        }
        if (cardElementInBestTeamContainer) {
            const updatedUserData = await supabaseClient.from('skills').select('*').eq('email', emailToEndorse).single();
            if (updatedUserData.data) {
                const newCardHtml = generateUserCardHTML(updatedUserData.data);
                cardElementInBestTeamContainer.outerHTML = newCardHtml;
                // REMOVED: Re-attachment here. Event delegation will handle it.
            }
        }


    } catch (error) {
        console.error("Endorsement error:", error);
        showNotification(`Failed to endorse: ${error.message}`, 'error');
    }
}


/**
 * Generates HTML for a single user card. (Helper for selective re-rendering)
 * Note: The endorse button's data-email now solely identifies the user for the modal.
 * @param {Object} user - User data object.
 * @returns {string} HTML string for the user card.
 */
function generateUserCardHTML(user) {
    const cleanAvailability = (value) => {
        if (value === null || value === undefined) return 'Unavailable';
        if (typeof value !== 'string') return 'Unavailable';
        const trimmed = value.trim();
        if (trimmed === '' || trimmed.toLowerCase() === 'null') return 'Unavailable';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    };

    const skillBadges = user.skills.split(',').map(skill => {
        const match = skill.match(/(.*?)\((.*?)\)/);
        const label = match ? match[1] : skill;
        const prof = match ? match[2] : "Intermediate";
        return `<span class="skill-tag">${label} <span style="font-size:0.8em;opacity:.7;">[${prof}]</span></span>`;
    }).join(' ');

    let endorsements = {};
    try {
        endorsements = user.endorsements ? JSON.parse(user.endorsements) : {};
    } catch (e) {
        console.warn(`Error parsing endorsements for user ${user.email}:`, e);
        endorsements = {};
    }

    const endorsementDisplay = Object.keys(endorsements).length ?
        Object.entries(endorsements).map(([skill, count]) =>
            `<span style="color:var(--primary-color);">${skill}: <span class="endorsements">${count} <i class="fa fa-thumbs-up" aria-hidden="true"></i></span>`
        ).join(' | ') :
        '<span style="color:#888;">No endorsements yet</span>';

    const isCurrentUser = user.email === appState.currentUserEmail;

    return `
        <div class="team-member-card" role="listitem">
            ${user.image_url ? `<img src="${user.image_url}" alt="${user.first_name} ${user.last_name}" loading="lazy" />` : ''}
            <div class="member-name">${user.first_name} ${user.last_name}</div>
            <div class="member-email" style="color:##FFC107; font-size:0.9em; margin:3px 0;">${user.email}</div>
            ${user.Bio ? `<div style="color:var(--primary-color);font-size:.96em;margin:3px 0;">${user.Bio}</div>` : ''}
            <div class="user-status">Status: ${cleanAvailability(user.Availability)}</div>
            <div class="profile-section skill-tags">${skillBadges}</div>
            <div class="profile-section">
                ${endorsementDisplay}
            </div>
            <button class="endorse-btn" data-email="${user.email}" ${isCurrentUser ? 'disabled' : ''} aria-label="Endorse ${user.first_name} ${user.last_name}">
                + Endorse
            </button>
        </div>
    `;
}

/**
 * Loads and displays the top endorsed skills leaderboard
 */
async function loadLeaderboard() {
    try {
        const { data, error } = await supabaseClient.from('skills').select('endorsements');
        if (error) throw error;

        const skillCounts = {};
        data.forEach(user => {
            if (user.endorsements) {
                try {
                    const endorsements = JSON.parse(user.endorsements);
                    for (const skill in endorsements) {
                        skillCounts[skill] = (skillCounts[skill] || 0) + endorsements[skill];
                    }
                } catch (e) {
                    console.warn("Error parsing endorsements for leaderboard:", e);
                }
            }
        });

        const sortedSkills = Object.entries(skillCounts).sort(([, countA], [, countB]) => countB - countA);

        DOMElements.leaderboardRows.innerHTML = '';
        if (sortedSkills.length === 0) {
            DOMElements.leaderboardRows.innerHTML = '<p>No skills endorsed yet. Be the first!</p>';
            return;
        }

        sortedSkills.forEach(([skill, count], index) => {
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="leaderboard-rank">${index + 1}.</span>
                <span class="leaderboard-skill">${skill}</span>
                <span class="leaderboard-count">${count} <i class="fa fa-thumbs-up"></i></span>
            `;
            DOMElements.leaderboardRows.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading leaderboard:", error.message);
        DOMElements.leaderboardRows.innerHTML = '<p style="color:red;">Failed to load leaderboard.</p>';
    }
}


// --- Notification System ---
let notificationTimeout;
function showNotification(message, type = 'info') {
    const notification = document.getElementById('achievements'); // Using the achievements div for notifications
    notification.textContent = message;
    notification.className = `achievements ${type}`; // Add type class for styling (e.g., success, error, warning, info)
    notification.style.display = 'block';

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notification.style.display = 'none';
        notification.textContent = '';
        notification.className = 'achievements';
    }, 5000); // Hide after 5 seconds
}

function hideNotifications() {
    const notification = document.getElementById('achievements');
    notification.style.display = 'none';
    notification.textContent = '';
    notification.className = 'achievements';
    clearTimeout(notificationTimeout);
}


// --- Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Profile section listeners
    DOMElements.skillsInput.addEventListener('input', handleSkillsInput);
    DOMElements.photoInput.addEventListener('change', handlePhotoInputChange);
    DOMElements.skillsForm.addEventListener('submit', handleProfileSubmit);

    // Autocomplete setups
    setupAutocomplete(DOMElements.skillsInput, DOMElements.autocompleteSkillsInput);
    setupAutocomplete(DOMElements.teamSkillsInput, DOMElements.autocompleteTeamSkills);
    setupAutocomplete(DOMElements.teamBuilderSkillsInput, DOMElements.autocompleteTeamsSkills);


    // Search & Team Builder listeners
    DOMElements.findTeamBtn.addEventListener('click', findMatchingUsers);
    DOMElements.searchNameBtn.addEventListener('click', searchUserByName);
    // Note: buildBestTeam is already global via window.buildBestTeam = function() {}

    // Modal listeners
    if (DOMElements.endorseModalClose) {
        DOMElements.endorseModalClose.addEventListener('click', () => {
            DOMElements.endorseModal.style.display = 'none';
        });
    }
    // Close modal if user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === DOMElements.endorseModal) {
            DOMElements.endorseModal.style.display = 'none';
        }
    });

    // --- NEW: Event Delegation for Endorse Buttons ---
    // Attach ONE listener to the main card container
    DOMElements.cardContainer.addEventListener('click', async (event) => {
        const endorseButton = event.target.closest('.endorse-btn');
        if (endorseButton && !endorseButton.disabled) {
            const emailToEndorse = endorseButton.dataset.email;
            const { data, error } = await supabaseClient.from('skills').select('*').eq('email', emailToEndorse).single();
            if (error || !data) {
                console.error("Error fetching user for endorsement modal:", error);
                showNotification("Could not load user's skills for endorsement.", "error");
                return;
            }
            showEndorseSkillModal(data.email, data.first_name, data.last_name, data.skills);
        }
    });

    // Attach ONE listener to the best team card container
    DOMElements.bestTeamContainer.addEventListener('click', async (event) => {
        const endorseButton = event.target.closest('.endorse-btn');
        if (endorseButton && !endorseButton.disabled) {
            const emailToEndorse = endorseButton.dataset.email;
            const { data, error } = await supabaseClient.from('skills').select('*').eq('email', emailToEndorse).single();
            if (error || !data) {
                console.error("Error fetching user for endorsement modal:", error);
                showNotification("Could not load user's skills for endorsement.", "error");
                return;
            }
            showEndorseSkillModal(data.email, data.first_name, data.last_name, data.skills);
        }
    });


    // Initial data loads
    fetchUniqueSkills();
    loadLeaderboard();
    updateProfileProgress(); // Initialize progress bar on load
});
document.addEventListener('DOMContentLoaded', () => {
 document.addEventListener('DOMContentLoaded', () => {
  // --- DISCORD CHAT MODAL INTEGRATION WITH TOUCH + PERSISTENCE ---

  const discordButton = document.createElement('div');
  discordButton.id = 'discord-bubble';
  discordButton.innerHTML = `<div id="discord-badge">💬</div>`;
  document.body.appendChild(discordButton);

  const chatModal = document.createElement('div');
  chatModal.id = 'discord-chat-modal';
  chatModal.innerHTML = `
    <div class="chat-header">
      <span>CharlestonHacks Chat</span>
      <button id="close-discord-chat" aria-label="Close chat">×</button>
    </div>
    <iframe 
      src="https://e.widgetbot.io/channels/1365587542975713320/1365587543608188988"
      width="100%" height="100%" frameborder="0"
      allowtransparency="true">
    </iframe>
  `;
  document.body.appendChild(chatModal);

  const closeBtn = chatModal.querySelector('#close-discord-chat');
  closeBtn.onclick = () => chatModal.classList.remove('active');
  discordButton.onclick = () => chatModal.classList.toggle('active');

  const badge = document.createElement('div');
  badge.id = 'discord-notification';
  badge.textContent = 'New!';
  badge.style.display = 'none';
  discordButton.appendChild(badge);
  setTimeout(() => badge.style.display = 'block', 8000);

  // --- DRAGGABLE LOGIC WITH TOUCH AND MEMORY ---
  let isDragging = false, offsetX = 0, offsetY = 0;

  // Load last position
  const saved = JSON.parse(localStorage.getItem('discordBubblePos'));
  if (saved) {
    discordButton.style.left = saved.left;
    discordButton.style.top = saved.top;
    discordButton.style.right = 'auto';
    discordButton.style.bottom = 'auto';
  }

  function savePosition() {
    localStorage.setItem('discordBubblePos', JSON.stringify({
      left: discordButton.style.left,
      top: discordButton.style.top
    }));
  }

  function startDrag(e) {
    isDragging = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    offsetX = clientX - discordButton.offsetLeft;
    offsetY = clientY - discordButton.offsetTop;
    discordButton.style.transition = 'none';
  }

  function drag(e) {
    if (!isDragging) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    discordButton.style.left = `${clientX - offsetX}px`;
    discordButton.style.top = `${clientY - offsetY}px`;
    discordButton.style.right = 'auto';
    discordButton.style.bottom = 'auto';
  }

  function endDrag() {
    isDragging = false;
    savePosition();
    discordButton.style.transition = 'transform 0.2s ease';
  }

  discordButton.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);

  discordButton.addEventListener('touchstart', startDrag, { passive: true });
  document.addEventListener('touchmove', drag, { passive: false });
  document.addEventListener('touchend', endDrag);

  // --- CSS INJECTION ---
  const style = document.createElement('style');
  style.textContent = `
    #discord-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--card-bg, #7289DA);
      color: var(--text-color, white);
      font-size: 22px;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s ease;
      z-index: 1000;
      user-select: none;
    }
    #discord-bubble:active {
      cursor: grabbing;
    }
    #discord-bubble #discord-notification {
      position: absolute;
      top: -5px;
      right: -5px;
      background: red;
      color: white;
      border-radius: 999px;
      font-size: 12px;
      padding: 2px 5px;
    }
    #discord-chat-modal {
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 350px;
      height: 450px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
      z-index: 999;
    }
    #discord-chat-modal.active {
      display: flex;
    }
    .chat-header {
      background: #5865F2;
      color: white;
      padding: 10px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #close-discord-chat {
      background: transparent;
      border: none;
      font-size: 18px;
      color: white;
      cursor: pointer;
    }
    @media (max-width: 768px) {
      #discord-chat-modal {
        width: 100vw;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);
});
