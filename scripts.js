// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCx5OFv-85IyMXDKL0ib9rqFE2d4cpmJkQ",
  authDomain: "charlestonhacksmatchmaking.firebaseapp.com",
  projectId: "charlestonhacksmatchmaking",
  storageBucket: "charlestonhacksmatchmaking.firebasestorage.app",
  messagingSenderId: "379090911124",
  appId: "1:379090911124:web:fce5d87e9f52054d6f9981",
  measurementId: "YOUR_FIREBASE_MEASUREMENT_ID" // Replace with your actual measurement ID
};

firebase.initializeApp(firebaseConfig);

const functions = firebase.functions();

// Add event listener to the registration form for Mailchimp integration
document.getElementById('registrationForm').addEventListener('submit', (event) => {
  event.preventDefault(); // Prevent the form from submitting normally

  // Get form data
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;

  // Call the Cloud Function for Mailchimp
  const addUserToMailchimp = functions.httpsCallable('addUserToMailchimp');
  addUserToMailchimp({ name, email })
    .then((result) => {
      console.log('User added to Mailchimp:', result.data);
      // Optionally, show a success message to the user
      document.getElementById("success-message").innerHTML = "User added to Mailchimp successfully!";
    })
    .catch((error) => {
      console.error('Error adding user to Mailchimp:', error);
      // Optionally, show an error message to the user
      document.getElementById("error-message").innerHTML = "Error adding user to Mailchimp: " + error.message;
    });
});

// Function to fetch users from Mailchimp based on keywords
async function fetchMailchimpUsers(keywords) {
  try {
    const response = await fetch('https://usX.api.mailchimp.com/3.0/lists/3b95e0177a/members', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer d6a9298c9b01f0348284a918f4afee90-us12'
      },
      params: {
        'fields': 'name,email',
        'segment_text': keywords.join(',')
      }
    });
    const data = await response.json();
    return data.members;
  } catch (error) {
    console.error('Error fetching users from Mailchimp:', error);
    // Optionally, show an error message to the user
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
  const skillInput = document.getElementById("skillInput").value.toLowerCase();
  const keywords = skillInput.split(',').map(skill => skill.trim());

  if (keywords.length === 0) {
    document.getElementById("error-message").innerHTML = "Please enter some skills to search for.";
    return;
  }

  const users = await fetchMailchimpUsers(keywords);
  displayUserCards(users);
}

// Add event listener to the update skills button
document.getElementById('updateButton').addEventListener('click', updateSkills);
