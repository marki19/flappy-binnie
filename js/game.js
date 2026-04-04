import { CONFIG } from "./config.js";
import { Assets } from "./assets.js";
import { Bird, Pipe, Coin, Particle, PowerUp } from "./sprites.js";
import { CharacterMenu } from "./character.js";
import { AchievementsMenu } from "./achievements.js";
import { audioCtx } from "./assets.js";
import { savePlayerData } from "./database.js";

export class Game {
  constructor(canvas, ctx, playerName, cloudData) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.username = playerName;

    // --- PURE CLOUD TRUST ---
    this.highScore = cloudData?.highScore || 0;
    this.coins = cloudData?.coins || 0;
    this.unlockedAchievements = cloudData?.unlockedAchievements || [];

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

    this.activeToast = null;
    this.toastTimer = 0;

    this.state = "MENU";
    this.resetGameVars();
    this.bindEvents();
    this.applySettings();

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  updatePlayerData(playerName, cloudData) {
    this.username = playerName;
    this.highScore = cloudData?.highScore || 0;
    this.coins = cloudData?.coins || 0;
    this.unlockedAchievements = cloudData?.unlockedAchievements || [];
  }

  resetGameVars() {
    this.bird = new Bird();
    this.pipes = [];
    this.coinsList = [];
    this.particles = [];
    this.powerups = [];
    this.activePowerUps = { shield: 0, magnet: 0 };
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

  spawnParticles(x, y, color, type, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, type));
    }
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
    this.unlockAchievement("first_flap");
  }

  prepareRound() {
    this.resetGameVars();
    this.state = "GET_READY";
    this.applySettings();
  }

  resetToMenu() {
    this.state = "MENU";
    this.resetGameVars();
    if (Assets.audio.music && this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource = null;
    }
  }

  applySettings() {
    localStorage.setItem("flappyBinnieSettings", JSON.stringify(this.settings));
    if (Assets.audio.music) {
      if (
        this.settings.bgm &&
        (this.state === "PLAYING" || this.state === "GET_READY")
      ) {
        if (!this.bgmSource) this.playSFX("music");
      } else if (this.bgmSource) {
        try {
          this.bgmSource.stop();
        } catch (e) {}
        this.bgmSource = null;
      }
    }
  }

  playSFX(key) {
    if (this.settings && !this.settings.sfx && key !== "music") return;
    if (this.settings && !this.settings.bgm && key === "music") return;

    let buffer = Assets.audio[key];
    if (buffer) {
      if (audioCtx.state === "suspended") audioCtx.resume();

      let source = audioCtx.createBufferSource();
      source.buffer = buffer;
      let gainNode = audioCtx.createGain();
      let trimAmount = 0;

      if (key === "music") {
        if (this.bgmSource) {
          try {
            this.bgmSource.stop();
          } catch (e) {}
        }
        gainNode.gain.value = 0.5;
        trimAmount = 1;
        source.loop = true;
        this.bgmSource = source;
      } else if (key === "start") {
        gainNode.gain.value = 1.0;
        trimAmount = 0.5;
      } else if (key === "flap") {
        gainNode.gain.value = 0.7;
        trimAmount = 0.05;
      } else if (key === "crash") {
        gainNode.gain.value = 1;
        trimAmount = 0.1;
      } else if (key === "coin") {
        gainNode.gain.value = 1.5;
        trimAmount = 0.2;
      } else if (key === "error") {
        gainNode.gain.value = 1.0;
        trimAmount = 0.2;
      }

      if (this.settings && this.settings.volume !== undefined) {
        gainNode.gain.value *= this.settings.volume;
      }

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0, trimAmount);
    }
  }

  unlockAchievement(id) {
    if (!this.unlockedAchievements.includes(id)) {
      this.unlockedAchievements.push(id);
      let ach = CONFIG.ACHIEVEMENTS.find((a) => a.id === id);
      if (ach) {
        this.activeToast = ach.name;
        this.toastTimer = 120;
        this.playSFX("start");
      }
    }
  }

  checkLiveAchievements() {
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
  }

  spawnPipes() {
    let minY = 200;
    let maxY = CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT - 200;
    let exactCenterX = CONFIG.WIDTH + 50 + CONFIG.PIPE_WIDTH / 2;

    if (!this.lastPipeY) this.lastPipeY = (minY + maxY) / 2;
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

    if (Math.random() > 0.3) {
      if (Math.random() > 0.85) {
        let type = Math.random() > 0.5 ? "magnet" : "shield";
        this.powerups.push(new PowerUp(exactCenterX, gapY, type));
      } else {
        this.coinsList.push(new Coin(exactCenterX, gapY));
      }
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
      }
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
        this.unlockedAchievements,
      );
    }
  }

  bindEvents() {
    const handlePointer = (e) => {
      if (e.target !== this.canvas) return;
      if (e.type === "touchstart" && e.cancelable) e.preventDefault();
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
      if (document.activeElement.tagName === "INPUT") return;

      if (e.code !== "Space") return;
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
      } else if (this.state === "PAUSED") {
        this.state = "PLAYING";
        this.playSFX("flap");
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
      if (this.isClicked(mx, my, 40, 40, 50, 50)) {
        this.playSFX("flap");
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.add("open");
      }

      let startY = cy - 40;
      if (this.isClicked(mx, my, cx, startY, 200, 50)) this.startFromMenu();
      if (this.isClicked(mx, my, cx, startY + 65, 200, 50))
        AchievementsMenu.open(this);
      if (this.isClicked(mx, my, cx, startY + 130, 200, 50))
        CharacterMenu.open(this);
      if (this.isClicked(mx, my, cx, startY + 195, 200, 50)) {
        this.playSFX("flap");
        if (window.openLeaderboard) window.openLeaderboard();
      }

      if (this.isClicked(mx, my, cx - 120, cy - 120, 50, 50)) {
        this.wingIndex =
          (this.wingIndex - 1 + this.wingStyles.length) %
          this.wingStyles.length;
        localStorage.setItem(
          "flappyBinnieWingStyle",
          this.wingStyles[this.wingIndex],
        );
        this.playSFX("flap");
      }
      if (this.isClicked(mx, my, cx + 120, cy - 120, 50, 50)) {
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
      if (this.isClicked(mx, my, CONFIG.WIDTH - 40, 40, 50, 50)) {
        this.state = "PAUSED";
        this.playSFX("start");
      } else {
        this.playSFX("flap");
        this.bird.flap();
        this.spawnParticles(this.bird.x, this.bird.y, "#ffffff", "feather", 5);
      }
    } else if (this.state === "PAUSED") {
      if (this.isClicked(mx, my, cx, cy - 20, 200, 50)) {
        this.state = "PLAYING";
        this.playSFX("flap");
      }
      if (this.isClicked(mx, my, cx, cy + 50, 200, 50)) {
        this.resetToMenu();
        this.playSFX("flap");
      }
    } else if (this.state === "GAMEOVER") {
      if (this.isClicked(mx, my, cx + 100, cy + 140, 180, 50))
        this.prepareRound();
      if (this.isClicked(mx, my, cx - 100, cy + 140, 180, 50))
        this.resetToMenu();
    }
  }

  checkCollisions() {
    let offset = 15;
    let bx = this.bird.x - this.bird.size / 2 + offset;
    let by = this.bird.y - this.bird.size / 2 + offset;
    let bw = this.bird.size - offset * 2;
    let bh = this.bird.size - offset * 2;

    for (let p of this.pipes) {
      let bounds = p.getBounds();
      if (
        bx < bounds.x + bounds.w &&
        bx + bw > bounds.x &&
        by < bounds.y + bounds.h &&
        by + bh > bounds.y
      ) {
        if (this.activePowerUps.shield > 0) {
          p.markedForDeletion = true;
          this.activePowerUps.shield = 0;
          this.bird.isShielded = false;
          this.playSFX("error");
          this.spawnParticles(
            p.x,
            p.y + (p.isTop ? p.h : 0),
            "#55aa55",
            "smoke",
            30,
          );
          return false;
        }
        return true;
      }
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
    hasShadow = true,
  ) {
    this.ctx.textAlign = align;
    this.ctx.textBaseline = "middle";
    this.ctx.font = `${size}px 'Press Start 2P', Courier`;

    if (hasShadow) {
      let shadowOffset = Math.max(2, Math.floor(size / 10));
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      this.ctx.fillText(text, x + shadowOffset, y + shadowOffset);
    }

    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  drawButton(
    text,
    x,
    y,
    w,
    h,
    bgColor,
    textColor = "white",
    isPulsing = false,
  ) {
    let scale = 1;
    if (isPulsing) scale = 1 + Math.sin(Date.now() / 150) * 0.05;

    let drawW = w * scale;
    let drawH = h * scale;
    let drawX = x - drawW / 2;
    let drawY = y - drawH / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(drawX + 6, drawY + 6, drawW, drawH);
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(drawX, drawY, drawW, drawH);
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.fillRect(drawX, drawY, drawW, 4);
    this.ctx.fillRect(drawX, drawY, 4, drawH);
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.fillRect(drawX, drawY + drawH - 4, drawW, 4);
    this.ctx.fillRect(drawX + drawW - 4, drawY, 4, drawH);
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(drawX, drawY, drawW, drawH);
    this.ctx.restore();

    let textSize = h * 0.25;
    this.drawText(text, textSize, y + 2, x, "center", textColor, false);
  }

  drawScorePanel() {
    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;
    const panelW = 380;
    const panelH = 210;
    const panelX = cx - panelW / 2;
    const panelY = cy - panelH / 2 - 40;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(panelX + 8, panelY + 8, panelW, panelH);

    this.ctx.fillStyle = "#ded895";
    this.ctx.strokeStyle = "#543847";
    this.ctx.lineWidth = 6;
    this.ctx.fillRect(panelX, panelY, panelW, panelH);
    this.ctx.strokeRect(panelX, panelY, panelW, panelH);

    this.ctx.fillStyle = "rgba(0,0,0,0.05)";
    this.ctx.fillRect(panelX + 15, panelY + 15, 140, 180);

    this.ctx.fillStyle = "#c2b280";
    this.ctx.fillRect(panelX + 165, panelY + 15, 200, 180);
    this.ctx.strokeRect(panelX + 165, panelY + 15, 200, 180);

    let currentScoreStr = this.score.toString();
    let bestScoreStr = this.highScore.toString();

    let currentSize = Math.min(28, Math.floor(180 / currentScoreStr.length));
    let bestSize = Math.min(24, Math.floor(180 / bestScoreStr.length));

    this.drawText(
      "SCORE",
      16,
      panelY + 45,
      panelX + 265,
      "center",
      "#ff7a00",
      false,
    );
    this.drawText(
      currentScoreStr,
      currentSize,
      panelY + 85,
      panelX + 265,
      "center",
      "white",
      true,
    );

    this.drawText(
      "BEST",
      16,
      panelY + 135,
      panelX + 265,
      "center",
      "#ff7a00",
      false,
    );
    this.drawText(
      bestScoreStr,
      bestSize,
      panelY + 175,
      panelX + 265,
      "center",
      "white",
      true,
    );

    if (this.isNewBest) {
      this.drawText(
        "NEW!",
        10,
        panelY + 115,
        panelX + 325,
        "center",
        "#ff0000",
        false,
      );
    }

    this.drawText(
      "MEDAL",
      16,
      panelY + 45,
      panelX + 85,
      "center",
      "#543847",
      false,
    );

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

      this.drawText(
        medalName,
        10,
        panelY + 180,
        mx,
        "center",
        medalColor,
        true,
      );
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
    this.ctx.fillRect(cx - 170, cy - 160, 340, 350);
    this.ctx.strokeRect(cx - 170, cy - 160, 340, 350);

    this.drawText("SETTINGS", 24, cy - 100, cx, "center", "white");

    this.drawText("Music:", 16, cy - 40, cx - 120, "left", "white");
    this.drawText("SFX:", 16, cy + 30, cx - 120, "left", "white");
    this.drawText("Vol:", 16, cy + 100, cx - 120, "left", "white");

    this.drawButton(
      this.settings.bgm ? "ON" : "OFF",
      cx + 80,
      cy - 40,
      80,
      45,
      this.settings.bgm ? "#55aa55" : "#aa5555",
    );
    this.drawButton(
      this.settings.sfx ? "ON" : "OFF",
      cx + 80,
      cy + 30,
      80,
      45,
      this.settings.sfx ? "#55aa55" : "#aa5555",
    );

    this.drawButton("-", cx + 20, cy + 100, 45, 45, "#c2b280");
    this.drawText(
      Math.round(this.settings.volume * 10).toString(),
      16,
      cy + 100,
      cx + 75,
      "center",
      "white",
    );
    this.drawButton("+", cx + 130, cy + 100, 45, 45, "#c2b280");

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
      let cy = Math.min(60, 60 - (this.toastTimer - 160) * 5);
      if (this.toastTimer < 20) cy = 60 - (20 - this.toastTimer) * 5;

      this.ctx.save();
      this.ctx.globalAlpha = Math.min(1, this.toastTimer / 20);

      this.ctx.fillStyle = "#ffce00";
      this.ctx.strokeStyle = "#543847";
      this.ctx.lineWidth = 4;
      let cx = CONFIG.WIDTH / 2;

      this.ctx.fillRect(cx - 190, cy - 30, 380, 60);
      this.ctx.strokeRect(cx - 190, cy - 30, 380, 60);

      this.drawText(
        `🏆 UNLOCKED: ${this.activeToast}`,
        12,
        cy + 2,
        cx,
        "center",
        "#543847",
        false,
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
      if (img && img.complete) {
        this.ctx.drawImage(
          img,
          0,
          CONFIG.BG_OFFSET,
          CONFIG.WIDTH,
          CONFIG.HEIGHT - CONFIG.BG_OFFSET,
        );
      }
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
      this.checkLiveAchievements();

      if (this.activePowerUps.magnet > 0) {
        this.activePowerUps.magnet--;
        this.coinsList.forEach((c) => {
          let dx = this.bird.x - c.x;
          let dy = this.bird.y - c.y;
          let dist = Math.hypot(dx, dy);
          if (dist < 250) {
            c.x += (dx / dist) * 15;
            c.y += (dy / dist) * 15;
          }
        });
      }
      if (this.activePowerUps.shield > 0) this.activePowerUps.shield--;
      if (this.activePowerUps.shield === 0) this.bird.isShielded = false;

      this.coinsList.forEach((c) => {
        c.update(this.currentSpeed);
        let dist = Math.hypot(this.bird.x - c.x, this.bird.y - c.y);
        if (dist < this.bird.size / 2 + c.radius && !c.markedForDeletion) {
          c.markedForDeletion = true;
          this.coins++;
          this.playSFX("coin");
          this.spawnParticles(c.x, c.y, "#FFD700", "spark", 15);
        }
      });
      this.coinsList = this.coinsList.filter((c) => !c.markedForDeletion);

      this.powerups.forEach((p) => {
        p.update(this.currentSpeed);
        let dist = Math.hypot(this.bird.x - p.x, this.bird.y - p.y);
        if (dist < this.bird.size / 2 + p.radius && !p.markedForDeletion) {
          p.markedForDeletion = true;
          this.playSFX("coin");
          this.spawnParticles(
            p.x,
            p.y,
            p.type === "magnet" ? "#ff0000" : "#00ffff",
            "spark",
            20,
          );

          if (p.type === "magnet") this.activePowerUps.magnet = 600;
          if (p.type === "shield") {
            this.activePowerUps.shield = 600;
            this.bird.isShielded = true;
          }
        }
      });
      this.powerups = this.powerups.filter((p) => !p.markedForDeletion);

      this.particles.forEach((p) => p.update());
      this.particles = this.particles.filter((p) => p.life > 0);

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
    }

    if (this.state === "GAMEOVER") this.bird.update();

    if (
      this.state === "PLAYING" ||
      this.state === "GAMEOVER" ||
      this.state === "PAUSED"
    ) {
      this.pipes.forEach((p) => p.draw(this.ctx));
      this.coinsList.forEach((c) => c.draw(this.ctx));
      this.powerups.forEach((p) => p.draw(this.ctx));
      this.particles.forEach((p) => p.draw(this.ctx));
    }

    this.drawGround();

    if (this.state === "MENU" || this.state === "ACHIEVEMENTS") {
      this.bird.x += (CONFIG.WIDTH / 2 - this.bird.x) * 0.05;
      this.bird.y = CONFIG.HEIGHT / 2 - 120 + Math.sin(Date.now() / 200) * 10;
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

    if (this.state !== "SETTINGS") this.bird.draw(this.ctx);

    let cx = CONFIG.WIDTH / 2;
    let cy = CONFIG.HEIGHT / 2;

    if (this.state === "MENU") {
      this.drawText(CONFIG.TITLE, 32, cy - 180, cx, "center", "#FFD700");

      this.drawButton("☰", 40, 40, 50, 50, "#ded895", "#543847");

      let startY = cy - 40;
      this.drawButton("PLAY", cx, startY, 200, 50, "#55aa55", "white", true);
      this.drawButton("ACHIEVEMENTS", cx, startY + 65, 200, 50, "#ff7a00");
      this.drawButton("CHARACTER", cx, startY + 130, 200, 50, "#4287f5");
      this.drawButton("LEADERBOARD", cx, startY + 195, 200, 50, "#d1685a");

      this.drawText(
        CONFIG.VERSION,
        10,
        CONFIG.HEIGHT - 15,
        CONFIG.WIDTH - 15,
        "right",
        "rgba(255, 255, 255, 0.7)",
        false,
      );
    }

    if (this.state === "SETTINGS") this.drawSettingsPanel();

    if (this.state === "GET_READY") {
      this.drawText("GET READY!", 28, cy - 100, cx, "center", "#ff7a00");
      this.drawText("Tap or Space", 14, cy + 100);
    }

    if (this.state === "PLAYING" || this.state === "PAUSED") {
      this.drawText(this.score.toString(), 36, 80);

      // --- MOVED COINS BACK TO TOP LEFT ---
      this.drawText(`💰 ${this.coins}`, 16, 40, 20, "left", "#FFD700");

      this.drawText(
        `LEVEL ${this.level}`,
        14,
        CONFIG.HEIGHT - 30,
        20,
        "left",
        "white",
      );
      this.drawButton(
        "II",
        CONFIG.WIDTH - 40,
        40,
        50,
        50,
        "#ded895",
        "#543847",
      );

      if (this.activePowerUps.magnet > 0) {
        this.ctx.fillStyle = "red";
        this.ctx.fillRect(
          10,
          CONFIG.HEIGHT - 65,
          (this.activePowerUps.magnet / 600) * 150,
          10,
        );
      }
      if (this.activePowerUps.shield > 0) {
        this.ctx.fillStyle = "cyan";
        this.ctx.fillRect(
          10,
          CONFIG.HEIGHT - 50,
          (this.activePowerUps.shield / 600) * 150,
          10,
        );
      }
    }

    if (this.state === "PAUSED") {
      this.ctx.fillStyle = "rgba(0,0,0,0.5)";
      this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
      this.drawText("PAUSED", 36, cy - 100, cx, "center", "#ffce00");
      this.drawButton("RESUME", cx, cy - 20, 200, 50, "#55aa55", "white", true);
      this.drawButton("QUIT", cx, cy + 50, 200, 50, "#d1685a");
    }

    if (this.state === "GAMEOVER") {
      this.drawScorePanel();
      this.drawButton(
        "RESTART",
        cx + 100,
        cy + 140,
        180,
        50,
        "#55aa55",
        "white",
        true,
      );
      this.drawButton("MENU", cx - 100, cy + 140, 180, 50, "#d1685a");
    }

    this.drawToast();
    this.ctx.restore();
    requestAnimationFrame(this.loop);
  }
}
