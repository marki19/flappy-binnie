import { CONFIG } from "./config.js";
import { loadAssets } from "./assets.js";
import { Game } from "./game.js";
import { db, subscribeToLeaderboard } from "./database.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

let game;

window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "30px Courier";
  ctx.textAlign = "center";
  ctx.fillText("Loading Assets...", CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);

  const loginModal = document.getElementById("login-modal");
  const modalInput = document.getElementById("modal-username-input");
  const modalSubmit = document.getElementById("modal-login-btn");
  const modalGuest = document.getElementById("modal-guest-btn");

  const sidebar = document.getElementById("sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar");

  const loginBtn = document.getElementById("login-btn");
  const renameBtn = document.getElementById("rename-btn");
  const usernameInput = document.getElementById("username-input");

  const lbSidebar = document.getElementById("leaderboard-sidebar");
  const lbCloseBtn = document.getElementById("close-leaderboard");
  const lbList = document.getElementById("leaderboard-list");
  let leaderboardUnsubscribe = null;

  const performCloudLogin = async (playerName) => {
    if (modalSubmit) modalSubmit.innerText = "LOADING...";
    if (loginBtn) loginBtn.innerText = "WAIT...";

    let cloudData = null;

    try {
      const userRef = doc(db, "users", playerName);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        cloudData = docSnap.data();
      } else {
        await setDoc(
          userRef,
          { username: playerName, lastPlayed: new Date() },
          { merge: true },
        );
      }
    } catch (e) {
      console.warn("Offline mode.");
    }

    if (loginModal) loginModal.classList.add("hidden");
    localStorage.setItem("fb_username", playerName);
    if (usernameInput) usernameInput.value = playerName;

    const loginStatus = document.getElementById("login-status");
    if (loginStatus) loginStatus.innerText = "Playing as: " + playerName;
    if (loginBtn) loginBtn.innerText = "LOAD";

    if (game) {
      game.updatePlayerData(playerName, cloudData);
    } else {
      game = new Game(canvas, ctx, playerName, cloudData);
    }
  };

  loadAssets(() => {
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
          if (loginModal) loginModal.classList.add("hidden");
          let guestName = "Guest_" + Math.floor(Math.random() * 1000);
          game = new Game(canvas, ctx, guestName, null);
        });
    } else {
      performCloudLogin(savedName);
    }

    setTimeout(() => {
      const toggleBgmBtn = document.getElementById("toggle-bgm");
      const toggleSfxBtn = document.getElementById("toggle-sfx");
      const volumeSlider = document.getElementById("volume-slider");

      if (toggleBgmBtn && game)
        toggleBgmBtn.innerText = game.settings.bgm
          ? "🎵 Music: ON"
          : "🎵 Music: OFF";
      if (toggleSfxBtn && game)
        toggleSfxBtn.innerText = game.settings.sfx
          ? "🔊 SFX: ON"
          : "🔊 SFX: OFF";
      if (volumeSlider && game) volumeSlider.value = game.settings.volume;

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
          if (game) game.playSFX("flap");
        });

      if (volumeSlider)
        volumeSlider.addEventListener("input", (e) => {
          game.settings.volume = parseFloat(e.target.value);
          game.applySettings();
        });
    }, 500);
  });

  if (closeSidebarBtn)
    closeSidebarBtn.addEventListener("click", () =>
      sidebar.classList.remove("open"),
    );

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const typedName = usernameInput.value.trim();
      if (!typedName) return;
      performCloudLogin(typedName);
    });
  }

  if (renameBtn) {
    renameBtn.addEventListener("click", async () => {
      const newName = usernameInput.value.trim();
      const oldName = game.username;

      if (!newName || newName === oldName) return;
      renameBtn.innerText = "SAVING...";

      try {
        await setDoc(
          doc(db, "users", newName),
          {
            username: newName,
            highScore: game.highScore,
            coins: game.coins,
            unlockedAchievements: game.unlockedAchievements,
            lastPlayed: new Date(),
          },
          { merge: true },
        );

        if (oldName && !oldName.startsWith("Guest_")) {
          await deleteDoc(doc(db, "users", oldName));
        }

        localStorage.setItem("fb_username", newName);
        game.username = newName;
        const loginStatus = document.getElementById("login-status");
        if (loginStatus) loginStatus.innerText = "Playing as: " + newName;
        renameBtn.innerText = "RENAME";
      } catch (e) {
        console.error(e);
        renameBtn.innerText = "ERROR";
      }
    });
  }

  const closeLB = () => {
    if (lbSidebar) lbSidebar.classList.remove("open");
    if (leaderboardUnsubscribe) {
      leaderboardUnsubscribe();
      leaderboardUnsubscribe = null;
    }
  };
  if (lbCloseBtn) lbCloseBtn.addEventListener("click", closeLB);

  window.openLeaderboard = () => {
    window.lbJustOpened = true;
    setTimeout(() => {
      window.lbJustOpened = false;
    }, 300);

    // --- UX FIX: Auto-close the profile sidebar when Leaderboard opens ---
    if (sidebar) sidebar.classList.remove("open");

    if (lbSidebar) lbSidebar.classList.add("open");
    if (lbList)
      lbList.innerHTML =
        "<div style='text-align:center; padding: 20px; font-weight:bold; color:#543847;'>Establishing link... 📡</div>";

    if (leaderboardUnsubscribe) leaderboardUnsubscribe();

    if (typeof subscribeToLeaderboard === "function") {
      leaderboardUnsubscribe = subscribeToLeaderboard(50, (data) => {
        if (lbList) lbList.innerHTML = "";
        if (data.length === 0) {
          lbList.innerHTML =
            "<div style='text-align:center; padding: 20px; font-weight:bold;'>No flight data found.</div>";
          return;
        }

        data.forEach((player, index) => {
          let rank = index + 1;
          let crown =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
          let item = document.createElement("div");
          item.className = "leaderboard-item";
          if (player.username === localStorage.getItem("fb_username"))
            item.style.background = "#ffce00";
          item.innerHTML = `<div class="lb-rank">#${rank}</div><div class="lb-name">${player.username || "Unknown"}</div><div class="lb-score"><span class='lb-crown'>${crown}</span> ${player.highScore || 0}</div>`;
          lbList.appendChild(item);
        });
      });
    }
  };

  // --- MOBILE FIX: Handle both Mouse and Touch inputs for closing sidebars ---
  const handleOutsideClick = (e) => {
    ["login-modal", "achievements-modal", "shop-modal"].forEach((id) => {
      let m = document.getElementById(id);
      if (m && e.target === m) m.classList.add("hidden");
    });

    if (
      sidebar &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target)
    ) {
      sidebar.classList.remove("open");
    }
    if (
      lbSidebar &&
      lbSidebar.classList.contains("open") &&
      !lbSidebar.contains(e.target)
    ) {
      if (!window.lbJustOpened) closeLB();
    }
  };

  window.addEventListener("mousedown", handleOutsideClick);
  window.addEventListener("touchstart", handleOutsideClick, { passive: true });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () =>
      navigator.serviceWorker.register("./sw.js").catch(() => {}),
    );
  }
};
