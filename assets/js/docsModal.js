// /assets/js/docsModal.js
// Handles the Docs Modal separately from the endorsement modal

export function initDocsModal() {
  const docsModal = document.getElementById("docsModal");
  const docsFrame = document.getElementById("docsFrame");
  const docsCloseBtn = document.querySelector(".docs-close-btn");

  if (!docsModal || !docsFrame || !docsCloseBtn) {
    console.warn("[DocsModal] Elements not found in DOM.");
    return;
  }

  // --- Open modal ---
  document.querySelectorAll("[data-docs-url]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const url = btn.getAttribute("data-docs-url");
      if (!url) return;

      docsFrame.src = url;
      docsModal.classList.remove("hidden");
    });
  });

  // --- Close modal ---
  docsCloseBtn.addEventListener("click", () => {
    docsModal.classList.add("hidden");
    docsFrame.src = ""; // reset iframe
  });

  // Close if clicking outside content
  docsModal.addEventListener("click", e => {
    if (e.target === docsModal) {
      docsModal.classList.add("hidden");
      docsFrame.src = "";
    }
  });

  console.log("[DocsModal] Initialized");
}

// Auto-run when DOM is ready
document.addEventListener("DOMContentLoaded", initDocsModal);
