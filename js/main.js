import { CONFIG } from "./config.js";
import { loadAssets } from "./assets.js";
import { Game } from "./game.js";

// Register Service Worker for PWA

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registered!", reg))
      .catch((err) => console.log("Service Worker failed:", err));
  });
}

window.onload = () => {
  const canvas = document.getElementById("gameCanvas");

  // Tell the canvas to use the dimensions we decided in config.js
  canvas.width = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;

  const ctx = canvas.getContext("2d");

  // Disables anti-aliasing on the canvas context for crisp pixel art
  ctx.imageSmoothingEnabled = false;

  // Draw loading screen
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "30px Courier";
  ctx.textAlign = "center";
  ctx.fillText("Loading Assets...", CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);

  // Load assets, then inject canvas into the Game object
  loadAssets(() => {
    new Game(canvas, ctx);
  });
};

// --- SMART INSTALL BANNER LOGIC ---
let deferredPrompt;
const installToast = document.getElementById("installToast");
const toastActionBtn = document.getElementById("toastActionBtn");
const toastCloseBtn = document.getElementById("toastCloseBtn");
const toastDesc = document.getElementById("toastDesc");

// Detect if user is on an Apple device (iOS)
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Helper to slide the banner down
function showInstallBanner() {
  // Small delay so it pops up a second after the game loads
  setTimeout(() => {
    if (installToast) {
      installToast.classList.add("show");

      // THE FIX: Automatically hide the banner after 8 seconds so it doesn't block the game!
      setTimeout(() => {
        installToast.classList.remove("show");
      }, 8000);
    }
  }, 1800);
}

if (isIOS) {
  // --- APPLE DEVICE LOGIC ---
  // iOS blocks the install prompt, so we change the banner text to be a tutorial
  if (toastDesc) toastDesc.innerText = "Tap Share ⍐ then 'Add to Home Screen'";
  if (toastActionBtn) toastActionBtn.style.display = "none"; // Hide the GET button
  showInstallBanner();
} else {
  // --- ANDROID / DESKTOP LOGIC ---
  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome from automatically showing the mini-infobar
    e.preventDefault();
    // Stash the event so we can trigger it later
    deferredPrompt = e;
    // Slide down our custom banner
    showInstallBanner();
  });

  // When they click "GET" on our banner
  if (toastActionBtn) {
    toastActionBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt(); // Show the actual system install popup
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        // Hide our banner
        installToast.classList.remove("show");
      }
    });
  }
}

// Allow user to close the banner if they don't want to install
if (toastCloseBtn) {
  toastCloseBtn.addEventListener("click", () => {
    installToast.classList.remove("show");
  });
}
