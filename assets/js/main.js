// /assets/js/main.js - Vanilla rewrite

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const wrapper = document.getElementById("wrapper");
  const header = document.getElementById("header");
  const nav = document.getElementById("nav");
  const main = document.getElementById("main");
  const intro = document.getElementById("intro");

  // --- Play initial animations on page load
  window.addEventListener("load", () => {
    setTimeout(() => {
      body.classList.remove("is-preload");
    }, 100);
  });

  // --- Smooth scroll for links with .scrolly
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

  // --- Simple parallax background for wrapper
  function applyParallax(el, intensity = 0.25) {
    const bg = document.createElement("div");
    bg.className = "bg";
    el.appendChild(bg);

    window.addEventListener("scroll", () => {
      const pos = window.scrollY - el.offsetTop;
      bg.style.transform = `translateY(${pos * intensity}px)`;
    });
  }
  if (wrapper) applyParallax(wrapper, 0.925);

  // --- Nav Panel toggle
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

  // --- Hide intro on scroll
  if (intro && main) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            intro.classList.add("hidden");
          } else {
            intro.classList.remove("hidden");
          }
        });
      },
      { root: null, threshold: 0.2 }
    );
    observer.observe(main);
  }
  import { attachSuggestionsUI } from './matchEngine.js';

// Render suggestions once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  attachSuggestionsUI();
});



