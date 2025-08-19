// /assets/js/main.js — Vanilla + MAGIC LINK auth + suggestions
import { supabaseClient as supabase } from './supabaseClient.js';
import { appState, showNotification } from './globals.js';
import { attachSuggestionsUI } from './matchEngine.js';

document.addEventListener("DOMContentLoaded", () => {
  const body    = document.body;
  const wrapper = document.getElementById("wrapper");
  const nav     = document.getElementById("nav");
  const mainEl  = document.getElementById("main");
  const intro   = document.getElementById("intro");

  const loginBtn  = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const userBadge = document.getElementById('userBadge');

  // ---- Simple page effects (unchanged) ----
  window.addEventListener("load", () => {
    setTimeout(() => body.classList.remove("is-preload"), 100);
  });

  document.querySelectorAll(".scrolly").forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (href && href.startsWith("#")) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });

  function applyParallax(el, intensity = 0.25) {
    if (!el) return;
    const bg = document.createElement("div");
    bg.className = "bg";
    el.appendChild(bg);
    window.addEventListener("scroll", () => {
      const pos = window.scrollY - el.offsetTop;
      bg.style.transform = `translateY(${pos * intensity}px)`;
    });
  }
  if (wrapper) applyParallax(wrapper, 0.925);

  if (wrapper && nav) {
    const navPanel = document.createElement("div");
    navPanel.id = "navPanel";
    navPanel.innerHTML = `<nav>${nav.innerHTML}</nav><a href="#navPanel" class="close"></a>`;
    body.appendChild(navPanel);

    const navPanelToggle = document.createElement("a");
    navPanelToggle.href = "#navPanel";
    navPanelToggle.id = "navPanelToggle";
    navPanelToggle.textContent = "Menu";
    wrapper.appendChild(navPanelToggle);

    navPanelToggle.addEventListener("click", e => {
      e.preventDefault();
      body.classList.toggle("is-navPanel-visible");
    });
    navPanel.querySelector(".close").addEventListener("click", e => {
      e.preventDefault();
      body.classList.remove("is-navPanel-visible");
    });
  }

  if (intro && mainEl) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) intro.classList.add("hidden");
          else                       intro.classList.remove("hidden");
        });
      },
      { root: null, threshold: 0.2 }
    );
    observer.observe(mainEl);
  }

  // -----------------------------
  // AUTH: Magic-link email (Supabase)
  // -----------------------------
  function renderAuth(session) {
    appState.session = session || null;
    const user = session?.user || null;
    const name =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email ||
      '';

    if (user) {
      loginBtn?.setAttribute('hidden', 'true');
      logoutBtn?.removeAttribute('hidden');
      if (userBadge) userBadge.textContent = `Signed in as ${name}`;
    } else {
      logoutBtn?.setAttribute('hidden', 'true');
      loginBtn?.removeAttribute('hidden');
      if (userBadge) userBadge.textContent = '';
    }

    // Rebuild suggestions when auth state changes
    attachSuggestionsUI();
  }

  // 1) On page load, get current session and render UI
  supabase.auth.getSession().then(({ data }) => renderAuth(data?.session));

  // 2) Keep UI in sync with future auth changes (including after redirect)
  supabase.auth.onAuthStateChange((_evt, session) => renderAuth(session));

  // 3) Log in: send a magic link to the user's email
  loginBtn?.addEventListener('click', async () => {
    const email = prompt('Enter your email to get a sign-in link:');
    if (!email) return;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // After the user clicks the email link, they’ll be returned here
          emailRedirectTo: `${location.origin}/dex.html`
        }
      });
      if (error) throw error;
      showNotification('Check your email for the magic link.');
    } catch (e) {
      console.error('[Dex] magic-link error', e);
      showNotification('Could not send the magic link.');
    }
  });

  // 4) Log out
  logoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showNotification('Signed out');
  });

  // Finally, mount initial suggestions (works even if logged out; will update on auth)
  attachSuggestionsUI();
});
