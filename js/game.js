import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { Bird, Pipe } from './sprites.js';
import { CharacterMenu } from './character.js';

export class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.highScore = parseInt(localStorage.getItem('flappyBinnieHighScore')) || 0;
        this.settings = JSON.parse(localStorage.getItem('flappyBinnieSettings')) || { bgm: true, sfx: true, volume: 1 };
        
        this.wingStyles = ['classic', 'bat', 'mecha', 'fairy', 'demon', 'angel', 'dragon', 'butterfly', 'bone', 'crystal'];
        let savedWing = localStorage.getItem('flappyBinnieWingStyle') || 'classic';
        this.wingIndex = this.wingStyles.indexOf(savedWing);
        if(this.wingIndex === -1) this.wingIndex = 0;

        // --- NEW: ACHIEVEMENT TRACKERS ---
        this.unlockedAchievements = JSON.parse(localStorage.getItem('flappyBinnieAchievements')) || [];
        this.activeToast = null;
        this.toastTimer = 0;

        this.state = 'MENU'; 
        this.resetGameVars();
        this.bindEvents();
        this.applySettings();
        
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    resetGameVars() {
        this.bird = new Bird();
        this.pipes = [];
        this.score = 0; this.level = 1; this.currentSpeed = CONFIG.PIPE_SPEED;
        this.deathTime = 0; this.lastMilestone = 0; this.isNewBest = false; 
        this.shakeTimer = 0; this.groundX = 0;
        this.currentBg = Math.floor(Math.random() * CONFIG.BACKGROUNDS.length);
        this.nextBg = this.currentBg; this.bgAlpha = 255; this.isFading = false;
        this.currentPipeStyle = Math.floor(Math.random() * 4);
    }

    startFromMenu() {
        let currentX = this.bird.x; let currentY = this.bird.y;
        this.resetGameVars();
        this.bird.x = currentX; this.bird.y = currentY;
        
        this.state = 'PLAYING'; 
        if (Assets.audio.music) Assets.audio.music.currentTime = 0;
        this.applySettings();
        
        this.playSFX('start');
        this.spawnPipes();
        this.bird.flap();
        this.unlockAchievement('first_flap'); // Achievement Check
    }

    prepareRound() {
        this.resetGameVars(); 
        this.state = 'GET_READY'; 
        if (Assets.audio.music) Assets.audio.music.currentTime = 0;
        this.applySettings(); 
    }

    resetToMenu() {
        this.state = 'MENU';
        this.resetGameVars();
        if (Assets.audio.music) { Assets.audio.music.pause(); Assets.audio.music.currentTime = 0; }
    }

    applySettings() {
        localStorage.setItem('flappyBinnieSettings', JSON.stringify(this.settings));
        for (let key in Assets.audio) if (Assets.audio[key]) Assets.audio[key].volume = this.settings.volume;
        if (Assets.audio.music) {
            if (this.settings.bgm && (this.state === 'PLAYING' || this.state === 'GET_READY')) {
                let p = Assets.audio.music.play();
                if (p !== undefined) p.catch(e => {});
            } else { Assets.audio.music.pause(); }
        }
    }

    playSFX(soundName) {
        if (this.settings.sfx && Assets.audio[soundName]) {
            Assets.audio[soundName].currentTime = 0;
            let p = Assets.audio[soundName].play();
            if (p !== undefined) p.catch(e => {});
        }
    }

    // --- NEW: ACHIEVEMENT ENGINE ---
    unlockAchievement(id) {
        if (!this.unlockedAchievements.includes(id)) {
            this.unlockedAchievements.push(id);
            localStorage.setItem('flappyBinnieAchievements', JSON.stringify(this.unlockedAchievements));
            
            let ach = CONFIG.ACHIEVEMENTS.find(a => a.id === id);
            if (ach) {
                this.activeToast = ach.name;
                this.toastTimer = 180; // Show toast for 3 seconds (60fps * 3)
                this.playSFX('start'); // Ding sound
            }
        }
    }

    checkLiveAchievements() {
        if (this.score >= 10) this.unlockAchievement('score_10');
        if (this.score >= 20) this.unlockAchievement('score_20');
        if (this.score >= 30) this.unlockAchievement('score_30');
        if (this.score >= 40) this.unlockAchievement('score_40');
        if (this.level >= 5) this.unlockAchievement('max_speed');
        if (localStorage.getItem('flappyBinnieCustomFace')) this.unlockAchievement('custom_face');
    }

    spawnPipes() {
        let minY = 200; let maxY = CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT - 200;
        let gapY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        let slideDir = Math.random() < 0.5 ? -1 : 1;
        let slideSpd = this.level === 4 ? 1 : (this.level >= 5 ? 2 : 0);
        let slideRng = this.level === 4 ? 25 : (this.level >= 5 ? 45 : 0);
        this.currentPipeStyle = Math.floor(Math.random() * 4);
        this.pipes.push(new Pipe(CONFIG.WIDTH + 50, gapY - CONFIG.VERT_GAP / 2, true, slideDir, slideSpd, slideRng, this.currentPipeStyle));
        this.pipes.push(new Pipe(CONFIG.WIDTH + 50, gapY + CONFIG.VERT_GAP / 2, false, slideDir, slideSpd, slideRng, this.currentPipeStyle));
    }

    triggerDeath(crashedIntoPipe) {
        if (this.state !== 'GAMEOVER') {
            this.state = 'GAMEOVER'; this.deathTime = Date.now(); this.shakeTimer = 20;
            
            if (crashedIntoPipe) this.unlockAchievement('die_pipe');

            if (this.score > this.highScore) {
                this.highScore = this.score; this.isNewBest = true;
                localStorage.setItem('flappyBinnieHighScore', this.highScore);
            }
            if(Assets.audio.music) Assets.audio.music.pause();
            this.playSFX('crash'); this.bird.velocity = -7;
        }
    }

    bindEvents() {
        let audioUnlocked = false; 
        const handlePointer = (e) => {
            if (e.cancelable && e.type !== 'mousedown') e.preventDefault(); 
            if (!audioUnlocked) {
                if (Assets.audio.music) {
                    let p = Assets.audio.music.play();
                    if (p !== undefined) p.then(() => { if (this.state === 'MENU' || this.state === 'SETTINGS' || this.state === 'ACHIEVEMENTS') { Assets.audio.music.pause(); Assets.audio.music.currentTime = 0; } }).catch(() => {});
                }
                audioUnlocked = true;
            }
            let clientX = e.clientX; let clientY = e.clientY;
            if (e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } 
            else if (e.changedTouches && e.changedTouches.length > 0) { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }
            if (clientX === undefined) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = CONFIG.WIDTH / rect.width; const scaleY = CONFIG.HEIGHT / rect.height;
            const mx = (clientX - rect.left) * scaleX; const my = (clientY - rect.top) * scaleY;
            this.processClick(mx, my);
        };

        window.addEventListener('mousedown', handlePointer);
        window.addEventListener('touchstart', handlePointer, {passive: false});
        
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'Space') return; 
            if (e.cancelable) e.preventDefault(); 
            if (!audioUnlocked) {
                if (Assets.audio.music) {
                    let p = Assets.audio.music.play();
                    if (p !== undefined) p.then(() => { if (this.state === 'MENU' || this.state === 'SETTINGS' || this.state === 'ACHIEVEMENTS') { Assets.audio.music.pause(); Assets.audio.music.currentTime = 0; } }).catch(() => {});
                }
                audioUnlocked = true;
            }
            
            if (this.state === 'MENU') { this.startFromMenu(); } 
            else if (this.state === 'GET_READY') { this.state = 'PLAYING'; this.playSFX('start'); this.spawnPipes(); this.bird.flap(); this.unlockAchievement('first_flap'); } 
            else if (this.state === 'PLAYING') { this.playSFX('flap'); this.bird.flap(); } 
            else if (this.state === 'GAMEOVER') { if (Date.now() - this.deathTime > 600) this.prepareRound(); }
        });
    }

    isClicked(mx, my, bx, by, bw, bh) { return mx > bx - bw/2 && mx < bx + bw/2 && my > by - bh/2 && my < by + bh/2; }

    processClick(mx, my) {
        let cx = CONFIG.WIDTH / 2; let cy = CONFIG.HEIGHT / 2;

        if (this.state === 'MENU') {
            // Main menu updated to fit the new button
            if (this.isClicked(mx, my, cx, cy + 50, 200, 60)) this.startFromMenu();
            if (this.isClicked(mx, my, cx, cy + 120, 200, 60)) this.state = 'SETTINGS';
            if (this.isClicked(mx, my, cx, cy + 190, 200, 60)) this.state = 'ACHIEVEMENTS';
            if (this.isClicked(mx, my, cx, cy + 260, 200, 60)) CharacterMenu.open();

            if (this.isClicked(mx, my, cx - 120, cy - 60, 50, 50)) {
                this.wingIndex = (this.wingIndex - 1 + this.wingStyles.length) % this.wingStyles.length;
                localStorage.setItem('flappyBinnieWingStyle', this.wingStyles[this.wingIndex]);
                this.playSFX('flap');
            }
            if (this.isClicked(mx, my, cx + 120, cy - 60, 50, 50)) {
                this.wingIndex = (this.wingIndex + 1) % this.wingStyles.length;
                localStorage.setItem('flappyBinnieWingStyle', this.wingStyles[this.wingIndex]);
                this.playSFX('flap');
            }
        } 
        else if (this.state === 'SETTINGS') {
            if (this.isClicked(mx, my, cx + 80, cy - 60, 100, 50)) { this.settings.bgm = !this.settings.bgm; this.applySettings(); }
            if (this.isClicked(mx, my, cx + 80, cy + 10, 100, 50)) { this.settings.sfx = !this.settings.sfx; this.applySettings(); this.playSFX('flap'); }
            if (this.isClicked(mx, my, cx + 30, cy + 80, 50, 50)) { this.settings.volume = Math.max(0, this.settings.volume - 0.1); this.applySettings(); this.playSFX('flap'); }
            if (this.isClicked(mx, my, cx + 130, cy + 80, 50, 50)) { this.settings.volume = Math.min(1, this.settings.volume + 0.1); this.applySettings(); this.playSFX('flap'); }
            if (this.isClicked(mx, my, cx, cy + 180, 200, 60)) { this.state = 'MENU'; }
        }
        else if (this.state === 'ACHIEVEMENTS') {
            if (this.isClicked(mx, my, cx, cy + 240, 200, 60)) { this.state = 'MENU'; }
        }
        else if (this.state === 'GET_READY') { this.state = 'PLAYING'; this.playSFX('start'); this.spawnPipes(); this.bird.flap(); this.unlockAchievement('first_flap'); }
        else if (this.state === 'PLAYING') { this.playSFX('flap'); this.bird.flap(); } 
        else if (this.state === 'GAMEOVER') {
            if (Date.now() - this.deathTime > 600) { 
                if (this.isClicked(mx, my, cx - 110, cy + 160, 180, 60)) this.prepareRound();
                if (this.isClicked(mx, my, cx + 110, cy + 160, 180, 60)) this.resetToMenu();
            }
        }
    }

    checkCollisions() {
        let offset = 15; let bx = this.bird.x - this.bird.size/2 + offset; let by = this.bird.y - this.bird.size/2 + offset;
        let bw = this.bird.size - offset*2; let bh = this.bird.size - offset*2;
        
        // Floor crash logic is handled in the bird update, but if we need to know it was a PIPE:
        for (let p of this.pipes) {
            let bounds = p.getBounds();
            if (bx < bounds.x + bounds.w && bx + bw > bounds.x && by < bounds.y + bounds.h && by + bh > bounds.y) return true; // Crashed into pipe
        }
        return false;
    }

    drawText(text, size, y, x = CONFIG.WIDTH/2, align = "center", color = "white") {
        this.ctx.textAlign = align; this.ctx.font = `bold ${size}px Courier`; this.ctx.fillStyle = "black";
        this.ctx.fillText(text, x + 2, y + 2); this.ctx.fillStyle = color; this.ctx.fillText(text, x, y);
    }

    drawButton(text, x, y, w, h, bg = "#ded895", fg = "white") {
        this.ctx.save(); this.ctx.fillStyle = bg; this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 4;
        if(this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(x - w/2, y - h/2, w, h, 10); this.ctx.fill(); this.ctx.stroke(); } 
        else { this.ctx.fillRect(x - w/2, y - h/2, w, h); this.ctx.strokeRect(x - w/2, y - h/2, w, h); }
        this.drawText(text, Math.min(28, h * 0.6), y + (h * 0.15), x, "center", fg);
        this.ctx.restore();
    }

    // --- NEW: MEDAL SYSTEM ---
    drawScorePanel() {
        let cx = CONFIG.WIDTH / 2; let cy = CONFIG.HEIGHT / 2;
        const panelW = 400; const panelH = 220; const panelX = cx - panelW / 2; const panelY = cy - panelH / 2 - 30; 
        
        this.ctx.save();
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        if (this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(panelX + 5, panelY + 5, panelW, panelH, 20); this.ctx.fill(); } 
        else { this.ctx.fillRect(panelX + 5, panelY + 5, panelW, panelH); }

        this.ctx.fillStyle = "#ded895"; this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 6;
        if (this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(panelX, panelY, panelW, panelH, 20); this.ctx.fill(); this.ctx.stroke(); } 
        else { this.ctx.fillRect(panelX, panelY, panelW, panelH); this.ctx.strokeRect(panelX, panelY, panelW, panelH); }

        // Draw Score Boxes
        this.ctx.fillStyle = "#c2b280";
        this.ctx.fillRect(panelX + 220, panelY + 40, 150, 60); this.ctx.fillRect(panelX + 220, panelY + 130, 150, 60);
        this.ctx.strokeRect(panelX + 220, panelY + 40, 150, 60); this.ctx.strokeRect(panelX + 220, panelY + 130, 150, 60);
        this.drawText("SCORE", 28, panelY + 40, panelX + 30, "left", "#ff7a00");
        this.drawText("BEST", 28, panelY + 130, panelX + 30, "left", "#ff7a00");
        this.drawText(this.score.toString(), 42, panelY + 85, panelX + 295, "center", "white");
        this.drawText(this.highScore.toString(), 42, panelY + 175, panelX + 295, "center", "white");
        if (this.isNewBest) this.drawText("NEW!", 20, panelY + 120, panelX + 110, "left", "#ff0000");

        // --- DRAW MEDAL LOGIC ---
        let medalColor = null;
        if (this.score >= 40) medalColor = "#e5e4e2"; // Platinum
        else if (this.score >= 30) medalColor = "#ffd700"; // Gold
        else if (this.score >= 20) medalColor = "#c0c0c0"; // Silver
        else if (this.score >= 10) medalColor = "#cd7f32"; // Bronze

        if (medalColor) {
            let mx = panelX + 90; let my = panelY + 140;
            
            // Ribbon
            this.ctx.fillStyle = "#d1685a";
            this.ctx.fillRect(mx - 15, panelY + 80, 30, 60);
            
            // Medal Base
            this.ctx.beginPath(); this.ctx.arc(mx, my, 40, 0, Math.PI * 2);
            this.ctx.fillStyle = medalColor; this.ctx.fill();
            this.ctx.lineWidth = 4; this.ctx.strokeStyle = "white"; this.ctx.stroke();
            
            // Inner Engraving Detail
            this.ctx.beginPath(); this.ctx.arc(mx, my, 28, 0, Math.PI * 2);
            this.ctx.strokeStyle = "rgba(0,0,0,0.3)"; this.ctx.lineWidth = 2; this.ctx.stroke();
            
            // Shine effect
            this.ctx.beginPath(); this.ctx.arc(mx - 10, my - 10, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = "rgba(255,255,255,0.6)"; this.ctx.fill();
        } else {
            // Empty placeholder box if no medal earned yet
            this.ctx.fillStyle = "rgba(0,0,0,0.1)";
            this.ctx.beginPath(); this.ctx.arc(panelX + 90, panelY + 140, 40, 0, Math.PI * 2); this.ctx.fill();
        }

        this.ctx.restore();
    }

    // --- NEW: ACHIEVEMENTS MENU PANEL ---
    drawAchievementsPanel() {
        let cx = CONFIG.WIDTH / 2; let cy = CONFIG.HEIGHT / 2;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.85)"; this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        
        this.ctx.fillStyle = "#ded895"; this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 6;
        if(this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(cx - 300, cy - 250, 600, 460, 20); this.ctx.fill(); this.ctx.stroke(); }

        this.drawText("ACHIEVEMENTS", 42, cy - 190, cx, "center", "#ffce00");

        // Draw List
        let startY = cy - 120;
        CONFIG.ACHIEVEMENTS.forEach((ach, index) => {
            let col = index % 2;
            let row = Math.floor(index / 2);
            let ax = cx - 250 + (col * 280);
            let ay = startY + (row * 80);

            let isUnlocked = this.unlockedAchievements.includes(ach.id);
            
            this.ctx.fillStyle = isUnlocked ? "#c2b280" : "rgba(0,0,0,0.1)";
            this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 2;
            this.ctx.fillRect(ax, ay, 260, 60); this.ctx.strokeRect(ax, ay, 260, 60);

            // Icon box
            this.ctx.fillStyle = isUnlocked ? "#55aa55" : "#888";
            this.ctx.fillRect(ax + 5, ay + 5, 50, 50);
            this.drawText(isUnlocked ? "✔" : "🔒", 24, ay + 38, ax + 30, "center", "white");

            // Text
            this.drawText(isUnlocked ? ach.name : "???", 18, ay + 25, ax + 65, "left", isUnlocked ? "white" : "#555");
            
            // Smaller description text
            this.ctx.font = `12px Courier`;
            this.ctx.fillStyle = isUnlocked ? "#543847" : "#555";
            this.ctx.fillText(isUnlocked ? ach.desc : "Keep playing to unlock.", ax + 65, ay + 45);
        });

        this.drawButton("BACK", cx, cy + 240, 200, 60, "#d1685a");
    }

    drawSettingsPanel() {
        let cx = CONFIG.WIDTH / 2; let cy = CONFIG.HEIGHT / 2;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; this.ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        this.ctx.fillStyle = "#ded895"; this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 6;
        if(this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(cx - 200, cy - 150, 400, 400, 20); this.ctx.fill(); this.ctx.stroke(); }

        this.drawText("SETTINGS", 36, cy - 100, cx, "center", "white");
        this.drawText("Music:", 28, cy - 50, cx - 150, "left", "white");
        this.drawText("SFX:", 28, cy + 20, cx - 150, "left", "white");
        this.drawText("Vol:", 28, cy + 90, cx - 150, "left", "white");
        this.drawButton(this.settings.bgm ? "ON" : "OFF", cx + 80, cy - 60, 100, 50, this.settings.bgm ? "#55aa55" : "#aa5555");
        this.drawButton(this.settings.sfx ? "ON" : "OFF", cx + 80, cy + 10, 100, 50, this.settings.sfx ? "#55aa55" : "#aa5555");
        this.drawButton("-", cx + 30, cy + 80, 50, 50, "#c2b280");
        this.drawText(Math.round(this.settings.volume * 10).toString(), 28, cy + 90, cx + 80, "center", "white");
        this.drawButton("+", cx + 130, cy + 80, 50, 50, "#c2b280");
        this.drawButton("BACK", cx, cy + 180, 200, 60, "#d1685a");
    }

    drawGround() {
        let img = Assets.images.pipes;
        if (img && img.complete && img.naturalWidth !== 0) {
            let tileW = img.width / 2; let tileH = img.height / 3;
            let scaleMult = CONFIG.GROUND_HEIGHT / tileH; let scaledW = tileW * scaleMult;
            if (this.state === 'PLAYING' || this.state === 'GET_READY') {
                this.groundX -= this.currentSpeed;
                if (this.groundX <= -scaledW) this.groundX = 0;
            }
            for (let i = 0; i <= CONFIG.WIDTH + scaledW; i += scaledW) {
                this.ctx.drawImage(img, 0, tileH * 2, tileW, tileH, this.groundX + i, CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT, scaledW, CONFIG.GROUND_HEIGHT);
            }
        } else {
            this.ctx.fillStyle = "#55aa55"; this.ctx.fillRect(0, CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT, CONFIG.WIDTH, CONFIG.GROUND_HEIGHT);
        }
    }

    // --- NEW: POP-UP NOTIFICATION ---
    drawToast() {
        if (this.toastTimer > 0) {
            this.toastTimer--;
            let cy = Math.min(60, 60 - (this.toastTimer - 160) * 5); // Slide down animation
            if (this.toastTimer < 20) cy = 60 - (20 - this.toastTimer) * 5; // Slide up animation

            this.ctx.save();
            this.ctx.globalAlpha = Math.min(1, this.toastTimer / 20);
            
            this.ctx.fillStyle = "#ffce00"; this.ctx.strokeStyle = "#543847"; this.ctx.lineWidth = 4;
            let cx = CONFIG.WIDTH / 2;
            
            if(this.ctx.roundRect) { this.ctx.beginPath(); this.ctx.roundRect(cx - 250, cy - 30, 500, 60, 30); this.ctx.fill(); this.ctx.stroke(); } 
            else { this.ctx.fillRect(cx - 250, cy - 30, 500, 60); this.ctx.strokeRect(cx - 250, cy - 30, 500, 60); }
            
            this.drawText(`🏆 UNLOCKED: ${this.activeToast}`, 24, cy + 8, cx, "center", "#543847");
            this.ctx.restore();
        }
    }

    loop() {
        let dx = 0, dy = 0;
        if (this.shakeTimer > 0) {
            this.shakeTimer--; dx = (Math.random() - 0.5) * 10; dy = (Math.random() - 0.5) * 10;
        } else if (this.state === 'PLAYING') {
            let chances = {2: 350, 3: 200, 4: 200, 5: 120}; let chance = chances[this.level] || 0;
            if (chance && Math.floor(Math.random() * chance) === 0) this.shakeTimer = 40;
        }

        this.ctx.save(); this.ctx.translate(dx, dy);

        this.ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        let drawBg = (imgIdx, alpha) => {
            let img = Assets.images[`bg_${imgIdx}`];
            this.ctx.globalAlpha = alpha / 255;
            if (img && img.complete) this.ctx.drawImage(img, 0, CONFIG.BG_OFFSET, CONFIG.WIDTH, CONFIG.HEIGHT - CONFIG.BG_OFFSET);
        };
        
        drawBg(this.currentBg, 255);
        if (this.isFading) {
            this.bgAlpha += 3;
            if (this.bgAlpha >= 255) { this.bgAlpha = 255; this.isFading = false; this.currentBg = this.nextBg; }
            drawBg(this.nextBg, this.bgAlpha);
        }
        this.ctx.globalAlpha = 1.0;

        if (this.state === 'PLAYING') {
            this.checkLiveAchievements(); // Constantly check for unlocked medals while playing

            if (this.score > 0 && this.score % 10 === 0 && this.score !== this.lastMilestone) {
                this.lastMilestone = this.score;
                do { this.nextBg = Math.floor(Math.random() * CONFIG.BACKGROUNDS.length); } while (this.nextBg === this.currentBg);
                this.isFading = true; this.bgAlpha = 0;
            }

            this.level = Math.min(5, Math.floor(this.score / 10) + 1);
            this.currentSpeed = Math.min(CONFIG.PIPE_SPEED + Math.floor(this.score / 10), CONFIG.MAX_PIPE_SPEED);
            this.bird.gravity = CONFIG.GRAVITY + ((this.currentSpeed - CONFIG.PIPE_SPEED) * 0.02);

            let crashedIntoPipe = this.checkCollisions();
            if (this.bird.update(this.currentSpeed) || crashedIntoPipe) this.triggerDeath(crashedIntoPipe);

            let lastPipe = this.pipes[this.pipes.length - 2];
            if (lastPipe && lastPipe.x < CONFIG.WIDTH - CONFIG.HORIZ_GAP) this.spawnPipes();

            this.pipes.forEach(p => {
                p.update(this.currentSpeed, this.shakeTimer > 0);
                if (!p.scored && p.x + p.w < this.bird.x) { if (!p.isTop) this.score++; p.scored = true; }
            });
            this.pipes = this.pipes.filter(p => !p.markedForDeletion);
        }

        if (this.state === 'GAMEOVER') this.bird.update();

        if (this.state === 'PLAYING' || this.state === 'GAMEOVER') {
            this.pipes.forEach(p => p.draw(this.ctx));
            
        }
        
        this.drawGround();
        
        if (this.state === 'MENU' || this.state === 'ACHIEVEMENTS') {
            this.bird.x += ((CONFIG.WIDTH / 2) - this.bird.x) * 0.05; 
            this.bird.y = (CONFIG.HEIGHT / 2 - 90) + Math.sin(Date.now() / 200) * 10;
        } else if (this.state === 'GET_READY') {
            this.bird.x = 200; 
            this.bird.y = (CONFIG.HEIGHT / 2) + Math.sin(Date.now() / 200) * 10; 
        } else if (this.state === 'PLAYING') {
            if (Math.abs(this.bird.x - 200) > 1) { this.bird.x += (200 - this.bird.x) * 0.02; } 
            else { this.bird.x = 200; }
        }
        
        // Hide the bird entirely if the settings menu is open
        if (this.state !== 'SETTINGS') {
            this.bird.draw(this.ctx);
        }

        let cx = CONFIG.WIDTH / 2; let cy = CONFIG.HEIGHT / 2;

        if (this.state === 'MENU') {
            this.drawText(CONFIG.TITLE, 54, cy - 200, cx, "center", "#ffce00");
            
            this.drawButton("<", cx - 120, cy - 90, 50, 50, "#ded895", "#543847");
            this.drawButton(">", cx + 120, cy - 90, 50, 50, "#ded895", "#543847");
            let currentWing = this.wingStyles[this.wingIndex].toUpperCase();
            this.drawText(currentWing, 22, cy - 20, cx, "center", "white");

            this.drawButton("PLAY", cx, cy + 50, 200, 60, "#55aa55");
            this.drawButton("SETTINGS", cx, cy + 120, 200, 60);
            this.drawButton("ACHIEVEMENTS", cx, cy + 190, 200, 60, "#ff7a00");
            this.drawButton("CHARACTER", cx, cy + 260, 200, 60, "#4287f5");
        }

        if (this.state === 'SETTINGS') this.drawSettingsPanel();
        if (this.state === 'ACHIEVEMENTS') this.drawAchievementsPanel();

        if (this.state === 'GET_READY') {
            this.drawText("GET READY!", 54, cy - 100, cx, "center", "#ff7a00");
            this.drawText("Tap or Space to start", 28, cy + 100);
        }

        if (this.state === 'PLAYING') {
            this.drawText(this.score.toString(), 48, 80);
            this.drawText(`LEVEL ${this.level}`, 22, CONFIG.HEIGHT - 30);
        }

        if (this.state === 'GAMEOVER') {
            this.drawText("GAME OVER", 48, cy - 210);
            this.drawScorePanel();
            this.drawButton("RESTART", cx - 110, cy + 160, 180, 60, "#55aa55");
            this.drawButton("QUIT", cx + 110, cy + 160, 180, 60, "#d1685a");
        }

        this.drawToast(); // Draw pop-up over everything

        this.ctx.restore();
        requestAnimationFrame(this.loop);
    }
}