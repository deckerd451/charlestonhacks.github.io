// /assets/js/login.js
import { supabaseClient as supabase } from './supabaseClient.js';

const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginMessage = document.getElementById('login-message');
const profileForm = document.getElementById('skills-form');

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmailInput.value.trim();
  loginMessage.style.display = "none";

  if (!email) return;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/2card.html' }
  });

  if (error) {
    loginMessage.textContent = "Error: " + error.message;
    loginMessage.style.color = "red";
    loginMessage.style.display = "block";
  } else {
    loginMessage.textContent = "Magic link sent! Check your email.";
    loginMessage.style.color = "green";
    loginMessage.style.display = "block";
  }
});

// 🔹 Check session on load
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // already logged in → hide login form, show profile form
    loginForm.style.display = "none";
    loginMessage.style.display = "none";
    profileForm.style.display = "block";
  }
})();
