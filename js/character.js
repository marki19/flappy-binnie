import { Assets } from "./assets.js";
import { CONFIG, BIRD_DESIGNS } from "./config.js";
import { savePlayerData } from "./database.js";

// --- UPDATED ROSTER WITH 10 NEW PREMIUM BIRDS ---
// The Expanded 20 Base Characters
// The Expanded 20 Base Characters
// The Expanded 20 Base Characters
const BIRD_ROSTER = [
  { id: "classic", name: "Classic", req: "free" },
  { id: "bat", name: "Bat", req: "free" },
  { id: "mecha", name: "Mecha", req: "free" },
  { id: "fairy", name: "Fairy", req: "first_flap", desc: "Play 1 Game" },
  { id: "demon", name: "Demon", req: "score_10", desc: "Score 10+" },
  { id: "angel", name: "Angel", req: "score_20", desc: "Score 20+" },
  { id: "dragon", name: "Dragon", req: "score_30", desc: "Score 30+" },
  { id: "butterfly", name: "Butterfly", req: "score_40", desc: "Score 40+" },
  { id: "bone", name: "Bone", req: "max_speed", desc: "Reach Speed Lv 5" },
  { id: "crystal", name: "Crystal", req: "die_pipe", desc: "Hit a Pipe" },
  { id: "ninja", name: "Ninja", req: "score_50", desc: "Score 50+" },
  { id: "pirate", name: "Pirate", req: "score_60", desc: "Score 60+" },
  { id: "zombie", name: "Zombie", req: "score_70", desc: "Score 70+" },
  { id: "alien", name: "Alien", req: "score_80", desc: "Score 80+" },
  { id: "ghost", name: "Ghost", req: "score_90", desc: "Score 90+" },
  { id: "phoenix", name: "Phoenix", req: "score_100", desc: "Score 100+" },

  // --- PURCHASABLE BIRDS ---
  { id: "king", name: "King", req: "buy_king", cost: 100 },
  { id: "cyborg", name: "Cyborg", req: "buy_cyborg", cost: 250 },
  { id: "wizard", name: "Wizard", req: "buy_wizard", cost: 500 },
  { id: "god", name: "God", req: "buy_god", cost: 1000 },
];
export const CharacterMenu = {
  // --- 1. CAMERA/CROP UI ELEMENTS ---
  ui: document.getElementById("charMenuUI"),
  canvas: document.getElementById("cropCanvas"),
  video: document.getElementById("cameraFeed"),
  ctx: null,
  img: null,
  stream: null,
  imgX: 150,
  imgY: 150,
  imgScale: 1,
  baseScale: 1,
  isDragging: false,
  startX: 0,
  startY: 0,

  init() {
    if (this.canvas) this.ctx = this.canvas.getContext("2d");
    if (this.ui) this.bindEvents(); // Only bind if the HTML exists
  },

  // --- 2. SHOP UI LOGIC ---
  open: function (gameInstance) {
    const modal = document.getElementById("shop-modal");
    if (modal) modal.classList.remove("hidden");

    const closeBtn = document.getElementById("close-shop");
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add("hidden");
      };
    }

    this.renderShop(gameInstance);
  },

  renderShop: function (game) {
    document.getElementById("shop-coins").innerText = game.coins;
    const grid = document.getElementById("shop-grid");
    const premiumGrid = document.getElementById("premium-grid");

    grid.innerHTML = "";
    premiumGrid.innerHTML = "";

    let currentWing =
      localStorage.getItem("flappyBinnieWingStyle") || "classic";
    let hasCustomFace = localStorage.getItem("flappyBinnieCustomFace");

    // --- THE MINI ICON GENERATOR ---
    const getBirdIcon = (id) => {
      let oc = document.createElement("canvas");
      oc.width = 60;
      oc.height = 60;
      let octx = oc.getContext("2d");
      octx.translate(30, 30);
      octx.scale(0.8, 0.8);
      const design = BIRD_DESIGNS[id] || BIRD_DESIGNS["classic"];
      let colors = Object.values(design.palette);

      // Draw Body
      octx.fillStyle = "#000";
      octx.fillRect(-15, -25, 30, 50);
      octx.fillRect(-25, -15, 50, 30);
      octx.fillRect(-20, -20, 40, 40);
      octx.fillStyle = colors[1] || "#FFD700";
      octx.fillRect(-10, -20, 20, 40);
      octx.fillRect(-20, -10, 40, 20);
      octx.fillRect(-15, -15, 30, 30);

      // Draw Face
      octx.fillStyle = "white";
      octx.fillRect(4, -16, 16, 16);
      octx.fillStyle = colors[2] || "#000";
      octx.fillRect(12, -12, 8, 8);
      octx.fillStyle = "#000";
      octx.fillRect(18, -2, 24, 14);
      octx.fillStyle = "#FF8C00";
      octx.fillRect(20, 0, 20, 10);

      // Draw Wing
      for (let r = 0; r < design.art.length; r++) {
        for (let c = 0; c < design.art[r].length; c++) {
          let char = design.art[r][c];
          if (design.palette[char]) {
            octx.fillStyle = design.palette[char];
            octx.fillRect(c * 7 - 50, r * 7 - 20, 7, 7);
          }
        }
      }
      return oc.toDataURL();
    };

    // 1. RENDER STANDARD ROSTER WITH IMAGES
    // 1. RENDER STANDARD ROSTER WITH IMAGES & STORE LOGIC
    // 1. RENDER STANDARD ROSTER WITH IMAGES & BUY LOGIC
    BIRD_ROSTER.forEach((bird) => {
      let isUnlocked =
        bird.req === "free" || game.unlockedAchievements.includes(bird.req);
      let isEquipped = currentWing === bird.id && !hasCustomFace;

      let btn = document.createElement("button");
      // If it's a purchase item and we don't have enough money, keep it locked
      let canAfford = bird.cost ? game.coins >= bird.cost : false;
      let lockedClass =
        !isUnlocked && (!bird.cost || !canAfford) ? "locked" : "";

      btn.className = `shop-item ${lockedClass} ${isEquipped ? "equipped" : ""}`;

      let imgFilter = !isUnlocked ? "filter: brightness(0) opacity(0.3);" : "";
      let imgHTML = `<img src="${getBirdIcon(bird.id)}" style="width:50px; height:50px; image-rendering:pixelated; margin-bottom:5px; ${imgFilter}" />`;

      // Format the locked text (Show cost if it's a shop item!)
      let lockText = bird.cost ? `🔒 Cost: ${bird.cost} 💰` : `🔒 ${bird.desc}`;

      btn.innerHTML = `${imgHTML}<br><span>${bird.name}</span><br><small>${isUnlocked ? (isEquipped ? "EQUIPPED" : "UNLOCKED") : lockText}</small>`;

      btn.onclick = () => {
        if (isUnlocked) {
          // Equip Item
          localStorage.setItem("flappyBinnieWingStyle", bird.id);
          localStorage.removeItem("flappyBinnieCustomFace");
          game.wingIndex = game.wingStyles.indexOf(bird.id);
          game.playSFX("flap");
          document.getElementById("shop-modal").classList.add("hidden");
        } else if (bird.cost && game.coins >= bird.cost) {
          // Buy Item!
          game.coins -= bird.cost;
          game.unlockedAchievements.push(bird.req);
          localStorage.setItem(
            "flappyBinnieAchievements",
            JSON.stringify(game.unlockedAchievements),
          );
          savePlayerData(
            game.username,
            game.highScore,
            game.coins,
            game.unlockedAchievements,
          );
          game.playSFX("coin");
          this.renderShop(game); // Re-draw the shop to show it unlocked!
        } else {
          // Can't afford / Score not high enough
          game.playSFX("error");
        }
      };
      grid.appendChild(btn);
    });

    // 2. RENDER RIBINIE (Needs 100 High Score)
    // FIX: Directly check the achievement so hacked scores perfectly sync!
    let isRibinieUnlocked = game.unlockedAchievements.includes("score_100");
    let isRibinieEquipped = currentWing === "ribinie" && !hasCustomFace;

    let ribFilter = !isRibinieUnlocked
      ? "filter: brightness(0) opacity(0.3);"
      : "";
    let ribImg = `<img src="${CONFIG.CHAR_IMG}" style="width:50px; height:50px; object-fit:contain; image-rendering:pixelated; margin-bottom:5px; ${ribFilter}" />`;

    let ribBtn = document.createElement("button");
    ribBtn.className = `shop-item ${!isRibinieUnlocked ? "locked" : ""} ${isRibinieEquipped ? "equipped" : ""}`;
    ribBtn.innerHTML = `${ribImg}<br><span>👑 Ribinie</span><br><small>${isRibinieUnlocked ? (isRibinieEquipped ? "EQUIPPED" : "UNLOCKED") : "🔒 Reach 100 Pts"}</small>`;

    ribBtn.onclick = () => {
      if (isRibinieUnlocked) {
        localStorage.setItem("flappyBinnieWingStyle", "ribinie");
        localStorage.removeItem("flappyBinnieCustomFace");
        game.wingIndex = -1;
        game.playSFX("flap");
        document.getElementById("shop-modal").classList.add("hidden"); // Auto Close!
      } else {
        game.playSFX("error");
      }
    };
    premiumGrid.appendChild(ribBtn);

    // 3. RENDER CUSTOM FACE
    let ownsCustom = game.unlockedAchievements.includes("owns_custom_face");
    let customGraphic = hasCustomFace
      ? `<img src="${hasCustomFace}" style="width:50px; height:50px; image-rendering:pixelated; margin-bottom:5px;" />`
      : `<div style="font-size:36px; margin-bottom:5px;">📸</div>`;

    let customBtn = document.createElement("button");
    customBtn.className = `shop-item ${!ownsCustom && game.coins < 50 ? "locked" : ""} ${hasCustomFace ? "equipped" : ""}`;
    customBtn.innerHTML = `${customGraphic}<br><span>Custom Face</span><br><small>${ownsCustom ? (hasCustomFace ? "EQUIPPED" : "UNLOCKED") : "🔒 Cost: 50 💰"}</small>`;

    customBtn.onclick = () => {
      if (!ownsCustom) {
        if (game.coins >= 50) {
          game.coins -= 50;
          game.unlockedAchievements.push("owns_custom_face");
          localStorage.setItem(
            "flappyBinnieAchievements",
            JSON.stringify(game.unlockedAchievements),
          );
          savePlayerData(
            game.username,
            game.highScore,
            game.coins,
            game.unlockedAchievements,
          );
          game.playSFX("coin");
          this.renderShop(game);
        } else {
          game.playSFX("error");
        }
      } else {
        document.getElementById("shop-modal").classList.add("hidden");
        this.openCameraTool();
      }
    };
    premiumGrid.appendChild(customBtn);
  },

  // --- 3. CAMERA / CROP TOOL LOGIC ---
  openCameraTool() {
    if (this.ui) {
      this.ui.classList.remove("hidden");
      this.resetCanvas();
    } else {
      // Fallback just in case the HTML isn't set up
      let faceData = prompt(
        "Enter Image URL for your custom face:",
        "assets/charIMG/ribinie.png",
      );
      if (faceData) {
        localStorage.setItem("flappyBinnieCustomFace", faceData);
        import("./assets.js").then((module) => {
          module.Assets.images.bird.src = faceData;
        });
      }
    }
  },

  closeCameraTool() {
    this.ui.classList.add("hidden");
    this.stopCamera();
  },

  resetCanvas() {
    this.img = null;
    this.imgX = 150;
    this.imgY = 150;
    this.imgScale = 1;
    this.baseScale = 1;
    const slider = document.getElementById("zoomSlider");
    if (slider) slider.value = 1;
    if (this.video) this.video.style.transform = "scale(1)";
    if (this.ctx) {
      this.ctx.clearRect(0, 0, 300, 300);
      this.ctx.fillStyle = "#555";
      this.ctx.fillRect(0, 0, 300, 300);
    }
  },

  async startCamera() {
    this.resetCanvas();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      this.video.srcObject = this.stream;
      this.video.classList.remove("hidden");
      this.canvas.classList.add("hidden");
      document.getElementById("zoomSlider").disabled = false;
    } catch (err) {
      alert("Camera access denied.");
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) this.video.classList.add("hidden");
    if (this.canvas) this.canvas.classList.remove("hidden");
  },

  handleUpload(e) {
    this.stopCamera();
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let newImg = new Image();
      newImg.onload = () => {
        this.img = newImg;
        this.imgX = 150;
        this.imgY = 150;
        this.baseScale = 300 / Math.min(this.img.width, this.img.height);
        this.imgScale = 1;
        document.getElementById("zoomSlider").value = 1;
        document.getElementById("zoomSlider").disabled = false;
        this.draw();
      };
      newImg.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  draw() {
    if (!this.img || !this.ctx) return;
    this.ctx.clearRect(0, 0, 300, 300);
    this.ctx.save();
    this.ctx.translate(this.imgX, this.imgY);
    let finalScale = this.baseScale * this.imgScale;
    this.ctx.scale(finalScale, finalScale);
    this.ctx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
    this.ctx.restore();
  },

 saveFace() {
    let finalCanvas = document.createElement("canvas");
    finalCanvas.width = 36;
    finalCanvas.height = 36;
    let fCtx = finalCanvas.getContext("2d");
    fCtx.imageSmoothingEnabled = false;

    // Draw the 300x300 UI canvas shrunk down to a tiny 32x32 pixel box
    if (this.stream || this.img) {
      fCtx.drawImage(this.canvas, 0, 0, 300, 300, 2, 2, 32, 32);
    } else {
      return alert("Please upload a photo or use the camera first!");
    }

    // 1. Pixel Mask: Erase the 4 corners to make an 8-bit Octagon
    fCtx.globalCompositeOperation = "destination-out";
    fCtx.fillRect(2, 2, 8, 8);
    fCtx.fillRect(26, 2, 8, 8);
    fCtx.fillRect(2, 26, 8, 8);
    fCtx.fillRect(26, 26, 8, 8);

    // 2. Draw a White Inner Pixel Border
    fCtx.globalCompositeOperation = "source-over";
    fCtx.fillStyle = "white";
    fCtx.fillRect(10, 2, 16, 2);  fCtx.fillRect(10, 32, 16, 2);
    fCtx.fillRect(2, 10, 2, 16);  fCtx.fillRect(32, 10, 2, 16);
    fCtx.fillRect(8, 4, 2, 2);    fCtx.fillRect(6, 6, 2, 2);    fCtx.fillRect(4, 8, 2, 2);
    fCtx.fillRect(26, 4, 2, 2);   fCtx.fillRect(28, 6, 2, 2);   fCtx.fillRect(30, 8, 2, 2);
    fCtx.fillRect(8, 30, 2, 2);   fCtx.fillRect(6, 28, 2, 2);   fCtx.fillRect(4, 26, 2, 2);
    fCtx.fillRect(26, 30, 2, 2);  fCtx.fillRect(28, 28, 2, 2);  fCtx.fillRect(30, 26, 2, 2);

    // 3. Draw a Dark Outer Pixel Border
    fCtx.fillStyle = "#543847";
    fCtx.fillRect(10, 0, 16, 2);  fCtx.fillRect(10, 34, 16, 2);
    fCtx.fillRect(0, 10, 2, 16);  fCtx.fillRect(34, 10, 2, 16);
    fCtx.fillRect(8, 2, 2, 2);    fCtx.fillRect(6, 4, 2, 2);    fCtx.fillRect(4, 6, 2, 2);   fCtx.fillRect(2, 8, 2, 2);
    fCtx.fillRect(26, 2, 2, 2);   fCtx.fillRect(28, 4, 2, 2);   fCtx.fillRect(30, 6, 2, 2);  fCtx.fillRect(32, 8, 2, 2);
    fCtx.fillRect(8, 32, 2, 2);   fCtx.fillRect(6, 30, 2, 2);   fCtx.fillRect(4, 28, 2, 2);  fCtx.fillRect(2, 26, 2, 2);
    fCtx.fillRect(26, 32, 2, 2);  fCtx.fillRect(28, 30, 2, 2);  fCtx.fillRect(30, 28, 2, 2); fCtx.fillRect(32, 26, 2, 2);

    // 4. Scale it up to 144x144 so it saves as perfectly crisp, chunky pixels
    let exportCanvas = document.createElement("canvas");
    exportCanvas.width = 144; exportCanvas.height = 144;
    let eCtx = exportCanvas.getContext("2d");
    eCtx.imageSmoothingEnabled = false;
    eCtx.drawImage(finalCanvas, 0, 0, 144, 144);

    const dataURL = exportCanvas.toDataURL("image/png");
    localStorage.setItem("flappyBinnieCustomFace", dataURL);

    let newBird = new Image();
    newBird.onload = () => {
      Assets.images.bird = newBird;
      this.closeCameraTool(); 
    };
    newBird.src = dataURL;
  },

  resetDefault() {
    localStorage.removeItem("flappyBinnieCustomFace");
    let defaultImg = new Image();
    defaultImg.onload = () => {
      Assets.images.bird = defaultImg;
      this.closeCameraTool();
    };
    defaultImg.src = CONFIG.CHAR_IMG;
  },

  bindEvents() {
    document.getElementById("btnCamera").onclick = () => this.startCamera();
    document.getElementById("imageUpload").onchange = (e) =>
      this.handleUpload(e);
    document.getElementById("btnCancelChar").onclick = () =>
      this.closeCameraTool();
    document.getElementById("btnSaveChar").onclick = () => this.saveFace();
    document.getElementById("btnResetChar").onclick = () => this.resetDefault();

    const slider = document.getElementById("zoomSlider");
    if (slider) {
      slider.addEventListener("input", (e) => {
        this.imgScale = parseFloat(e.target.value);
        if (this.stream) this.video.style.transform = `scale(${this.imgScale})`;
        else if (this.img) this.draw();
      });
      slider.addEventListener("touchstart", (e) => e.stopPropagation(), {
        passive: true,
      });
      slider.addEventListener("touchmove", (e) => e.stopPropagation(), {
        passive: true,
      });
    }

    const getPos = (e) => {
      let rect = this.canvas.getBoundingClientRect();
      let clientX = e.touches ? e.touches[0].clientX : e.clientX;
      let clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrag = (e) => {
      if (!this.img) return;
      this.isDragging = true;
      let pos = getPos(e);
      this.startX = pos.x - this.imgX;
      this.startY = pos.y - this.imgY;
    };

    const drag = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      let pos = getPos(e);
      this.imgX = pos.x - this.startX;
      this.imgY = pos.y - this.startY;
      this.draw();
    };

    const stopDrag = () => {
      this.isDragging = false;
    };

    if (this.canvas) {
      this.canvas.addEventListener("mousedown", startDrag);
      this.canvas.addEventListener("mousemove", drag);
      window.addEventListener("mouseup", stopDrag);
      this.canvas.addEventListener("touchstart", startDrag, { passive: false });
      this.canvas.addEventListener("touchmove", drag, { passive: false });
      window.addEventListener("touchend", stopDrag);
    }
  },
};

// Initialize the logic ONLY AFTER the window loads, to prevent errors!
window.addEventListener("load", () => {
  CharacterMenu.init();
});
