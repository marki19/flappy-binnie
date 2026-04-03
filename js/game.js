import { CONFIG } from "./config.js";
import { Assets } from "./assets.js";
import { Bird, Pipe, Coin } from "./sprites.js";
import { CharacterMenu } from "./character.js";
import { AchievementsMenu } from "./achievements.js";
import { audioCtx } from "./assets.js"; // Make sure to add this import at the very top of game.js!
import { savePlayerData } from "./database.js";

export class Game {
  constructor(canvas, ctx, playerName, cloudData) {
    this.canvas = canvas;
    this.ctx = ctx;

    this.username = playerName;

    // Use cloud highscore if it's better than the local one

    const localHigh =
      parseInt(localStorage.getItem("flappyBinnieHighScore")) || 0;
    this.highScore = Math.max(localHigh, cloudData?.highScore || 0);

    // Initialize coins from the cloud (or 0)
    this.coins = cloudData?.coins || 0;

    this.settings = JSON.parse(
      localStorage.getItem("flappyBinnieSettings"),
    ) || { bgm: true, sfx: true, volume: 1 };

    this.wingStyles = [
      "classic",
      "bat",
      "mecha",
      "fairy",
      "demon",
      "angel",
      "dragon",
      "butterfly",
      "bone",
      "crystal",
      "ninja",
      "pirate",
      "zombie",
      "alien",
      "ghost",
      "phoenix",
      "king",
      "cyborg",
      "wizard",
      "god",
    ];

    let savedWing = localStorage.getItem("flappyBinnieWingStyle") || "classic";
    this.wingIndex = this.wingStyles.indexOf(savedWing);
    if (this.wingIndex === -1) this.wingIndex = 0;

    // --- NEW: ACHIEVEMENT TRACKERS ---
    this.unlockedAchievements =
      JSON.parse(localStorage.getItem("flappyBinnieAchievements")) || [];
    this.activeToast = null;
    this.toastTimer = 0;

    this.state = "MENU";
    this.resetGameVars();
    this.bindEvents();
    this.applySettings();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // --- NEW: DYNAMIC DATA INJECTION ---
  // This allows the Sidebar HTML to update the game without refreshing the page!
  updatePlayerData(playerName, cloudData) {
    this.username = playerName;

    const localHigh =
      parseInt(localStorage.getItem("flappyBinnieHighScore")) || 0;
    this.highScore = Math.max(localHigh, cloudData?.highScore || 0);
    this.coins = cloudData?.coins || 0;

    if (cloudData?.unlockedAchievements) {
      this.unlockedAchievements = cloudData.unlockedAchievements;
      localStorage.setItem(
        "flappyBinnieAchievements",
        JSON.stringify(this.unlockedAchievements),
      );
    }
  }

  resetGameVars() {
    this.bird = new Bird();
    this.pipes = [];
    this.coinsList = [];
    this.score = 0;
    this.level = 1;
    this.currentSpeed = CONFIG.PIPE_SPEED;
    this.deathTime = 0;
    this.lastMilestone = 0;
    this.isNewBest = false;
    this.shakeTimer = 0;
    this.groundX = 0;
    this.currentBg = Math.floor(Math.random() * CONFIG.BACKGROUNDS.length);
    this.nextBg = this.currentBg;
    this.bgAlpha = 255;
    this.isFading = false;
    this.currentPipeStyle = Math.floor(Math.random() * 4);
  }

  startFromMenu() {
    let currentX = this.bird.x;
    let currentY = this.bird.y;
    this.resetGameVars();
    this.bird.x = currentX;
    this.bird.y = currentY;

    this.state = "PLAYING";
    this.applySettings();

    this.playSFX("start");
    this.spawnPipes();
    this.bird.flap();
    this.unlockAchievement("first_flap"); // Achievement Check
  }

  prepareRound() {
    this.resetGameVars();
    this.state = "GET_READY";
    this.applySettings();
  }

  resetToMenu() {
    this.state = "MENU";
    this.resetGameVars();
    if (Assets.audio.music) {
      if (this.bgmSource) {
        this.bgmSource.stop();
        this.bgmSource = null;
      }
    }
  }

  applySettings() {
    localStorage.setItem("flappyBinnieSettings", JSON.stringify(this.settings));

    // Play music using our new Web Audio function if enabled
    if (Assets.audio.music) {
      if (
        this.settings.bgm &&
        (this.state === "PLAYING" || this.state === "GET_READY")
      ) {
        if (!this.bgmSource) {
          this.playSFX("music");
        }
      } else {
        // Web Audio API: We stop the active source node
        if (this.bgmSource) {
          try {
            this.bgmSource.stop();
          } catch (e) {}
          this.bgmSource = null;
        }
      }
    }
  }

  // ... later in your game class ...

  playSFX(key) {
    console.log("GAME DEMANDED TO PLAY AUDIO", key);

    // 1. Check if SFX are enabled in settings
    if (this.settings && !this.settings.sfx && key !== "music") return;
    if (this.settings && !this.settings.bgm && key === "music") return;

    let buffer = Assets.audio[key];
    if (buffer) {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      let source = audioCtx.createBufferSource();
      source.buffer = buffer;

      let gainNode = audioCtx.createGain();

      // --- THE TRIM SETTINGS ---
      // 'trimAmount' is how many seconds to skip at the beginning of the file!
      let trimAmount = 0;

      if (key === "music") {
        if (this.bgmSource) {
          try {
            this.bgmSource.stop();
          } catch (e) {}
        }
        gainNode.gain.value = 0.5;
        trimAmount = 1; // Skips first 1 seconds
        source.loop = true;
        this.bgmSource = source;
      } else if (key === "start") {
        gainNode.gain.value = 1.0;
        trimAmount = 0.5; // Skips first 0.2 seconds (Adjust this to fix the delay!)
      } else if (key === "flap") {
        gainNode.gain.value = 0.7;
        trimAmount = 0.05; // Skips a tiny 0.05 seconds to make tapping feel instantly crisp
      } else if (key === "crash") {
        gainNode.gain.value = 1;
        trimAmount = 0.1; // Skips first 0.1 seconds
      } else if (key === "coin") {
        gainNode.gain.value = 5;
        trimAmount = 0.2; // Skips first 0.2 seconds
      } else if (key === "error") {
        gainNode.gain.value = 1.0; // Normal volume
        trimAmount = 0.2; // Play from the very beginning
      }

      if (this.settings && this.settings.volume !== undefined) {
        gainNode.gain.value *= this.settings.volume;
      }

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      // PLAY THE SOUND: start(whenToStart, offsetInSeconds)
      // This plays instantly (0), but starts the file at your trimAmount!
      source.start(0, trimAmount);
    }
  }

  // --- NEW: ACHIEVEMENT ENGINE ---
  unlockAchievement(id) {
    if (!this.unlockedAchievements.includes(id)) {
      this.unlockedAchievements.push(id);
      localStorage.setItem(
        "flappyBinnieAchievements",
        JSON.stringify(this.unlockedAchievements),
      );

      let ach = CONFIG.ACHIEVEMENTS.find((a) => a.id === id);
      if (ach) {
        this.activeToast = ach.name;
        this.toastTimer = 120; // Show toast for 2 seconds (60fps * 2)
        this.playSFX("start"); // Ding sound
      }
    }
  }

  checkLiveAchievements() {
    // FIX: Check whichever is higher—the current run, or the saved high score!
    let best = Math.max(this.score, this.highScore);

    if (best >= 10) this.unlockAchievement("score_10");
    if (best >= 20) this.unlockAchievement("score_20");
    if (best >= 30) this.unlockAchievement("score_30");
    if (best >= 40) this.unlockAchievement("score_40");
    if (best >= 50) this.unlockAchievement("score_50");
    if (best >= 60) this.unlockAchievement("score_60");
    if (best >= 70) this.unlockAchievement("score_70");
    if (best >= 80) this.unlockAchievement("score_80");
    if (best >= 90) this.unlockAchievement("score_90");
    if (best >= 100) this.unlockAchievement("score_100");

    if (this.level >= 5) this.unlockAchievement("max_speed");
    if (localStorage.getItem("flappyBinnieCustomFace"))
      this.unlockAchievement("custom_face");
  }

  spawnPipes() {
    let minY = 200;
    let maxY = CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT - 200;

    if (!this.lastPipeY) {
      this.lastPipeY = (minY + maxY) / 2;
    }

    // --- DYNAMIC DELTA ---
    // If we are on mobile (WIDTH is 450), limit the vertical jump to 130px.
    // If we are on desktop (WIDTH is 1080), allow larger 180px jumps.
    let maxDelta = CONFIG.WIDTH === 450 ? 130 : 180;

    let shift = Math.random() * maxDelta * 2 - maxDelta;
    let gapY = this.lastPipeY + shift;

    gapY = Math.max(minY, Math.min(maxY, gapY));
    this.lastPipeY = gapY;

    let slideDir = Math.random() < 0.5 ? -1 : 1;
    let slideSpd = this.level === 4 ? 1 : this.level >= 5 ? 2 : 0;
    let slideRng = this.level === 4 ? 25 : this.level >= 5 ? 45 : 0;
    this.currentPipeStyle = Math.floor(Math.random() * 4);

    this.pipes.push(
      new Pipe(
        CONFIG.WIDTH + 50,
        gapY - CONFIG.VERT_GAP / 2,
        true,
        slideDir,
        slideSpd,
        slideRng,
        this.currentPipeStyle,
      ),
    );
    this.pipes.push(
      new Pipe(
        CONFIG.WIDTH + 50,
        gapY + CONFIG.VERT_GAP / 2,
        false,
        slideDir,
        slideSpd,
        slideRng,
        this.currentPipeStyle,
      ),
    );

    // 70% chance to spawn a coin perfectly in the middle of the gap!
    if (Math.random() > 0.3) {
      // THE ALIGNMENT FIX:
      // Pipe starts at (WIDTH + 50). We add half the pipe's width to find the exact dead-center!
      let exactCenterX = CONFIG.WIDTH + 50 + CONFIG.PIPE_WIDTH / 2;

      this.coinsList.push(new Coin(exactCenterX, gapY));
    }
  }

  triggerDeath(crashedIntoPipe) {
    if (this.state !== "GAMEOVER") {
      this.state = "GAMEOVER";
      this.deathTime = Date.now();
      this.shakeTimer = 20;
      this.playSFX("crash");
      if (crashedIntoPipe) this.unlockAchievement("die_pipe");

      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.isNewBest = true;
        localStorage.setItem("flappyBinnieHighScore", this.highScore);
      }
      // CRITICAL FIX: Safely stop the music
      if (this.bgmSource) {
        try {
          this.bgmSource.stop();
        } catch (e) {}
        this.bgmSource = null;
      }
      savePlayerData(
        this.username,
        this.highScore,
        this.coins,
        this.unlockedAchievements, // You can also save unlocked wings here later
      );
    }
  }

