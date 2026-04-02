import { CONFIG } from './config.js';
import { Assets } from './assets.js';

export class Bird {
    constructor() {
        this.x = 200; 
        this.y = CONFIG.HEIGHT / 2;
        this.size = CONFIG.BIRD_SIZE;
        this.velocity = 0;
        this.gravity = CONFIG.GRAVITY;
        
        // NEW: Trail properties
        this.trail = [];
        this.maxTrailLength = 25; // Number of ghosts
    }

    flap() { this.velocity = CONFIG.FLAP_STRENGTH; }

    update(speed = 0) {
        // Shift all existing trail points leftwards by the world speed
        for (let i = 0; i < this.trail.length; i++) {
            this.trail[i].x -= speed;
        }

        // Record current position for the trail before updating
        this.trail.unshift({ x: this.x, y: this.y, angle: this.currentAngle || 0 });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }

        this.velocity = Math.min(this.velocity + this.gravity, CONFIG.MAX_FALL_SPEED);
        this.y += this.velocity;
        
        if (this.y - this.size/2 <= 0) {
            this.y = this.size/2;
            this.velocity = 0;
        }

        const groundLevel = CONFIG.HEIGHT - CONFIG.GROUND_HEIGHT + 35;
        if (this.y + this.size/2 >= groundLevel) {
            this.y = groundLevel - this.size/2;
            this.velocity = 0;
            return true; 
        }
        return false;
    }

    // NEW: Method to draw the fading ghosts
    drawTrail(ctx) {
        if (this.trail.length < 2) return;

        ctx.save();
        ctx.lineWidth = 4;            // Thickness of the line
        ctx.strokeStyle = 'white';    // Color
        ctx.setLineDash([10, 5]);    // [dash length, gap length] makes it dotted
        ctx.lineCap = 'butt';

        // We draw the line segment by segment so we can keep the nice fade-out effect
        for (let i = 0; i < this.trail.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(this.trail[i].x, this.trail[i].y);
            ctx.lineTo(this.trail[i + 1].x, this.trail[i + 1].y);
            
            // Older positions fade to transparent
            ctx.globalAlpha = 1 - (i / this.maxTrailLength); 
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawRetroWing(ctx, style, isFlapping) {
        const pixelSize = 5; 
        const designs = {
            'classic': { palette: {'W':'#FFFFFF', 'G':'#DDDDDD', 'B':'#543847'}, art: ["  BB    ", " BGWBB  ", "BWWWGBB ", "BWWWWWB ", " BBWWWB ", "   BWWB ", "    BBB "] },
            'bat': { palette: {'P':'#663399', 'D':'#330066', 'B':'#111111'}, art: ["  B     ", " BDB    ", "BPPBB B ", "BPPPPBDB", " BPPPPPB", "  BBDBB ", "    B   "] },
            'mecha': { palette: {'O':'#FF7A00', 'M':'#CCCCCC', 'D':'#888888', 'B':'#222222'}, art: ["   BBB  ", "  BMMMB ", " BOOOOMB", " BOOOOMB", " BBMMMB ", "   BBB  "] },
            'fairy': { palette: {'P':'#FFB6C1', 'C':'#00FFFF', 'B':'#FF69B4'}, art: ["   BB   ", "  BPCB  ", " BPPPCB ", " BPPPCB ", "  BPCB  ", "   BB   "] },
            'demon': { palette: {'R':'#FF0000', 'D':'#8B0000', 'B':'#000000'}, art: ["B       ", "BRB     ", "BRRBB B ", "BRRRRBDB", " BRRRRRB", "  BBDRB ", "    B   "] },
            'angel': { palette: {'G':'#FFD700', 'W':'#FFFFFF', 'B':'#DAA520'}, art: ["  BB    ", " BGWBB  ", "BWWWGBB ", "BWWWWWB ", " BBWWWB ", "  BWWWB ", "   BBB  "] },
            'dragon': { palette: {'G':'#32CD32', 'Y':'#FFD700', 'B':'#006400'}, art: ["  B     ", " BGB    ", "BGYBB B ", "BGYYYBGB", " BGYYYYB", "  BBGBB ", "    B   "] },
            'butterfly': { palette: {'M':'#FF00FF', 'C':'#00FFFF', 'B':'#000080'}, art: [" B   B  ", " BMBMB  ", "BMMCMMB ", "BMMMMMB ", " BMBMB  ", "  BBB   "] },
            'bone': { palette: {'W':'#F5F5F5', 'G':'#A9A9A9', 'B':'#2F4F4F'}, art: ["  BB    ", " BWWBB  ", "BWBBWWB ", "BWWWWWWB", " BBWWBB ", "   BB   "] },
            'crystal': { palette: {'C':'#00FFFF', 'L':'#E0FFFF', 'B':'#008B8B'}, art: ["   B    ", "  BCCB  ", " BCCLCB ", "BCCCCCB ", " BCCLCB ", "  BCCB  ", "   B    "] }
        };

        const wingData = designs[style] || designs['classic'];
        ctx.save();
        ctx.translate(-this.size * 0.15, 0);
        let flapAngle = isFlapping ? (Math.PI / 4) : (-Math.PI / 6);
        ctx.rotate(flapAngle);

        for (let row = 0; row < wingData.art.length; row++) {
            let line = wingData.art[row];
            for (let col = 0; col < line.length; col++) {
                let char = line[col];
                if (wingData.palette[char]) {
                    ctx.fillStyle = wingData.palette[char];
                    let px = col * pixelSize - (line.length * pixelSize); 
                    let py = row * pixelSize - ((wingData.art.length * pixelSize) / 2);
                    ctx.fillRect(px, py, pixelSize, pixelSize);
                }
            }
        }
        ctx.restore();
    }

    draw(ctx) {
        // NEW: Draw the trail BEFORE the bird so it appears behind
        this.drawTrail(ctx);

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y));
        
        this.currentAngle = Math.max(Math.min(-this.velocity * 3, 30), -90) * Math.PI / -120;
        ctx.rotate(this.currentAngle);
        ctx.imageSmoothingEnabled = false;

        let wingStyle = localStorage.getItem('flappyBinnieWingStyle') || 'classic';
        let isFlapping = this.velocity < -2; 
        if (this.velocity === 0) isFlapping = Math.sin(Date.now() / 100) > 0; 

        this.drawRetroWing(ctx, wingStyle, isFlapping);

        let customFace = localStorage.getItem('flappyBinnieCustomFace');
        if (Assets.images.bird && Assets.images.bird.complete && Assets.images.bird.naturalWidth !== 0) {
            if (customFace) {
                ctx.beginPath();
                ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
            }
            ctx.drawImage(Assets.images.bird, -this.size/2, -this.size/2, this.size, this.size);
        } else {
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(0, 0, this.size/2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

export class Pipe {
    constructor(x, y, isTop, slideDir, slideSpd, slideRng, styleIdx) {
        this.x = x; this.y = y; this.w = CONFIG.PIPE_WIDTH; this.h = CONFIG.HEIGHT; 
        this.isTop = isTop; this.baseY = y; this.slideDir = slideDir;
        this.slideSpd = slideSpd; this.slideRng = slideRng; this.styleIdx = styleIdx;
        this.scored = false; this.markedForDeletion = false;
    }
    update(speed, isShaking) {
        this.x -= speed;
        if (isShaking && this.slideSpd > 0) {
            this.y += (this.slideSpd * this.slideDir);
            if (Math.abs(this.y - this.baseY) > this.slideRng) this.slideDir *= -1;
        }
        if (this.x + this.w < -50) this.markedForDeletion = true;
    }
    draw(ctx) {
        let img = Assets.images.pipes;
        if (img && img.complete && img.naturalWidth !== 0) {
            let tileW = img.width / 4; let tileH = img.height / 4;
            let scaleMult = this.w / tileW; let propH = tileH * scaleMult;
            ctx.save();
            if (this.isTop) {
                ctx.translate(this.x + this.w / 2, this.y);
                ctx.scale(1, -1);
                ctx.translate(-(this.x + this.w / 2), -this.y);
            }
            let bodyY = this.isTop ? this.y : this.y + propH;
            ctx.drawImage(img, this.styleIdx * tileW, tileH, tileW, tileH, this.x, bodyY, this.w, CONFIG.HEIGHT);
            ctx.drawImage(img, this.styleIdx * tileW, 0, tileW, tileH, this.x, this.y, this.w, propH);
            ctx.restore();
        } else {
            ctx.fillStyle = 'green';
            if (this.isTop) ctx.fillRect(this.x, this.y - this.h, this.w, this.h);
            else ctx.fillRect(this.x, this.y, this.w, this.h);
        }
    }
    getBounds() {
        return this.isTop ? { x: this.x, y: this.y - this.h, w: this.w, h: this.h } : { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}