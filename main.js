// --- Supabase Client Initialization ---
// REPLACE WITH YOUR ACTUAL SUPABASE PROJECT URL AND ANON KEY
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL'; // e.g., 'https://yourprojectid.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // e.g., 'eyJ...your.anon.key.here...etc'

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const profileForm = document.getElementById('skillsForm'); // The profile creation form
const firstNameInput = document.getElementById('firstName'); // Corrected ID from HTML
const lastNameInput = document.getElementById('lastName'); // Corrected ID from HTML
const emailInput = document.getElementById('email');
const skillsInputMain = document.getElementById('skillsInputMain'); // Main profile skills input
const skillsProficiencyContainer = document.getElementById('skillsProficiencyContainer');
const photoInput = document.getElementById('photoInput'); // Corrected ID from HTML
const photoPreview = document.getElementById('imagePreview'); // Corrected ID from HTML
const bioInput = document.getElementById('bioInput');
const availabilityInput = document.getElementById('availabilityInput');
const registerButton = profileForm.querySelector('button[type="submit"]'); // The form submit button
const profileProgressBar = document.getElementById('profileProgress'); // Corrected ID from HTML
const profileProgressText = document.getElementById('profileProgressText'); // Corrected ID from HTML
const successMessage = document.getElementById('success-message'); // Ensure you add this div in HTML or remove
const achievementsContainer = document.getElementById('achievements');

// Search and Team Builder Elements
const searchSkillsInput = document.getElementById('searchSkills');
const searchNameInput = document.getElementById('searchName');
const teamSkillsInput = document.getElementById('teamSkills');
const teamSizeInput = document.getElementById('teamSize');
const buildTeamButton = document.getElementById('buildTeam');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const leaderboardSection = document.getElementById('leaderboardSection');
const leaderboardRows = document.getElementById('leaderboardRows');


// --- Global User Variable ---
let currentUser = null;
let currentProfile = null; // Stores the user's profile data

// --- Dummy Data (for testing before Supabase population) ---
let allUsers = []; // This will eventually be populated from Supabase


// --- Achievement Display ---
function showAchievement(message) {
    const achievementDiv = document.createElement('div');
    achievementDiv.className = 'achievement';
    achievementDiv.textContent = message;
    achievementsContainer.appendChild(achievementDiv);

    void achievementDiv.offsetWidth; // Trigger reflow to ensure animation
    achievementDiv.classList.add('show');

    setTimeout(() => {
        achievementDiv.classList.remove('show');
        achievementDiv.addEventListener('transitionend', () => {
            achievementDiv.remove();
        }, { once: true });
    }, 5000); // Hide after 5 seconds
}


// --- Authentication Functions ---

/**
 * Handles user sign-up.
 */
async function signUpUser(email, password, firstName, lastName) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            console.log('Signed up user:', data.user);
            showAchievement('Welcome! Please check your email to verify your account.');

            // Automatically attempt to save initial profile data
            await saveProfile(data.user.id, {
                first_name: firstName,
                last_name: lastName,
                email: email,
                availability: availabilityInput.value || 'Available',
                bio: bioInput.value || '',
                skills: [] // Start with empty skills
            });

            checkUserSession(); // Update UI for logged-in state
        }
    } catch (error) {
        console.error('Signup error:', error.message);
        alert('Signup failed: ' + error.message);
    }
}

/**
 * Handles user sign-in.
 */
async function signInUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        console.log('Signed in user:', data.user);
        showAchievement('Welcome back!');
        checkUserSession(); // Update UI for logged-in state
    } catch (error) {
        console.error('Signin error:', error.message);
        alert('Login failed: ' + error.message);
    }
}

/**
 * Handles user sign-out.
 */
async function signOutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        console.log('User signed out.');
        showAchievement('You have been signed out.');
        currentUser = null;
        currentProfile = null;
        updateAuthUI(); // Reset UI
        clearProfileForm(); // Clear the form
        // Also clear search results and other user-specific data
        resultsContainer.innerHTML = '';
        resultsSection.style.display = 'none';
    } catch (error) {
        console.error('Signout error:', error.message);
        alert('Signout failed: ' + error.message);
    }
}


/**
 * Fetches the current user session and updates the UI accordingly.
 */
async function checkUserSession() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) throw error;

        currentUser = user;
        updateAuthUI();

        if (currentUser) {
            await loadProfile(currentUser.id); // Load profile if logged in
            await fetchAllUsers(); // Fetch all users (excluding current) for search/team builder
        } else {
            clearProfileForm(); // Clear form if logged out
            allUsers = []; // Clear other users data
        }

    } catch (error) {
        console.error('Error checking user session:', error.message);
        currentUser = null; // Ensure user is null on error
        updateAuthUI();
    }
}

/**
 * Updates the UI based on the user's authentication status.
 */
