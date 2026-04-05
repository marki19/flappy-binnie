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

  const loginModal = document.getElementById("login-modal");
  const modalInput = document.getElementById("modal-username-input");
  const modalSubmit = document.getElementById("modal-login-btn");
  const modalGuest = document.getElementById("modal-guest-btn");

  const sidebar = document.getElementById("sidebar");
  const closeSidebarBtn = document.getElementById("close-sidebar");
  const usernameInput = document.getElementById("username-input");

  const lbSidebar = document.getElementById("leaderboard-sidebar");
  const lbCloseBtn = document.getElementById("close-leaderboard");
  const lbList = document.getElementById("leaderboard-list");
  let leaderboardUnsubscribe = null;

  const performCloudLogin = async (playerName) => {
    if (modalSubmit) modalSubmit.innerText = "LOADING...";
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
        modalSubmit.onclick = () => {
          const typedName = modalInput.value.trim();
          if (typedName) performCloudLogin(typedName);
        };
      if (modalGuest)
        modalGuest.onclick = () => {
          let guestName = "Guest_" + Math.floor(Math.random() * 1000);
          performCloudLogin(guestName);
        };
    } else {
      performCloudLogin(savedName);
    }

    setTimeout(() => {
      const toggleBgmBtn = document.getElementById("toggle-bgm");
      const toggleSfxBtn = document.getElementById("toggle-sfx");
      const volumeSlider = document.getElementById("volume-slider");

      if (toggleBgmBtn)
        toggleBgmBtn.onclick = () => {
          game.settings.bgm = !game.settings.bgm;
          toggleBgmBtn.innerText = game.settings.bgm
            ? "🎵 Music: ON"
            : "🎵 Music: OFF";
          game.applySettings();
        };
      if (toggleSfxBtn)
        toggleSfxBtn.onclick = () => {
          game.settings.sfx = !game.settings.sfx;
          toggleSfxBtn.innerText = game.settings.sfx
            ? "🔊 SFX: ON"
            : "🔊 SFX: OFF";
          game.applySettings();
          game.playSFX("flap");
        };
      if (volumeSlider)
        volumeSlider.oninput = (e) => {
          game.settings.volume = parseFloat(e.target.value);
          game.applySettings();
        };
    }, 500);
  });

  if (closeSidebarBtn)
    closeSidebarBtn.onclick = () => sidebar.classList.remove("open");

  // --- CLEAN AUTOMATIC RENAME / SWITCH LOGIC ---
  if (usernameInput) {
    let isSaving = false;

    const handleAutoRename = async () => {
      if (!game || isSaving) return;
      const newName = usernameInput.value.trim().replace(/[\/\\]/g, "");
      const oldName = game.username;

      if (!newName || newName === oldName) return;
      isSaving = true;

      const loginStatus = document.getElementById("login-status");
      if (loginStatus) loginStatus.innerText = "Syncing profile... 📡";

      // CRITICAL: Update local memory IDs immediately to block background saves from re-creating the old name.
      game.username = newName;
      localStorage.setItem("fb_username", newName);

      try {
        const newUserRef = doc(db, "users", newName);
        const docSnap = await getDoc(newUserRef);

        if (docSnap.exists()) {
          // SCENARIO A: Switch to existing account
          const cloudData = docSnap.data();
          game.updatePlayerData(newName, cloudData);
        } else {
          // SCENARIO B: Rename to new name (Copy & Delete)
          await setDoc(
            newUserRef,
            {
              username: newName,
              highScore: game.highScore || 0,
              coins: game.coins || 0,
              unlockedAchievements: game.unlockedAchievements || [],
              lastPlayed: new Date(),
            },
            { merge: true },
          );

          // FIX: Deletion now fires for ALL names, including previous Guest names
          if (oldName && oldName.trim() !== "") {
            try {
              await deleteDoc(doc(db, "users", oldName));
            } catch (delErr) {
              console.warn("Old doc already deleted.");
            }
          }
        }
        if (loginStatus) loginStatus.innerText = "Playing as: " + newName;
      } catch (e) {
        console.error("Rename Error:", e);
        if (loginStatus) loginStatus.innerText = "Error syncing!";
      }
      isSaving = false;
    };

    usernameInput.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        usernameInput.blur();
      }
    };
    usernameInput.onblur = handleAutoRename;
  }

  window.openLeaderboard = () => {
    if (sidebar) sidebar.classList.remove("open");
    if (lbSidebar) lbSidebar.classList.add("open");
    if (leaderboardUnsubscribe) leaderboardUnsubscribe();
    leaderboardUnsubscribe = subscribeToLeaderboard(50, (data) => {
      if (lbList) {
        lbList.innerHTML = "";
        data.forEach((player, index) => {
          let rank = index + 1;
          let crown =
            rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
          let item = document.createElement("div");
          item.className = "leaderboard-item";
          if (player.username === localStorage.getItem("fb_username"))
            item.style.background = "#ffce00";
          item.innerHTML = `<div class="lb-rank">#${rank}</div><div class="lb-name">${player.username || "Unknown"}</div><div class="lb-score"><span>${crown}</span> ${player.highScore || 0}</div>`;
          lbList.appendChild(item);
        });
      }
    });
  };

  const closeLB = () => {
    if (lbSidebar) lbSidebar.classList.remove("open");
    if (leaderboardUnsubscribe) {
      leaderboardUnsubscribe();
      leaderboardUnsubscribe = null;
    }
  };
  if (lbCloseBtn) lbCloseBtn.onclick = closeLB;

  window.addEventListener("mousedown", (e) => {
    ["login-modal", "achievements-modal", "shop-modal"].forEach((id) => {
      let m = document.getElementById(id);
      if (m && e.target === m) m.classList.add("hidden");
    });
    if (
      sidebar &&
      sidebar.classList.contains("open") &&
      !sidebar.contains(e.target)
    )
      sidebar.classList.remove("open");
    if (
      lbSidebar &&
      lbSidebar.classList.contains("open") &&
      !lbSidebar.contains(e.target)
    )
      closeLB();
  });

  if ("serviceWorker" in navigator)
    navigator.serviceWorker.register("./sw.js").catch(() => {});
};