  bindEvents() {
    const handlePointer = (e) => {
      // Ignore clicks/touches if they hit the HTML UI instead of the Canvas
      if (e.target !== this.canvas) return;

      // CRITICAL FIX: Prevent mobile 'touchstart' from triggering a fake 'mousedown' a millisecond later!
      if (e.type === "touchstart" && e.cancelable) e.preventDefault();

      // Check if it's a mouse event and ensure it is ONLY the left click (button 0)
      if (e.type === "mousedown" && e.button !== 0) return;
      if (e.cancelable && e.type !== "mousedown") e.preventDefault();

      let clientX = e.clientX;
      let clientY = e.clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
      if (clientX === undefined) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CONFIG.WIDTH / rect.width;
      const scaleY = CONFIG.HEIGHT / rect.height;
      const mx = (clientX - rect.left) * scaleX;
      const my = (clientY - rect.top) * scaleY;
      this.processClick(mx, my);
    };

    window.addEventListener("mousedown", handlePointer);
    window.addEventListener("touchstart", handlePointer, { passive: false });

    window.addEventListener("keydown", (e) => {
      if (e.code !== "Space") return;

      // Prevent Spacebar from triggering game logic if Character UI is open
      const charMenu = document.getElementById("charMenuUI");
      if (charMenu && !charMenu.classList.contains("hidden")) return;

      if (e.cancelable) e.preventDefault();

      if (this.state === "MENU") {
        this.startFromMenu();
      } else if (this.state === "GET_READY") {
        this.state = "PLAYING";
        this.spawnPipes();
        this.bird.flap();
      } else if (this.state === "PLAYING") {
        this.playSFX("flap");
        this.bird.flap();
      } else if (this.state === "GAMEOVER") {
        if (Date.now() - this.deathTime > 600) this.prepareRound();
      }
    });
  }

