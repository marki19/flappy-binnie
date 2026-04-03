import { CONFIG } from "./config.js";
import { loadAssets } from "./assets.js";
import { Game } from "./game.js";
import { db, getLeaderboardData, subscribeToLeaderboard } from "./database.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let game; // We declare this globally so the Sidebar can talk to the Canvas!

// --- NEW: GENERATE A PERMANENT DEVICE ID ---
const getUID = () => {
  let uid = localStorage.getItem("fb_uid");
  if (!uid) {
    uid = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("fb_uid", uid);
  }
  return uid;
};

// ONLY ONE window.onload HERE!
window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // 1. Setup Canvas Dimensions
  canvas.width = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;
  ctx.imageSmoothingEnabled = false;

  // 2. Draw Loading Screen
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "30px Courier";
  ctx.textAlign = "center";
  ctx.fillText("Loading Assets...", CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);

  // --- UI ELEMENTS ---
  const loginModal = document.getElementById("login-modal");
  const modalInput = document.getElementById("modal-username-input");
  const modalSubmit = document.getElementById("modal-login-btn");
  const modalGuest = document.getElementById("modal-guest-btn");

  const sidebar = document.getElementById("sidebar");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("username-input");
  const loginStatus = document.getElementById("login-status");

  // --- REUSABLE CLOUD LOGIN & RENAME FUNCTION ---
  const performCloudLogin = async (playerName) => {
    if (loginModal) loginModal.classList.add("hidden");
    if (loginBtn) loginBtn.innerText = "LOADING...";

    localStorage.setItem("fb_username", playerName);
    if (usernameInput) usernameInput.value = playerName;
    if (loginStatus) loginStatus.innerText = "Loaded: " + playerName;

    const uid = getUID(); // 1. Grab the hidden device ID!
    let cloudData = null;

    try {
      const userRef = doc(db, "users", uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        cloudData = docSnap.data();
        console.log("Cloud data loaded!");
      }

      await setDoc(
        userRef,
        { username: playerName, lastPlayed: new Date() },
        { merge: true },
      );
    } catch (e) {
      console.warn("Could not reach database, playing offline.");
    }

    if (game) game.updatePlayerData(uid, playerName, cloudData);
    if (loginBtn) loginBtn.innerText = "LOAD DATA";
  };

  // 3. Load Assets, then Boot Game
  loadAssets(() => {
    let initialName = localStorage.getItem("fb_username") || "Guest";
    let initialUid = getUID(); // CRITICAL FIX: GRAB UID HERE

    // Boot up the game safely with UID passed!
    game = new Game(canvas, ctx, initialUid, initialName, null);

    // --- NEW: WIRE UP SIDEBAR AUDIO CONTROLS ---
    const toggleBgmBtn = document.getElementById("toggle-bgm");
    const toggleSfxBtn = document.getElementById("toggle-sfx");
    const volumeSlider = document.getElementById("volume-slider");

    if (toggleBgmBtn)
      toggleBgmBtn.innerText = game.settings.bgm
        ? "🎵 Music: ON"
        : "🎵 Music: OFF";
    if (toggleSfxBtn)
      toggleSfxBtn.innerText = game.settings.sfx ? "🔊 SFX: ON" : "🔊 SFX: OFF";
    if (volumeSlider) volumeSlider.value = game.settings.volume;

    if (toggleBgmBtn)
      toggleBgmBtn.addEventListener("click", () => {
        game.settings.bgm = !game.settings.bgm;
        toggleBgmBtn.innerText = game.settings.bgm
          ? "🎵 Music: ON"
          : "🎵 Music: OFF";
        game.applySettings();
      });

    if (toggleSfxBtn)
      toggleSfxBtn.addEventListener("click", () => {
        game.settings.sfx = !game.settings.sfx;
        toggleSfxBtn.innerText = game.settings.sfx
          ? "🔊 SFX: ON"
          : "🔊 SFX: OFF";
        game.applySettings();
        game.playSFX("flap");
      });

    if (volumeSlider)
      volumeSlider.addEventListener("input", (e) => {
        game.settings.volume = parseFloat(e.target.value);
        game.applySettings();
      });

    let savedName = localStorage.getItem("fb_username");

    if (!savedName) {
      if (loginModal) loginModal.classList.remove("hidden");

      if (modalSubmit)
        modalSubmit.addEventListener("click", () => {
          const typedName = modalInput.value.trim();
          if (typedName) performCloudLogin(typedName);
        });

      if (modalGuest)
        modalGuest.addEventListener("click", () => {
          performCloudLogin("Guest_" + Math.floor(Math.random() * 1000));
        });
    } else {
      performCloudLogin(savedName);
    }
  });

  // --- SIDEBAR UI EVENTS ---
  if (hamburgerBtn)
    hamburgerBtn.addEventListener("click", () => sidebar.classList.add("open"));
  if (closeSidebarBtn)
    closeSidebarBtn.addEventListener("click", () =>
      sidebar.classList.remove("open"),
    );

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const typedName = usernameInput.value.trim();
      if (!typedName) return;
      loginBtn.innerText = "LOADING...";
      performCloudLogin(typedName);
    });
  }

  // --- LEADERBOARD LOGIC ---
  const lbSidebar = document.getElementById("leaderboard-sidebar");
  const lbCloseBtn = document.getElementById("close-leaderboard");
  const lbList = document.getElementById("leaderboard-list");

  let leaderboardUnsubscribe = null; // This holds our "off switch" for the live feed

  // When clicking close, hide the menu AND turn off the live database feed
  if (lbCloseBtn) {
    lbCloseBtn.addEventListener("click", () => {
      lbSidebar.classList.remove("open");
      if (leaderboardUnsubscribe) {
        leaderboardUnsubscribe(); // Stop listening to save Firebase quota!
        leaderboardUnsubscribe = null;
      }
    });
  }

  // When opening, start the live feed!
  window.openLeaderboard = () => {

    window.justOpenedLeaderboard = true;
    setTimeout(() => {
      window.justOpenedLeaderboard = false;
    }, 100);

    if (lbSidebar) lbSidebar.classList.add("open");
    if (lbList)
      lbList.innerHTML =
        "<div style='text-align:center; padding: 20px; font-weight:bold; color:#543847;'>Establishing live satellite uplink... 📡</div>";

    // If there's an old feed running, kill it just in case
    if (leaderboardUnsubscribe) leaderboardUnsubscribe();

    // Start listening to the live database!
    leaderboardUnsubscribe = subscribeToLeaderboard(50, (data) => {
      // THIS CODE RUNS EVERY TIME ANYONE GETS A NEW HIGH SCORE!
      if (lbList) lbList.innerHTML = "";

      if (data.length === 0) {
        lbList.innerHTML =
          "<div style='text-align:center; padding: 20px; font-weight:bold;'>No flight data found.</div>";
        return;
      }

      data.forEach((player, index) => {
        let rank = index + 1;
        let crown = "";
        if (rank === 1) crown = "<span class='lb-crown'>🥇</span>";
        else if (rank === 2) crown = "<span class='lb-crown'>🥈</span>";
        else if (rank === 3) crown = "<span class='lb-crown'>🥉</span>";

        let item = document.createElement("div");
        item.className = "leaderboard-item";

        // Highlight your own name in yellow
        if (player.username === localStorage.getItem("fb_username")) {
          item.style.background = "#ffce00";
        }

        item.innerHTML = `
                <div class="lb-rank">#${rank}</div>
                <div class="lb-name">${player.username || "Unknown Pilot"}</div>
                <div class="lb-score">${crown} ${player.highScore || 0}</div>
            `;
        lbList.appendChild(item);
      });
    });
  };

  // --- SMART INSTALL BANNER LOGIC ---
  let deferredPrompt;
  const installToast = document.getElementById("installToast");
  const toastActionBtn = document.getElementById("toastActionBtn");
  const toastCloseBtn = document.getElementById("toastCloseBtn");
  const toastDesc = document.getElementById("toastDesc");

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  function showInstallBanner() {
    setTimeout(() => {
      if (installToast) {
        installToast.classList.add("show");
        setTimeout(() => {
          installToast.classList.remove("show");
        }, 8000);
      }
    }, 1800);
  }

  if (isIOS) {
    if (toastDesc)
      toastDesc.innerText = "Tap Share ⍐ then 'Add to Home Screen'";
    if (toastActionBtn) toastActionBtn.style.display = "none";
    showInstallBanner();
  } else {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallBanner();
    });

    if (toastActionBtn) {
      toastActionBtn.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`User response: ${outcome}`);
          deferredPrompt = null;
          if (installToast) installToast.classList.remove("show");
        }
      });
    }
  }

  if (toastCloseBtn) {
    toastCloseBtn.addEventListener("click", () => {
      installToast.classList.remove("show");
    });
  }
  // --- CLICK OUTSIDE TO CLOSE LOGIC ---
  window.addEventListener("click", (e) => {
    // 1. Fullscreen Modals (Login, Achievements, Character)
    const modals = ["login-modal", "achievements-modal", "shop-modal"];
    modals.forEach((modalId) => {
      const m = document.getElementById(modalId);
      // If the player clicks the dark background itself (and not the white content box)
      if (m && !m.classList.contains("hidden") && e.target === m) {
        m.classList.add("hidden");
      }
    });

    // 2. Left Sidebar (Settings/Login)
    if (sidebar && sidebar.classList.contains("open")) {
      // If the click is NOT inside the sidebar, and NOT on the hamburger button
      if (!sidebar.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    }

    // 3. Right Sidebar (Leaderboard)
    if (lbSidebar && lbSidebar.classList.contains("open")) {
      // If the click is NOT inside the leaderboard.
      // (We also ignore canvas clicks so clicking the menu button doesn't instantly close it!)
      if (!lbSidebar.contains(e.target) && !window.justOpenedLeaderboard) {
        lbSidebar.classList.remove("open");
      }
    }
  });

  // Register Service Worker for PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => console.log("Service Worker registered!"))
        .catch((err) => console.log("Service Worker failed:", err));
    });
  }
};
