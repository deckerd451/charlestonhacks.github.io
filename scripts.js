<!-- Add the Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.6.4/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.4/firebase-functions.js"></script>

<script>
  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_FIREBASE_AUTH_DOMAIN",
    projectId: "YOUR_FIREBASE_PROJECT_ID",
    storageBucket: "YOUR_FIREBASE_STORAGE_BUCKET",
    messagingSenderId: "YOUR_FIREBASE_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID",
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

  // Add event listener to the matchmaking form
  document.getElementById('matchmaking-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page refresh

    // Get form data for matchmaking
    const skills = document.getElementById('skills').value;
    const location = document.getElementById('location').value;

    // Make a POST request to the backend for matchmaking
    const response = await fetch('/api/matchmake', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ skills, location }),
    });

    const data = await response.json();

    if (data.matches) {
      displayMatches(data.matches);
    } else {
      alert('No matches found');
    }
  });

  // Function to display matches
  function displayMatches(matches) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    matches.forEach((match) => {
      const li = document.createElement('li');
      li.textContent = `Name: ${match.name}, Skills: ${match.skills}, Location: ${match.location}`;
      resultsList.appendChild(li);
    });
  }
</script>