  isClicked(mx, my, bx, by, bw, bh) {
    return (
      mx > bx - bw / 2 &&
      mx < bx + bw / 2 &&
      my > by - bh / 2 &&
      my < by + bh / 2
    );
  }

  processClick(mx, my) {
    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;

    if (this.state === "MENU") {
      if (this.state === "MENU") {
        // Shrunk button heights to 50 and tightened gaps to fit 4 buttons!
        if (this.isClicked(mx, my, cx, cy + 10, 200, 50)) this.startFromMenu();
        if (this.isClicked(mx, my, cx, cy + 75, 200, 50))
          AchievementsMenu.open(this);
        if (this.isClicked(mx, my, cx, cy + 140, 200, 50))
          CharacterMenu.open(this);

        // NEW LEADERBOARD BUTTON
        if (this.isClicked(mx, my, cx, cy + 205, 200, 50)) {
          this.playSFX("flap");
          if (window.openLeaderboard) window.openLeaderboard();
        }
      }
      // Wing selection arrows
      if (this.isClicked(mx, my, cx - 120, cy - 90, 50, 50)) {
        this.wingIndex =
          (this.wingIndex - 1 + this.wingStyles.length) %
          this.wingStyles.length;
        localStorage.setItem(
          "flappyBinnieWingStyle",
          this.wingStyles[this.wingIndex],
        );
        this.playSFX("flap");
      }
      if (this.isClicked(mx, my, cx + 120, cy - 90, 50, 50)) {
        this.wingIndex = (this.wingIndex + 1) % this.wingStyles.length;
        localStorage.setItem(
          "flappyBinnieWingStyle",
          this.wingStyles[this.wingIndex],
        );
        this.playSFX("flap");
      }
    } else if (this.state === "GET_READY") {
      this.state = "PLAYING";
      this.playSFX("start");
      this.spawnPipes();
      this.bird.flap();
      this.unlockAchievement("first_flap");
    } else if (this.state === "PLAYING") {
      this.playSFX("flap");
      this.bird.flap();
    } else if (this.state === "GAMEOVER") {
      if (Date.now() - this.deathTime > 600) {
        // Restart / Quit buttons
        if (this.isClicked(mx, my, cx + 110, cy + 160, 180, 60))
          this.prepareRound();
        if (this.isClicked(mx, my, cx - 110, cy + 160, 180, 60))
          this.resetToMenu();
      }
    }
  }