function updateAuthUI() {
    let authStatusElement = document.getElementById('auth-status');
    if (!authStatusElement) {
        authStatusElement = document.createElement('div');
        authStatusElement.id = 'auth-status';
        authStatusElement.style.marginTop = '20px';
        authStatusElement.style.textAlign = 'center';
        document.querySelector('.header').appendChild(authStatusElement); // Append to header
    }

    if (currentUser) {
        authStatusElement.innerHTML = `
            <p>Logged in as: <span style="color: var(--primary); font-weight: bold;">${currentUser.email}</span></p>
            <button id="sign-out-btn" class="btn btn-outline" type="button" style="margin-top: 10px;">Sign Out</button>
        `;
        document.getElementById('sign-out-btn').addEventListener('click', signOutUser);
        registerButton.textContent = 'Save Profile Changes'; // Change button text
        emailInput.disabled = true; // Prevent changing email on edit
    } else {
        authStatusElement.innerHTML = `
            <p>You are not logged in.</p>
            <button id="sign-in-prompt-btn" class="btn btn-primary" type="button" style="margin-top: 10px;">Sign Up / Log In</button>
        `;
        document.getElementById('sign-in-prompt-btn').addEventListener('click', promptForAuth);
        registerButton.textContent = 'Create Profile';
        emailInput.disabled = false;
    }
}

/**
 * Prompts the user to sign up or log in.
 */
function promptForAuth() {
    const action = prompt("Do you want to Sign Up or Log In? (type 'signup' or 'login')").toLowerCase();
    if (!action) return;

    const email = prompt("Enter your email:");
    const password = prompt("Enter your password:");

    if (!email || !password) {
        alert("Email and password are required.");
        return;
    }

    if (action === 'signup') {
        const firstName = prompt("Enter your first name:");
        const lastName = prompt("Enter your last name:");
        if (!firstName || !lastName) {
             alert("First and last name are required for signup.");
             return;
        }
        signUpUser(email, password, firstName, lastName);
    } else if (action === 'login') {
        signInUser(email, password);
    } else {
        alert("Invalid action. Please type 'signup' or 'login'.");
    }
}

// --- Profile Data Handling Functions ---

/**
 * Saves or updates a user's profile data.
 * @param {string} userId - The Supabase user ID.
 * @param {object} profileData - The profile data object.
 */
async function saveProfile(userId, profileData) {
    try {
        const { data: existingProfile, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means "no rows found"
            throw fetchError;
        }

        let dbOperation;
        if (existingProfile) {
            dbOperation = supabase
                .from('profiles')
                .update(profileData)
                .eq('user_id', userId)
                .select();
        } else {
            dbOperation = supabase
                .from('profiles')
                .insert({ user_id: userId, ...profileData })
                .select();
        }

        const { data, error } = await dbOperation;

        if (error) throw error;

        console.log('Profile saved successfully:', data);
        currentProfile = data[0]; // Store the saved profile
        showAchievement('Profile saved!');
        // Assuming you have a div with id="successMessage" for this
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = existingProfile ? 'Profile updated successfully!' : 'Profile created successfully!';
            successDiv.style.display = 'block';
            setTimeout(() => successDiv.style.display = 'none', 3000);
        }

    } catch (error) {
        console.error('Error saving profile:', error.message);
        alert('Failed to save profile: ' + error.message);
    }
}

/**
 * Loads a user's profile data into the form.
 * @param {string} userId - The Supabase user ID.
 */
async function loadProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            currentProfile = data;
            firstNameInput.value = data.first_name || '';
            lastNameInput.value = data.last_name || '';
            emailInput.value = data.email || currentUser.email || '';
            bioInput.value = data.bio || '';
            availabilityInput.value = data.availability || 'Available';

            if (data.skills && Array.isArray(data.skills)) {
                skillsInputMain.value = data.skills.map(s => s.name).join(', ');
                // In Step 2, we'll re-render the proficiency inputs here
            } else {
                skillsInputMain.value = '';
            }

            if (data.avatar_url) {
                photoPreview.src = data.avatar_url;
                photoPreview.style.display = 'block';
            } else {
                photoPreview.style.display = 'none';
                photoPreview.src = '#';
            }
            updateProfileProgressBar();
        } else {
            clearProfileForm();
            showAchievement('Please complete your profile!');
        }

    } catch (error) {
        console.error('Error loading profile:', error.message);
        alert('Failed to load profile: ' + error.message);
        clearProfileForm();
    }
}

/**
 * Clears the profile form fields.
 */
function clearProfileForm() {
    firstNameInput.value = '';
    lastNameInput.value = '';
    emailInput.value = '';
    skillsInputMain.value = '';
    skillsProficiencyContainer.innerHTML = '';
    bioInput.value = '';
    availabilityInput.value = 'Available';
    photoInput.value = '';
    photoPreview.src = '#';
    photoPreview.style.display = 'none';
    registerButton.textContent = 'Create Profile';
    emailInput.disabled = false;
    updateProfileProgressBar();
}

