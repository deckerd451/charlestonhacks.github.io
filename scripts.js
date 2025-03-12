<!-- Add the Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.6.4/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.4/firebase-functions.js"></script>

<script>
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyCx5OFv-85IyMXDKL0ib9rqFE2d4cpmJkQ",
    authDomain: "charlestonhacksmatchmaking.firebaseapp.com",
    projectId: "charlestonhacksmatchmaking",
    storageBucket: "charlestonhacksmatchmaking.firebasestorage.app",
    messagingSenderId: "379090911124",
    appId: "1:379090911124:web:fce5d87e9f52054d6f9981",
    measurementId: "YOUR_FIREBASE_MEASUREMENT_ID"
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
      })
      .catch((error) => {
        console.error('Error adding user to Mailchimp:', error);
        // Optionally, show an error message to the user
      });
  });

  // Function to fetch users from Mailchimp based on keywords
  async function fetchMailchimpUsers(keywords) {
    try {
      const response = await fetch('MAILCHIMP_API_ENDPOINT', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_MAILCHIMP_API_KEY'
        },
        body: JSON.stringify({ keywords })
      });
      const data = await response.json();
      return data.users;
    } catch (error) {
      console.error('Error fetching users from Mailchimp:', error);
      return [];
    }
  }

  // Display matched user cards
  function displayUserCards(users) {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = ''; // Clear previous cards

    users.forEach(user => {
      const card = document.createElement("a");
      card.href = user.link;
      card.innerHTML = `<img src="${user.img}" alt="${user.name}" />`;
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

    const users = await fetchMailchimpUsers(keywords);
    displayUserCards(users);
  }
</script>
