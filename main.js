// main.js

// Supabase Configuration
const SUPABASE_URL = 'https://hvmotpzhliufzomewzfl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2bW90cHpobGl1ZnpvbWV3emZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1NzY2NDUsImV4cCI6MjA1ODE1MjY0NX0.foHTGZVtRjFvxzDfMf1dpp0Zw4XFfD-FPZK-zRnjc6s';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global State (for achievements and potential future features)
const appState = {
    discoveredCards: new Set(),
    achievements: [], // Assuming this will be populated from CONFIG in the full app
    dynamicSkills: [],
    skillProficiencies: {}, // Track proficiency for skills during profile creation
    currentUserEmail: localStorage.getItem("demo_user_email") || '' // Store user email for endorsements
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
    successMessage: document.getElementById('success-message')
};

// --- Utility Functions ---

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
        // Utility: Clean availability values
        const cleanAvailability = (value) => {
            if (value === null || value === undefined) return 'Unavailable';
            if (typeof value !== 'string') return 'Unavailable';
            const trimmed = value.trim();
            if (trimmed === '' || trimmed.toLowerCase() === 'null') return 'Unavailable';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
        };

        // Skill badges
        const skillBadges = user.skills.split(',').map(skill => {
            const match = skill.match(/(.*?)\((.*?)\)/);
            const label = match ? match[1] : skill;
            const prof = match ? match[2] : "Intermediate";
            return `<span class="skill-tag">${label} <span style="font-size:0.8em;opacity:.7;">[${prof}]</span></span>`;
        }).join(' ');

        // Endorsements
        let endorsements = {};
        try {
            endorsements = user.endorsements ? JSON.parse(user.endorsements) : {};
        } catch (e) {
            console.warn(`Error parsing endorsements for user ${user.email}:`, e);
            endorsements = {}; // Fallback to empty object
        }

        const endorsementDisplay = Object.keys(endorsements).length ?
            Object.entries(endorsements).map(([skill, count]) =>
                `<span style="color:var(--primary-color);">${skill}: <span class="endorsements">${count} <i class="fa fa-thumbs-up" aria-hidden="true"></i></span></span>`
            ).join(' | ') :
            '<span style="color:#888;">No endorsements yet</span>';

        const isCurrentUser = user.email === appState.currentUserEmail;

        return `
            <div class="team-member-card" role="listitem">
                ${user.image_url ? `<img src="${user.image_url}" alt="${user.first_name} ${user.last_name}" loading="lazy" />` : ''}
                <div class="member-name">${user.first_name} ${user.last_name}</div>
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
    }).join('');

    container.innerHTML = cardsHtml;

    // Attach event listeners for endorse buttons using event delegation
    container.querySelectorAll('.endorse-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const emailToEndorse = event.currentTarget.dataset.email;
            endorseSkill(emailToEndorse);
        });
    });
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
 * Endorses a skill for a given user.
 * @param {string} email - The email of the user to endorse.
 */
window.endorseSkill = async function(email) {
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

    if (email === appState.currentUserEmail) {
        showNotification("You cannot endorse yourself.", "warning");
        return;
    }

    try {
        const { data, error } = await supabaseClient.from('skills').select('*').eq('email', email);
        if (error || !data || !data.length) throw new Error("User not found or database error.");

        let user = data[0];
        let endorsements = {};
        try {
            endorsements = user.endorsements ? JSON.parse(user.endorsements) : {};
        } catch (e) {
            console.warn(`Error parsing existing endorsements for ${email}:`, e);
            endorsements = {};
        }

        // Increment endorsement for the first skill listed by the user
        const primarySkill = user.skills.split(',')[0].replace(/\(.*?\)/, '').trim();
        if (primarySkill) {
            endorsements[primarySkill] = (endorsements[primarySkill] || 0) + 1;
        } else {
            showNotification("No primary skill found for endorsement.", "warning");
            return;
        }

        const { error: updateError } = await supabaseClient.from('skills').update({ endorsements: JSON.stringify(endorsements) }).eq('email', email);
        if (updateError) throw updateError;

        showNotification("Skill endorsed successfully! Refresh to see the update.", "success");
        loadLeaderboard(); // Update leaderboard after endorsement
        // Re-render the specific card to show updated endorsement count without full page refresh
        const cardElement = document.querySelector(`.team-member-card button[data-email="${email}"]`).closest('.team-member-card');
        if (cardElement) {
            // A more efficient way would be to update just the endorsement section
            // For now, re-render the whole user card by fetching updated data for just this user
            const updatedUserData = await supabaseClient.from('skills').select('*').eq('email', email).single();
            if (updatedUserData.data) {
                // Remove old card and insert new one. This is a bit heavy, but simple for demo.
                // For production, you'd want to selectively update the DOM.
                cardElement.outerHTML = await generateUserCardHTML(updatedUserData.data);
                // Reattach event listeners for the new button
                document.querySelector(`.team-member-card button[data-email="${email}"]`).addEventListener('click', (event) => {
                    const emailToEndorse = event.currentTarget.dataset.email;
                    endorseSkill(emailToEndorse);
                });
            }
        }

    } catch (error) {
        console.error("Endorsement error:", error);
        showNotification(`Failed to endorse: ${error.message}`, 'error');
    }
};

/**
 * Generates HTML for a single user card. (Helper for selective re-rendering)
 * @param {Object} user - User data object.
 * @returns {string} HTML string for the user card.
 */
async function generateUserCardHTML(user) {
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
 * Loads and displays the top endorsed skills leaderboard.
 */
async function loadLeaderboard() {
    try {
        const { data, error } = await supabaseClient.from('skills').select('*');
        if (error || !data) throw error;

        let aggregate = {};
        for (let user of data) {
            let end = {};
            try {
                end = user.endorsements ? JSON.parse(user.endorsements) : {};
            } catch (e) {
                console.warn(`Error parsing endorsements for user ${user.email} in leaderboard:`, e);
                end = {};
            }
            for (let [skill, count] of Object.entries(end)) {
                aggregate[skill] = (aggregate[skill] || 0) + count;
            }
        }

        const topSkills = Object.entries(aggregate).sort((a, b) => b[1] - a[1]).slice(0, 5);

        if (topSkills.length) {
            const rowsHtml = topSkills.map(([skill, count], i) => `
                <div class="leaderboard-row">
                    <span class="leaderboard-rank">#${i + 1}</span>
                    <span class="leaderboard-name">${skill}</span>
                    <span class="leaderboard-skill">${count} <i class="fa fa-thumbs-up" aria-hidden="true"></i></span>
                </div>
            `).join('');
            DOMElements.leaderboardRows.innerHTML = rowsHtml;
            DOMElements.leaderboardSection.style.display = 'block';
        } else {
            DOMElements.leaderboardSection.style.display = 'none';
            DOMElements.leaderboardRows.innerHTML = '<div>No endorsements yet.</div>'; // Optional: show message if no endorsements
        }
    } catch (error) {
        console.error("Error loading leaderboard:", error);
        DOMElements.leaderboardSection.style.display = 'none';
        showNotification('Failed to load leaderboard.', 'error');
    }
}

/**
 * Displays a temporary notification message to the user.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'warning'|'info'} type - The type of notification.
 */
function showNotification(message, type = 'info') {
    let notificationElement;
    if (type === 'success') {
        notificationElement = DOMElements.successMessage;
    } else if (type === 'error' || type === 'warning') {
        notificationElement = DOMElements.noResults;
    } else { // info
        notificationElement = DOMElements.matchNotification;
    }

    // Reset all notification displays
    hideNotifications();

    notificationElement.textContent = message;
    notificationElement.className = `notification ${type}-notification`;
    notificationElement.style.display = 'block';

    setTimeout(() => {
        notificationElement.style.display = 'none';
    }, 5000); // Hide after 5 seconds
}

/**
 * Hides all notification elements.
 */
function hideNotifications() {
    DOMElements.successMessage.style.display = 'none';
    DOMElements.noResults.style.display = 'none';
    DOMElements.matchNotification.style.display = 'none';
}


// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    // Prompt for user email if not set for endorsement demo
    if (!appState.currentUserEmail) {
        const userEmailPrompt = prompt("Welcome! Please enter your email to enable endorsement features (e.g., yourname@example.com):");
        if (userEmailPrompt) {
            appState.currentUserEmail = userEmailPrompt.trim();
            localStorage.setItem("demo_user_email", appState.currentUserEmail);
        }
    }

    // Initialize event listeners for profile form inputs
    Object.values(DOMElements).forEach(el => {
        if (el && el.tagName && (el.tagName === 'INPUT' || el.tagName === 'SELECT') && el.closest('#skills-form')) {
            el.addEventListener("input", updateProfileProgress);
        }
    });

    DOMElements.skillsInput.addEventListener('input', handleSkillsInput);
    DOMElements.photoInput.addEventListener('change', handlePhotoInputChange);
    DOMElements.skillsForm.addEventListener('submit', handleProfileSubmit);

    // Setup autocomplete for all relevant inputs
    await fetchUniqueSkills(); // Fetch skills once at the start
    setupAutocomplete(DOMElements.skillsInput, DOMElements.autocompleteSkillsInput);
    setupAutocomplete(DOMElements.teamSkillsInput, DOMElements.autocompleteTeamSkills);
    setupAutocomplete(DOMElements.teamBuilderSkillsInput, DOMElements.autocompleteTeamsSkills);

    // Event listeners for search and team builder buttons
    DOMElements.findTeamBtn.addEventListener('click', findMatchingUsers);
    DOMElements.searchNameBtn.addEventListener('click', searchUserByName);

    // Initial load of leaderboard
    loadLeaderboard();
});

// The rest of your existing CharlestonHacks scripts for progress, achievements, countdown, etc.
// Assuming they are located in the main.js or separate files as well.
// For example:
/*
const CONFIG = {
    countdown: {
        targetDate: "June 28, 2025 00:00:00",
        completedMessage: "Next Event Soon!",
    },
    achievements: [
        { id: 'first_flip', name: 'Card Flipper', description: 'Flipped your first card!' },
        { id: 'explorer', name: 'Explorer', description: 'Discovered 2 sections!' },
        { id: 'completionist', name: 'Completionist', description: 'Found all sections!' },
        { id: 'social_butterfly', name: 'Social Butterfly', description: 'Clicked a social link!' }
    ],
    // ... other card configurations
};

// Example achievement display function (adapt from your original code)
function showAchievement(id) {
    const achievement = CONFIG.achievements.find(a => a.id === id);
    if (achievement && !appState.discoveredCards.has(id)) {
        appState.discoveredCards.add(id);
        const achievementDiv = document.createElement('div');
        achievementDiv.className = 'achievement';
        achievementDiv.textContent = `Achievement Unlocked: ${achievement.name} - ${achievement.description}`;
        DOMElements.achievementsContainer.appendChild(achievementDiv); // Assuming you add DOMElements.achievementsContainer
        setTimeout(() => achievementDiv.classList.add('show'), 10);
        setTimeout(() => achievementDiv.classList.remove('show'), 5000);
        setTimeout(() => achievementDiv.remove(), 5500);
    }
}

// Example countdown logic (adapt from your original code)
function updateCountdown() {
    const targetDate = new Date(CONFIG.countdown.targetDate).getTime();
    const now = new Date().getTime();
    const distance = targetDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const countdownElement = document.getElementById('countdown'); // Assuming you have this element
    const countdownLabelElement = document.getElementById('countdown-label'); // Assuming you have this element

    if (distance < 0) {
        clearInterval(countdownInterval);
        if (countdownElement) countdownElement.textContent = CONFIG.countdown.completedMessage;
        if (countdownLabelElement) countdownLabelElement.style.display = 'none';
    } else {
        if (countdownElement) countdownElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
}
const countdownInterval = setInterval(updateCountdown, 1000);
updateCountdown(); // Initial call to display immediately
*/