/**
 * Calculates and updates the profile completion progress bar.
 */
function updateProfileProgressBar() {
    let completedFields = 0;
    const totalFields = 5; // firstName, lastName, email, skills, photo

    if (firstNameInput.value.trim() !== '') completedFields++;
    if (lastNameInput.value.trim() !== '') completedFields++;
    if (emailInput.value.trim() !== '' && emailInput.checkValidity()) completedFields++;
    if (skillsInputMain.value.trim() !== '') completedFields++;
    if (photoInput.files.length > 0 || (currentProfile && currentProfile.avatar_url)) completedFields++;

    const progressPercentage = (completedFields / totalFields) * 100;
    profileProgressBar.style.width = `${progressPercentage}%`;

    if (profileProgressText) { // Check if element exists
        if (progressPercentage >= 100) {
            profileProgressText.textContent = 'Profile Complete!';
            profileProgressText.className = 'profile-complete'; // Add a class for styling
        } else {
            profileProgressText.textContent = `Profile ${Math.round(progressPercentage)}% complete.`;
            profileProgressText.className = 'profile-incomplete'; // Add a class for styling
        }
    }
}

// --- User Search & Display Functions ---

/**
 * Fetches all users (excluding the current one) from Supabase.
 */
async function fetchAllUsers() {
    try {
        // Fetch all profiles that are not the current user's profile
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .neq('user_id', currentUser ? currentUser.id : null); // Exclude current user if logged in

        if (error) throw error;
        allUsers = data;
        console.log('All other users fetched:', allUsers);
        // Initially display all available users (if you want) or keep results hidden
        // displayUsers(allUsers);
    } catch (error) {
        console.error('Error fetching all users:', error.message);
    }
}

/**
 * Displays user cards in the results container.
 * @param {Array} usersToDisplay - An array of user objects.
 */
function displayUsers(usersToDisplay) {
    resultsContainer.innerHTML = '';
    if (usersToDisplay.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">No results found.</p>';
        resultsSection.style.display = 'block'; // Ensure section is visible
        return;
    }

    usersToDisplay.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'team-card';
        userCard.innerHTML = `
            <img src="${user.avatar_url || 'https://via.placeholder.com/100?text=No+Photo'}" alt="${user.first_name} ${user.last_name}">
            <h3>${user.first_name} ${user.last_name}</h3>
            <span class="status ${user.availability ? user.availability.toLowerCase().replace(' ', '-') : 'not-specified'}">
                ${user.availability || 'N/A'}
            </span>
            <p>${user.bio || 'No bio provided.'}</p>
            <div class="skill-tags">
                ${(user.skills && Array.isArray(user.skills) ? user.skills.map(s => `<span class="skill-tag">${s.name} (${s.level || 'N/A'})</span>`).join('') : '<span class="skill-tag">No skills listed</span>')}
            </div>
            <button class="btn btn-secondary endorse-btn" data-user-id="${user.id}" style="margin-top: 10px;">Endorse</button>
        `;
        resultsContainer.appendChild(userCard);
    });
    resultsSection.style.display = 'block'; // Show results section
}

/**
 * Performs a search for users by skills.
 * @param {string} skillQuery - The skill(s) to search for.
 */
const searchUsersBySkills = Utils.debounce(async (skillQuery) => {
    if (!currentUser) {
        alert("Please log in to search for people.");
        return;
    }
    if (skillQuery.trim() === '') {
        displayUsers(allUsers); // Show all users if search is cleared
        return;
    }

    const searchTerms = skillQuery.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
    const filteredUsers = allUsers.filter(user => {
        if (!user.skills || !Array.isArray(user.skills)) return false;
        const userSkillNames = user.skills.map(s => s.name.toLowerCase());
        return searchTerms.some(term => userSkillNames.includes(term));
    });
    displayUsers(filteredUsers);
    showAchievement('Skills search performed!');
}, 300); // Debounce for 300ms

/**
 * Performs a search for users by name.
 * @param {string} nameQuery - The name to search for.
 */
