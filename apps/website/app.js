// Where the actual TANKY PWA is served. Update this once deployed
// (e.g. "https://app.tanky.ch") — defaults to the local dev server.
const APP_URL = "http://localhost:8081/(phone)/home";

document.querySelectorAll("[data-open-app]").forEach((el) => {
  el.setAttribute("href", APP_URL);
  el.setAttribute("target", "_blank");
  el.setAttribute("rel", "noopener");
});

const toggleBtn = document.getElementById("toggle-install-steps");
const installSteps = document.getElementById("install-steps");
if (toggleBtn && installSteps) {
  toggleBtn.addEventListener("click", () => {
    const isOpen = installSteps.classList.toggle("is-open");
    toggleBtn.textContent = isOpen ? "Installationsanleitung ausblenden" : "Installationsanleitung anzeigen";
  });
}

document.querySelectorAll(".install-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".install-tab").forEach((t) => t.classList.remove("is-active"));
    document.querySelectorAll(".install-panel").forEach((p) => p.classList.remove("is-active"));
    tab.classList.add("is-active");
    document.querySelector(`.install-panel[data-panel="${tab.dataset.tab}"]`)?.classList.add("is-active");
  });
});
