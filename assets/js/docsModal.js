// docsModal.js

export function initDocsModal() {
  document.addEventListener("DOMContentLoaded", () => {
    // support both camelCase and kebab-case IDs
    const modal =
      document.getElementById("docsModal") ||
      document.getElementById("docs-modal");
    const iframe = modal?.querySelector("iframe");
    const closeBtn = modal?.querySelector(".close-btn");
    const testButtons = document.querySelectorAll("[data-docs-url]");

    if (!modal || !iframe || !closeBtn) {
      console.warn("[DocsModal] Elements not found in DOM.");
      return;
    }

    // Open modal
    testButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-docs-url");
        if (url) {
          iframe.src = url;
          modal.classList.remove("hidden");
        }
      });
    });

    // Close modal
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      iframe.src = "";
    });

    // Click backdrop to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
        iframe.src = "";
      }
    });

    console.log("[DocsModal] Initialized");
  });
}

// Auto‑init
initDocsModal();
