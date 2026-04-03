import { CONFIG, BIRD_DESIGNS } from "./config.js";
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
    let startIdx =
      (this.trailIndex - 1 + this.maxTrailLength) % this.maxTrailLength;
    ctx.moveTo(this.trail[startIdx].x, this.trail[startIdx].y);

    for (let i = 1; i < activeCount; i++) {
      let idx =
        (this.trailIndex - 1 - i + this.maxTrailLength) % this.maxTrailLength;
      if (this.trail[idx].active) {
        ctx.lineTo(this.trail[idx].x, this.trail[idx].y);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  drawRetroWing(ctx, style, isFlapping, hideBody = false) {
    let flapState = isFlapping ? "flap" : "idle";
    let bodyState = hideBody ? "nobody" : "body"; // Update the cache key!
    let cacheKey = `${style}_${flapState}`;

    if (!wingCache[cacheKey]) {
      const wingScale = 1.2;
      const pixelSize = 7 * wingScale;

      // Grab the blueprint from config instead!
      const wingData = BIRD_DESIGNS[style] || BIRD_DESIGNS["classic"];

      let oc = document.createElement("canvas");
      oc.width = 150;
      oc.height = 150;
      let octx = oc.getContext("2d");

      octx.translate(75, 75);

      // --- DRAW PIXEL-ART ROUNDED BIRD BODY ---
      if (!hideBody) {
        let colors = Object.values(wingData.palette);
        let mainColor = colors[1] || "#FFD700";
        let eyeColor = colors[2] || "#000000";

        // 1. Black Outline (Stair-stepped pixel corners)
        octx.fillStyle = "#000";
        octx.fillRect(-15, -25, 30, 50); // Top & Bottom edges
        octx.fillRect(-25, -15, 50, 30); // Left & Right edges
        octx.fillRect(-20, -20, 40, 40); // Corner fillers

        // 2. Main Body Color (Matching the outline shape but smaller)
        octx.fillStyle = mainColor;
        octx.fillRect(-10, -20, 20, 40);
        octx.fillRect(-20, -10, 40, 20);
        octx.fillRect(-15, -15, 30, 30);

        // 3. Pixel Eye (White background, colored pupil)
        octx.fillStyle = "white";
        octx.fillRect(4, -16, 16, 16);
        octx.fillStyle = eyeColor;
        octx.fillRect(12, -12, 8, 8);

        // 4. Pixel Beak (With a black outline to match the body)
        octx.fillStyle = "#000";
        octx.fillRect(18, -2, 24, 14); // Beak Outline
        octx.fillStyle = "#FF8C00";
        octx.fillRect(20, 0, 20, 10); // Inside Beak
      }
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
      wingCache[cacheKey] = oc;
    }

    ctx.save();
    ctx.translate(-this.size * 0.15, 0);
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
    let customFace = localStorage.getItem("flappyBinnieCustomFace");
    let isFlapping = this.velocity < -2;
    if (this.velocity === 0) isFlapping = Math.sin(Date.now() / 100) > 0;

    // RULE 1: If they have a Custom Camera Face, draw that!
    if (customFace && Assets.images.bird && Assets.images.bird.complete) {
      // We deleted the ctx.clip() here so the wings can finally escape the circle!
      ctx.drawImage(
        Assets.images.bird,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size,
      );
      // Pass 'true' at the end to hide the yellow body!
      this.drawRetroWing(ctx, "classic", isFlapping, true);
    }

    // RULE 2: If they explicitly equipped Ribinie (and unlocked it), draw the Ribinie PNG!
    else if (
      wingStyle === "ribinie" &&
      Assets.images.bird &&
      Assets.images.bird.complete
    ) {
      ctx.drawImage(
        Assets.images.bird,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size,
      );
    }
    // RULE 3: Draw the 100% Coded Pixel Art Bird!
    else {
      this.drawRetroWing(ctx, wingStyle, isFlapping);
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

export class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 38;
    this.markedForDeletion = false;

    // Randomize the starting spin and bob cycle so they don't all look identical
    this.timeOffset = Math.random() * 100;
  }

  update(speed) {
    this.x -= speed;
    if (this.x < -50) this.markedForDeletion = true; // Delete when off screen
  }

  draw(ctx) {
    let img = Assets.images.coin;
    let time = Date.now() / 150 + this.timeOffset;

    // 1. Bobbing motion (up and down)
    let bobY = this.y + Math.sin(time * 0.5) * 10;

    // 2. Fake 3D Spin (squishing the width back and forth)
    let scaleX = Math.cos(time);

    ctx.save();
    ctx.translate(this.x, bobY);
    ctx.scale(scaleX, 1); // This squishes the image to fake the 3D rotation

    if (img && img.complete && img.naturalWidth !== 0) {
      // Draw the graphic
      ctx.drawImage(
        img,
        -this.radius,
        -this.radius,
        this.radius * 2,
        this.radius * 2,
      );
    } else {
      // Fallback: Draw a yellow circle if the image is missing
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. The Glint Effect (Draws a shiny white flash when the coin faces the camera)
    if (scaleX > 0.8) {
      ctx.fillStyle = `rgba(255, 255, 255, ${(scaleX - 0.8) * 5})`;
      ctx.beginPath();
      ctx.arc(
        -this.radius / 3,
        -this.radius / 3,
        this.radius / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }
}
