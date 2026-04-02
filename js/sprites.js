import { CONFIG } from "./config.js";
import { Assets } from "./assets.js";

// --- OPTIMIZATION STEP 1: WING CACHE ---
// We create an offscreen canvas to pre-render the wings just ONCE.
// This saves the CPU from doing thousands of fillRect calls every frame!
const wingCache = {};

export class Bird {
  constructor() {
    this.x = 200;
    this.y = CONFIG.HEIGHT / 2;
    this.size = CONFIG.BIRD_SIZE;
    this.velocity = 0;
    this.gravity = CONFIG.GRAVITY;

    // --- OPTIMIZATION STEP 2: OBJECT POOLING ---
    // Instead of creating and destroying arrays constantly, we create exactly 25 objects 
    // ONCE when the game starts, and just recycle them. No more Garbage Collection lag!
    this.maxTrailLength = 25;
    this.trail = Array.from({ length: this.maxTrailLength }, () => ({
      x: 0,
      y: 0,
      active: false,
    }));
    this.trailIndex = 0;
  }

  flap() {
    this.velocity = CONFIG.FLAP_STRENGTH;
  }

  update(speed = 0) {
    // Shift all existing active trail points leftwards by the world speed
    for (let i = 0; i < this.maxTrailLength; i++) {
      if (this.trail[i].active) this.trail[i].x -= speed;
    }

    // Grab the next available object in our pool and update its values
    let currentGhost = this.trail[this.trailIndex];
    currentGhost.x = this.x;
    currentGhost.y = this.y;
    currentGhost.active = true;

    // Move to the next index, looping back to 0 if we hit the max (Circular Buffer)
    this.trailIndex = (this.trailIndex + 1) % this.maxTrailLength;

    this.velocity = Math.min(
      this.velocity + this.gravity,
      CONFIG.MAX_FALL_SPEED,
    );
    this.y += this.velocity;

    if (this.y - this.size / 2 <= 0) {
      this.y = this.size / 2;
      this.velocity = 0;
    }

    const groundLevel = CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT + 35;
    if (this.y + this.size / 2 >= groundLevel) {
      this.y = groundLevel - this.size / 2;
      this.velocity = 0;
      return true;
    }
    return false;
  }