  checkCollisions() {
    let offset = 15;
    let bx = this.bird.x - this.bird.size / 2 + offset;
    let by = this.bird.y - this.bird.size / 2 + offset;
    let bw = this.bird.size - offset * 2;
    let bh = this.bird.size - offset * 2;

    // Floor crash logic is handled in the bird update, but if we need to know it was a PIPE:
    for (let p of this.pipes) {
      let bounds = p.getBounds();
      if (
        bx < bounds.x + bounds.w &&
        bx + bw > bounds.x &&
        by < bounds.y + bounds.h &&
        by + bh > bounds.y
      )
        return true; // Crashed into pipe
    }
    return false;
  }

  drawText(
    text,
    size,
    y,
    x = CONFIG.WIDTH / 2,
    align = "center",
    color = "white",
  ) {
    this.ctx.textAlign = align;
    this.ctx.font = `bold ${size}px Courier`;
    this.ctx.fillStyle = "black";
    this.ctx.fillText(text, x + 2, y + 2);
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  drawButton(
    text,
    x,
    y,
    w,
    h,
    bg = "#ded895",
    fg = "white",
    animatePulse = false,
  ) {
    this.ctx.save();

    let scale = 1;
    // If animatePulse is true, use sine wave math to gently scale the button up and down
    if (animatePulse) {
      scale = 1 + Math.sin(Date.now() / 200) * 0.05; // 5% scale pulse
    }

    // Move to the button's center, scale it, then draw it around that center point
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);

    this.ctx.fillStyle = bg;
    this.ctx.strokeStyle = "#543847";
    this.ctx.lineWidth = 4;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      this.ctx.fillRect(-w / 2, -h / 2, w, h);
      this.ctx.strokeRect(-w / 2, -h / 2, w, h);
    }

