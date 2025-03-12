require('dotenv').config();

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};

firebase.initializeApp(firebaseConfig);

const functions = firebase.functions();

// Function to fetch users from Mailchimp based on keywords
async function fetchMailchimpUsers(keywords) {
  try {
    console.log('Calling fetchMailchimpUsers function...');
    const listId = process.env.MAILCHIMP_LIST_ID;
    const apiKey = process.env.MAILCHIMP_API_KEY;
    const dataCenter = process.env.MAILCHIMP_DATA_CENTER;
    const params = new URLSearchParams({
      'fields': 'name,email',
      'segment_text': keywords.join(',')
    });
    const url = `https://us${dataCenter}.api.mailchimp.com/3.0/lists/${listId}/members?${params.toString()}`;
    console.log('API endpoint URL:', url);
    console.log('Keywords:', keywords);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log('API response:', response);
    const data = await response.json();
    console.log('API response data:', data);
    return data.members;
  } catch (error) {
    console.error('Error fetching users from Mailchimp:', error);
    document.getElementById("error-message").innerHTML = "Error fetching users from Mailchimp: " + error.message;
    return [];
  }
}

// Display matched user cards
function displayUserCards(users) {
  const cardContainer = document.getElementById('cardContainer');
  cardContainer.innerHTML = ''; // Clear previous cards

  users.forEach(user => {
    const card = document.createElement("div");
    card.innerHTML = `
      <h2>${user.name}</h2>
      <p>Email: ${user.email_address}</p>
    `;
    card.classList.add("hacker-card");
    cardContainer.appendChild(card);
  });

  // Show the link container if matched cards are displayed
  if (users.length > 0) {
    document.getElementById("link-container").style.display = 'block';
  } else {
    document.getElementById("link-container").style.display = 'none';
  }
}

// Update project skills based on user input
async function updateSkills() {
  try {
    const skillInput = document.getElementById("skillInput").value.toLowerCase();
    const keywords = skillInput.split(',').map(skill => skill.trim());

    if (keywords.length === 0) {
      throw new Error("Please enter some skills to search for.");
    }

    const users = await fetchMailchimpUsers(keywords);
    displayUserCards(users);
  } catch (error) {
    console.error(error);
    document.getElementById("error-message").innerHTML = error.message;
  }
}

// Add event listener to the update skills button
document.getElementById('updateButton').addEventListener('click', updateSkills);