  // --- OPTIMIZATION STEP 3: TRAIL DRAWING ---
  drawTrail(ctx) {
    let activeCount = this.trail.filter((t) => t.active).length;
    if (activeCount < 2) return;

    ctx.save();
    ctx.lineWidth = 4;
    
    // Instead of looping to change alpha every segment (very slow), 
    // we use a single semi-transparent path for the entire trail (super fast!)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)"; 
    ctx.setLineDash([10, 5]);
    ctx.lineCap = "round";

    ctx.beginPath();
    
    // Start drawing from the most recently placed trail point
    let startIdx = (this.trailIndex - 1 + this.maxTrailLength) % this.maxTrailLength;
    ctx.moveTo(this.trail[startIdx].x, this.trail[startIdx].y);

    for (let i = 1; i < activeCount; i++) {
      let idx = (this.trailIndex - 1 - i + this.maxTrailLength) % this.maxTrailLength;
      if (this.trail[idx].active) {
        ctx.lineTo(this.trail[idx].x, this.trail[idx].y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  drawRetroWing(ctx, style, isFlapping) {
    let flapState = isFlapping ? "flap" : "idle";
    let cacheKey = `${style}_${flapState}`;

    // If we haven't drawn this wing before, draw it to an invisible canvas and save it
    if (!wingCache[cacheKey]) {
      const wingScale = 1.2;
      const pixelSize = 7 * wingScale;
      const designs = {
        classic: { palette: { W: "#FFFFFF", G: "#DDDDDD", B: "#543847" }, art: ["  BB    ", " BGWBB  ", "BWWWGBB ", "BWWWWWB ", " BBWWWB ", "   BWWB ", "    BBB "] },
        bat: { palette: { P: "#663399", D: "#330066", B: "#111111" }, art: ["  B     ", " BDB    ", "BPPBB B ", "BPPPPBDB", " BPPPPPB", "  BBDBB ", "    B   "] },
        mecha: { palette: { O: "#FF7A00", M: "#CCCCCC", D: "#888888", B: "#222222" }, art: ["   BBB  ", "  BMMMB ", " BOOOOMB", " BOOOOMB", " BBMMMB ", "   BBB  "] },
        fairy: { palette: { P: "#FFB6C1", C: "#00FFFF", B: "#FF69B4" }, art: ["   BB   ", "  BPCB  ", " BPPPCB ", " BPPPCB ", "  BPCB  ", "   BB   "] },
        demon: { palette: { R: "#FF0000", D: "#8B0000", B: "#000000" }, art: ["B       ", "BRB     ", "BRRBB B ", "BRRRRBDB", " BRRRRRB", "  BBDRB ", "    B   "] },
        angel: { palette: { G: "#FFD700", W: "#FFFFFF", B: "#DAA520" }, art: ["  BB    ", " BGWBB  ", "BWWWGBB ", "BWWWWWB ", " BBWWWB ", "  BWWWB ", "   BBB  "] },
        dragon: { palette: { G: "#32CD32", Y: "#FFD700", B: "#006400" }, art: ["  B     ", " BGB    ", "BGYBB B ", "BGYYYBGB", " BGYYYYB", "  BBGBB ", "    B   "] },
        butterfly: { palette: { M: "#FF00FF", C: "#00FFFF", B: "#000080" }, art: [" B   B  ", " BMBMB  ", "BMMCMMB ", "BMMMMMB ", " BMBMB  ", "  BBB   "] },
        bone: { palette: { W: "#F5F5F5", G: "#A9A9A9", B: "#2F4F4F" }, art: ["  BB    ", " BWWBB  ", "BWBBWWB ", "BWWWWWWB", " BBWWBB ", "   BB   "] },
        crystal: { palette: { C: "#00FFFF", L: "#E0FFFF", B: "#008B8B" }, art: ["   B    ", "  BCCB  ", " BCCLCB ", "BCCCCCB ", " BCCLCB ", "  BCCB  ", "   B    "] },
      };

      const wingData = designs[style] || designs["classic"];
      
      let oc = document.createElement("canvas");
      oc.width = 150; // Ensure canvas is large enough for the rotated wing
      oc.height = 150;
      let octx = oc.getContext("2d");
      
      octx.translate(75, 75); // Move to center of offscreen canvas
      let flapAngle = isFlapping ? Math.PI / 4 : -Math.PI / 6;
      octx.rotate(flapAngle);

      for (let row = 0; row < wingData.art.length; row++) {
        let line = wingData.art[row];
        for (let col = 0; col < line.length; col++) {
          let char = line[col];
          if (wingData.palette[char]) {
            octx.fillStyle = wingData.palette[char];
            let px = col * pixelSize - line.length * pixelSize;
            let py = row * pixelSize - (wingData.art.length * pixelSize) / 2;
            octx.fillRect(px, py, pixelSize, pixelSize);
          }
        }
      }
      wingCache[cacheKey] = oc; // Save it to the cache!
    }

    // Instantly draw the cached image (GPU accelerated)
    ctx.save();
    ctx.translate(-this.size * 0.15, 0);
    // Draw offset by 75 to account for the offscreen canvas center
    ctx.drawImage(wingCache[cacheKey], -75, -75);
    ctx.restore();
  }

  draw(ctx) {
    this.drawTrail(ctx);

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));

    this.currentAngle =
      (Math.max(Math.min(-this.velocity * 3, 30), -90) * Math.PI) / -120;
    ctx.rotate(this.currentAngle);
    ctx.imageSmoothingEnabled = false;

    let wingStyle = localStorage.getItem("flappyBinnieWingStyle") || "classic";
    let isFlapping = this.velocity < -2;
    if (this.velocity === 0) isFlapping = Math.sin(Date.now() / 100) > 0;

    this.drawRetroWing(ctx, wingStyle, isFlapping);

    let customFace = localStorage.getItem("flappyBinnieCustomFace");
    if (
      Assets.images.bird &&
      Assets.images.bird.complete &&
      Assets.images.bird.naturalWidth !== 0
    ) {
      if (customFace) {
        ctx.beginPath();
        ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      }
      ctx.drawImage(
        Assets.images.bird,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size,
      );
    } else {
      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class Pipe {
  constructor(x, y, isTop, slideDir, slideSpd, slideRng, styleIdx) {
    this.x = x;
    this.y = y;
    this.w = CONFIG.PIPE_WIDTH;
    this.h = CONFIG.HEIGHT;
    this.isTop = isTop;
    this.baseY = y;
    this.slideDir = slideDir;
    this.slideSpd = slideSpd;
    this.slideRng = slideRng;
    this.styleIdx = styleIdx;
    this.scored = false;
    this.markedForDeletion = false;
  }
  update(speed, isShaking) {
    this.x -= speed;
    if (isShaking && this.slideSpd > 0) {
      this.y += this.slideSpd * this.slideDir;
      if (Math.abs(this.y - this.baseY) > this.slideRng) this.slideDir *= -1;
    }
    if (this.x + this.w < -50) this.markedForDeletion = true;
  }
  draw(ctx) {
    let img = Assets.images.pipes;
    if (img && img.complete && img.naturalWidth !== 0) {
      let tileW = img.width / 4;
      let tileH = img.height / 4;
      let scaleMult = this.w / tileW;
      let propH = tileH * scaleMult;
      
      // 1. Math.floor prevents the sides of the pipes from looking blurry!
      let drawX = Math.floor(this.x);
      let drawY = Math.floor(this.y);
      let drawW = Math.ceil(this.w);

      ctx.save();
      if (this.isTop) {
        ctx.translate(drawX + drawW / 2, drawY);
        ctx.scale(1, -1);
        ctx.translate(-(drawX + drawW / 2), -drawY);
      }
      
      // 2. THE FIX: We subtract 2 pixels from the bottom pipe's bodyY 
      // so it tucks securely underneath the cap image!
      let bodyY = this.isTop ? drawY : drawY + propH - 2;
      
      // Draw the Body First
      ctx.drawImage(
        img,
        this.styleIdx * tileW,
        tileH,
        tileW,
        tileH,
        drawX,
        bodyY,
        drawW,
        CONFIG.HEIGHT,
      );
      
      // Draw the Cap Second (Overlapping the body)
      ctx.drawImage(
        img,
        this.styleIdx * tileW,
        0,
        tileW,
        tileH,
        drawX,
        drawY,
        drawW,
        propH,
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "green";
      if (this.isTop) ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
      else ctx.fillRect(this.x, this.y, this.w, this.h);
    }
  }
  getBounds() {
    return this.isTop
      ? { x: this.x, y: this.y - this.h, w: this.w, h: this.h }
      : { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}