    // Draw the text (adjusted for the new relative 0,0 center)
    this.drawText(text, Math.min(28, h * 0.6), h * 0.15, 0, "center", fg);
    this.ctx.restore();
  }

  //DRAW MEDAL
  drawMedal(x, y, targetScore) {
    let colors = null;
    // Define the score requirements for each medal
    if (targetScore >= 40)
      colors = { main: "#e5e4e2", border: "#b2b2b2", name: "PLATINUM" };
    else if (targetScore >= 30)
      colors = { main: "#ffd700", border: "#d4af37", name: "GOLD" };
    else if (targetScore >= 20)
      colors = { main: "#c0c0c0", border: "#a9a9a9", name: "SILVER" };
    else if (targetScore >= 10)
      colors = { main: "#cd7f32", border: "#8b4513", name: "BRONZE" };

    // If the high score is under 10, they haven't earned a medal yet, so draw nothing.
    if (!colors) return;

    const ctx = this.ctx;
    ctx.save();

    // Draw the Text Label above the medal
    this.drawText(`BEST: ${colors.name}`, 18, y - 45, x, "center", colors.main);

    // 1. Draw the Red Ribbon
    ctx.fillStyle = "#d32f2f";
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 25);
    ctx.lineTo(x + 15, y - 25);
    ctx.lineTo(x + 20, y + 15);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 20, y + 15);
    ctx.fill();

    // 2. Draw the Outer Medal Border
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fillStyle = colors.border;
    ctx.fill();

    // 3. Draw the Inner Medal Face
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fillStyle = colors.main;
    ctx.fill();

    // 4. Draw a shiny glare on the top-left to make it look metallic!
    ctx.beginPath();
    ctx.arc(x - 6, y - 6, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fill();

    ctx.restore();
  }

  // --- NEW: MEDAL SYSTEM ---
  drawScorePanel() {
    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;
    const panelW = 380; // Shrunk from 440 to fit mobile
    const panelH = 210;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2 - 40;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(panelX + 8, panelY + 8, panelW, panelH, 20);
      this.ctx.fill();
    }

    this.ctx.fillStyle = "#ded895";
    this.ctx.strokeStyle = "#543847";
    this.ctx.lineWidth = 6;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(panelX, panelY, panelW, panelH, 20);
      this.ctx.fill();
      this.ctx.stroke();
    }

    // Left Side: Medal Box
    this.ctx.fillStyle = "rgba(0,0,0,0.05)";
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(panelX + 15, panelY + 15, 140, 180, 15);
      this.ctx.fill();
    }

    // Right Side: Score Box
    this.ctx.fillStyle = "#c2b280";
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      this.ctx.roundRect(panelX + 165, panelY + 15, 200, 180, 15);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.drawText("SCORE", 22, panelY + 45, panelX + 265, "center", "#ff7a00");
    this.drawText(
      this.score.toString(),
      42,
      panelY + 90,
      panelX + 265,
      "center",
      "white",
    );

    this.drawText("BEST", 22, panelY + 140, panelX + 265, "center", "#ff7a00");
    this.drawText(
      this.highScore.toString(),
      32,
      panelY + 180,
      panelX + 265,
      "center",
      "white",
    );
    if (this.isNewBest)
      this.drawText(
        "NEW!",
        18,
        panelY + 125,
        panelX + 325,
        "center",
        "#ff0000",
      );

    this.drawText("MEDAL", 22, panelY + 45, panelX + 85, "center", "#543847");

    let medalColor = null;
    let medalName = "";
    if (this.highScore >= 40) {
      medalColor = "#e5e4e2";
      medalName = "PLATINUM";
    } else if (this.highScore >= 30) {
      medalColor = "#ffd700";
      medalName = "GOLD";
    } else if (this.highScore >= 20) {
      medalColor = "#c0c0c0";
      medalName = "SILVER";
    } else if (this.highScore >= 10) {
      medalColor = "#cd7f32";
      medalName = "BRONZE";
    }

    let mx = panelX + 85;
    let my = panelY + 110;

    if (medalColor) {
      let hoverFloat = Math.sin(Date.now() / 300) * 4;
      this.ctx.fillStyle = "#d1685a";
      this.ctx.beginPath();
      this.ctx.moveTo(mx - 18, my - 25 + hoverFloat);
      this.ctx.lineTo(mx + 18, my - 25 + hoverFloat);
      this.ctx.lineTo(mx + 22, my + 35 + hoverFloat);
      this.ctx.lineTo(mx, my + 20 + hoverFloat);
      this.ctx.lineTo(mx - 22, my + 35 + hoverFloat);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(mx, my + hoverFloat, 30, 0, Math.PI * 2);
      this.ctx.fillStyle = medalColor;
      this.ctx.fill();
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = "white";
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(mx, my + hoverFloat, 20, 0, Math.PI * 2);
      this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      let shineOffset = Math.sin(Date.now() / 500) * 8;
      this.ctx.beginPath();
      this.ctx.arc(
        mx - 6 + shineOffset,
        my - 6 + hoverFloat,
        5,
        0,
        Math.PI * 2,
      );
      this.ctx.fillStyle = "rgba(255,255,255,0.6)";
      this.ctx.fill();

      this.drawText(medalName, 12, panelY + 180, mx, "center", medalColor);
    } else {
      this.ctx.fillStyle = "rgba(0,0,0,0.1)";
      this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([6, 6]);
      this.ctx.beginPath();
      this.ctx.arc(mx, my, 30, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    this.ctx.restore();
  }

  drawSettingsPanel() {
    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    this.ctx.fillStyle = "#ded895";
    this.ctx.strokeStyle = "#543847";
    this.ctx.lineWidth = 6;
    if (this.ctx.roundRect) {
      this.ctx.beginPath();
      // Mobile-sized box
      this.ctx.roundRect(cx - 170, cy - 160, 340, 350, 20);
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.drawText("SETTINGS", 32, cy - 100, cx, "center", "white");

    this.drawText("Music:", 24, cy - 40, cx - 120, "left", "white");
    this.drawText("SFX:", 24, cy + 30, cx - 120, "left", "white");
    this.drawText("Vol:", 24, cy + 100, cx - 120, "left", "white");

    // Smaller, repositioned buttons
    this.drawButton(
      this.settings.bgm ? "ON" : "OFF",
      cx + 80,
      cy - 50,
      80,
      45,
      this.settings.bgm ? "#55aa55" : "#aa5555",
    );
    this.drawButton(
      this.settings.sfx ? "ON" : "OFF",
      cx + 80,
      cy + 20,
      80,
      45,
      this.settings.sfx ? "#55aa55" : "#aa5555",
    );
    this.drawButton("-", cx + 20, cy + 90, 45, 45, "#c2b280");
    this.drawText(
      Math.round(this.settings.volume * 10).toString(),
      24,
      cy + 100,
      cx + 75,
      "center",
      "white",
    );
    this.drawButton("+", cx + 130, cy + 90, 45, 45, "#c2b280");

    this.drawButton("BACK", cx, cy + 150, 160, 50, "#d1685a");
  }

  drawGround() {
    let img = Assets.images.pipes;
    if (img && img.complete && img.naturalWidth !== 0) {
      let tileW = img.width / 2;
      let tileH = img.height / 3;
      let scaleMult = CONFIG.GROUND_HEIGHT / tileH;
      let scaledW = tileW * scaleMult;
      if (this.state === "PLAYING" || this.state === "GET_READY") {
        this.groundX -= this.currentSpeed;
        if (this.groundX <= -scaledW) this.groundX = 0;
      }
      for (let i = 0; i <= CONFIG.WIDTH + scaledW; i += scaledW) {
        this.ctx.drawImage(
          img,
          0,
          tileH * 2,
          tileW,
          tileH,
          this.groundX + i,
          CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT,
          scaledW,
          CONFIG.GROUND_HEIGHT,
        );
      }
    } else {
      this.ctx.fillStyle = "#55aa55";
      this.ctx.fillRect(
        0,
        CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT,
        CONFIG.WIDTH,
        CONFIG.GROUND_HEIGHT,
      );
    }
  }

  drawToast() {
    if (this.toastTimer > 0) {
      this.toastTimer--;

      // Slide down/up animation math
      let cy = Math.min(60, 60 - (this.toastTimer - 160) * 5);
      if (this.toastTimer < 20) cy = 60 - (20 - this.toastTimer) * 5;

      this.ctx.save();
      this.ctx.globalAlpha = Math.min(1, this.toastTimer / 20);

      this.ctx.fillStyle = "#ffce00";
      this.ctx.strokeStyle = "#543847";
      this.ctx.lineWidth = 4;
      let cx = CONFIG.WIDTH / 2;

      if (this.ctx.roundRect) {
        this.ctx.beginPath();
        // SHRUNK the width to 380 so it fits beautifully inside the 450 mobile screen!
        this.ctx.roundRect(cx - 190, cy - 30, 380, 60, 20);
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillRect(cx - 190, cy - 30, 380, 60);
        this.ctx.strokeRect(cx - 190, cy - 30, 380, 60);
      }

      // Shrunk the text size slightly to ensure long achievement names fit
      this.drawText(
        `🏆 UNLOCKED: ${this.activeToast}`,
        18,
        cy + 6,
        cx,
        "center",
        "#543847",
      );
      this.ctx.restore();
    }
  }

  loop() {
    let dx = 0,
      dy = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer--;
      dx = (Math.random() - 0.5) * 10;
      dy = (Math.random() - 0.5) * 10;
    } else if (this.state === "PLAYING") {
      let chances = { 2: 350, 3: 200, 4: 200, 5: 120 };
      let chance = chances[this.level] || 0;
      if (chance && Math.floor(Math.random() * chance) === 0)
        this.shakeTimer = 40;
    }

    this.ctx.save();
    this.ctx.translate(dx, dy);

    this.ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
    let drawBg = (imgIdx, alpha) => {
      let img = Assets.images[`bg_${imgIdx}`];
      this.ctx.globalAlpha = alpha / 255;
      if (img && img.complete)
        this.ctx.drawImage(
          img,
          0,
          CONFIG.BG_OFFSET,
          CONFIG.WIDTH,
          CONFIG.HEIGHT - CONFIG.BG_OFFSET,
        );
    };

    drawBg(this.currentBg, 255);
    if (this.isFading) {
      this.bgAlpha += 3;
      if (this.bgAlpha >= 255) {
        this.bgAlpha = 255;
        this.isFading = false;
        this.currentBg = this.nextBg;
      }
      drawBg(this.nextBg, this.bgAlpha);
    }
    this.ctx.globalAlpha = 1.0;

    if (this.state === "PLAYING") {
      this.checkLiveAchievements(); // Constantly check for unlocked medals while playing

      if (
        this.score > 0 &&
        this.score % 10 === 0 &&
        this.score !== this.lastMilestone
      ) {
        this.lastMilestone = this.score;
        do {
          this.nextBg = Math.floor(Math.random() * CONFIG.BACKGROUNDS.length);
        } while (this.nextBg === this.currentBg);
        this.isFading = true;
        this.bgAlpha = 0;
      }

      this.level = Math.min(5, Math.floor(this.score / 10) + 1);
      this.currentSpeed = Math.min(
        CONFIG.PIPE_SPEED + Math.floor(this.score / 10),
        CONFIG.MAX_PIPE_SPEED,
      );
      this.bird.gravity =
        CONFIG.GRAVITY + (this.currentSpeed - CONFIG.PIPE_SPEED) * 0.02;

      let crashedIntoPipe = this.checkCollisions();
      if (this.bird.update(this.currentSpeed) || crashedIntoPipe)
        this.triggerDeath(crashedIntoPipe);

      let lastPipe = this.pipes[this.pipes.length - 2];
      if (lastPipe && lastPipe.x < CONFIG.WIDTH - CONFIG.HORIZ_GAP)
        this.spawnPipes();

      this.pipes.forEach((p) => {
        p.update(this.currentSpeed, this.shakeTimer > 0);
        if (!p.scored && p.x + p.w < this.bird.x) {
          if (!p.isTop) this.score++;
          p.scored = true;
        }
      });
      this.pipes = this.pipes.filter((p) => !p.markedForDeletion);

      // Inside your PLAYING state in loop()

      this.coinsList.forEach((c) => {
        c.update(this.currentSpeed);

        // Simple Circle Collision logic
        let dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y);

        // If bird radius + coin radius overlap, collect it!
        if (dist < this.bird.size / 2 - 10 + c.radius && !c.markedForDeletion) {
          c.markedForDeletion = true;
          this.coins++;
          this.playSFX("coin"); // Ding!
        }
      });

      // Clean up collected or off-screen coins
      this.coinsList = this.coinsList.filter((c) => !c.markedForDeletion);
    }

    if (this.state === "GAMEOVER") this.bird.update();

    if (this.state === "PLAYING" || this.state === "GAMEOVER") {
      this.pipes.forEach((p) => p.draw(this.ctx));
      // Draw coins
      this.coinsList.forEach((c) => c.draw(this.ctx));
    }

    this.drawGround();

    if (this.state === "MENU" || this.state === "ACHIEVEMENTS") {
      this.bird.x += (CONFIG.WIDTH / 2 - this.bird.x) * 0.05;
      this.bird.y = CONFIG.HEIGHT / 2 - 90 + Math.sin(Date.now() / 200) * 10;
    } else if (this.state === "GET_READY") {
      this.bird.x = 200;
      this.bird.y = CONFIG.HEIGHT / 2 + Math.sin(Date.now() / 200) * 10;
    } else if (this.state === "PLAYING") {
      if (Math.abs(this.bird.x - 200) > 1) {
        this.bird.x += (200 - this.bird.x) * 0.02;
      } else {
        this.bird.x = 200;
      }
    }

    // Hide the bird entirely if the settings menu is open
    if (this.state !== "SETTINGS") {
      this.bird.draw(this.ctx);
    }

    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;

    if (this.state === "MENU") {
      this.drawText(CONFIG.TITLE, 54, cy - 200, cx, "center", "#ffce00");

      // 4 Buttons, perfectly stacked!
      this.drawButton("PLAY", cx, cy + 10, 200, 50, "#55aa55", "white", true);
      this.drawButton("ACHIEVEMENTS", cx, cy + 75, 200, 50, "#ff7a00");
      this.drawButton("CHARACTER", cx, cy + 140, 200, 50, "#4287f5");
      this.drawButton("LEADERBOARD", cx, cy + 205, 200, 50, "#d1685a"); // New!

      // --- NEW: DRAW VERSION NUMBER ---
      // Draws small, slightly transparent text in the bottom-right corner!
      this.drawText(
        CONFIG.VERSION,
        16,
        CONFIG.HEIGHT - 15,
        CONFIG.WIDTH - 15,
        "right",
        "rgba(255, 255, 255, 0.7)",
      );
    }

    if (this.state === "SETTINGS") this.drawSettingsPanel();

    if (this.state === "GET_READY") {
      this.drawText("GET READY!", 54, cy - 100, cx, "center", "#ff7a00");
      this.drawText("Tap or Space to start", 28, cy + 100);
    }

    if (this.state === "PLAYING") {
      this.drawText(this.score.toString(), 48, 80);
      this.drawText(`LEVEL ${this.level}`, 22, CONFIG.HEIGHT - 30);
      // DRAW WALLET BALANCE (Top Right)
      this.drawText(
        `💰 ${this.coins}`,
        24,
        40,
        CONFIG.WIDTH - 20,
        "right",
        "#FFD700",
      );
    }

    if (this.state === "GAMEOVER") {
      this.drawText("GAME OVER", 48, cy - 210);
      this.drawScorePanel();

      this.drawButton(
        "QUIT",
        cx - 110,
        cy + 160,
        180,
        60,
        "#cd5c4d",
        "white",
        true,
      );
      this.drawButton(
        "RESTART",
        cx + 110,
        cy + 160,
        180,
        60,
        "#55aa55",
        "white",
        true,
      );
    }

    this.drawToast(); // Draw pop-up over everything

    this.ctx.restore();
    requestAnimationFrame(this.loop);
  }
}