const searchUsersByName = Utils.debounce(async (nameQuery) => {
    if (!currentUser) {
        alert("Please log in to search for people.");
        return;
    }
    if (nameQuery.trim() === '') {
        displayUsers(allUsers); // Show all users if search is cleared
        return;
    }

    const queryLower = nameQuery.toLowerCase();
    const filteredUsers = allUsers.filter(user =>
        (user.first_name && user.first_name.toLowerCase().includes(queryLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(queryLower))
    );
    displayUsers(filteredUsers);
    showAchievement('Name search performed!');
}, 300); // Debounce for 300ms


/**
 * Builds a dream team based on required skills and team size.
 */
async function buildBestTeam() {
    if (!currentUser) {
        alert("Please log in to build a team.");
        return;
    }
    const requiredSkillsText = teamSkillsInput.value.trim();
    const teamSize = parseInt(teamSizeInput.value, 10);

    if (!requiredSkillsText || isNaN(teamSize) || teamSize <= 0) {
        alert('Please specify required skills and a valid team size.');
        return;
    }

    const requiredSkills = requiredSkillsText.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

    // Filter available users based on required skills
    let potentialMembers = allUsers.filter(user => {
        if (!user.skills || !Array.isArray(user.skills)) return false;
        const userSkillNames = user.skills.map(s => s.name.toLowerCase());
        return requiredSkills.some(reqSkill => userSkillNames.includes(reqSkill));
    });

    // Sort by number of matching skills (more matching skills first)
    potentialMembers.sort((a, b) => {
        const aMatches = a.skills.filter(s => requiredSkills.includes(s.name.toLowerCase())).length;
        const bMatches = b.skills.filter(s => requiredSkills.includes(s.name.toLowerCase())).length;
        return bMatches - aMatches;
    });

    const selectedTeam = potentialMembers.slice(0, teamSize);
    displayUsers(selectedTeam);
    showAchievement(`Team of ${selectedTeam.length} built!`);
}


// --- Event Listeners ---

// Initialize Supabase Auth Listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    checkUserSession(); // This will trigger profile load and UI update
});

// Profile Form Submission
profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const bio = bioInput.value.trim();
    const availability = availabilityInput.value;
    const skillsText = skillsInputMain.value.trim();
    const skillsArray = skillsText ? skillsText.split(',').map(s => ({ name: s.trim(), level: 'Beginner' })) : []; // Basic skill object for now

    if (!firstName || !lastName || !email) {
        alert('First Name, Last Name, and Email are required.');
        return;
    }
    if (!emailInput.checkValidity()) {
        alert('Please enter a valid email address.');
        return;
    }

    if (!currentUser) {
        const password = prompt("Enter a password for your account:");
        if (!password) {
            alert("Password is required for registration.");
            return;
        }
        await signUpUser(email, password, firstName, lastName);
    } else {
        const profileData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            bio: bio,
            availability: availability,
            skills: skillsArray
        };

        if (photoInput.files.length > 0) {
            const file = photoInput.files[0];
            const fileExtension = file.name.split('.').pop();
            const filePath = `${currentUser.id}/${Date.now()}.${fileExtension}`;

            try {
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                profileData.avatar_url = publicUrlData.publicUrl;
                photoPreview.src = publicUrlData.publicUrl;
                photoPreview.style.display = 'block';

            } catch (error) {
                console.error('Error uploading photo:', error.message);
                alert('Failed to upload photo: ' + error.message);
                return;
            }
        } else if (currentProfile && currentProfile.avatar_url && !photoInput.value) {
            // If there was an existing photo and user didn't upload a new one, keep the old one
            profileData.avatar_url = currentProfile.avatar_url;
        } else if (!currentProfile || !currentProfile.avatar_url) {
            // If no photo uploaded and no existing photo, ensure avatar_url is null
            profileData.avatar_url = null;
        }

        await saveProfile(currentUser.id, profileData);
    }
    updateProfileProgressBar();
});

// Profile photo preview
photoInput.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photoPreview.src = e.target.result;
            photoPreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        photoPreview.src = '#';
        photoPreview.style.display = 'none';
    }
    updateProfileProgressBar();
});

// Update profile progress bar on input change
firstNameInput.addEventListener('input', updateProfileProgressBar);
lastNameInput.addEventListener('input', updateProfileProgressBar);
emailInput.addEventListener('input', updateProfileProgressBar);
skillsInputMain.addEventListener('input', updateProfileProgressBar);
bioInput.addEventListener('input', updateProfileProgressBar);


// Search by Skills (triggers on input change)
searchSkillsInput.addEventListener('input', (event) => {
    searchUsersBySkills(event.target.value);
});

// Search by Name (triggers on input change)
searchNameInput.addEventListener('input', (event) => {
    searchUsersByName(event.target.value);
});

// Build Team button click
buildTeamButton.addEventListener('click', buildBestTeam);


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Check user session on page load
    updateProfileProgressBar(); // Initial calculation
    // You might want to initially display some users or keep the results section hidden.
    // resultsSection.style.display = 'none';
});

// --- Placeholder for Autocomplete functionality ---
// (Your existing autocomplete logic for skillsInputMain, searchSkills, teamSkills)
// You would typically have functions like:
// setupAutocomplete(inputElement, autocompleteListElement, suggestionsArray, onSelectCallback)
// Make sure these are still in your main.js or separate module if you've split them.
