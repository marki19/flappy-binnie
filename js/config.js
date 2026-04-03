// --- AUTO-DETECT ORIENTATION ---
const isMobileDevice =
  window.innerWidth <= 768 ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
const isPortrait = window.innerHeight > window.innerWidth;
const useMobileGrid = isMobileDevice && isPortrait; // true for phones, false for PC

// THE MAGIC MATH:
// We lock the width at 450 so the difficulty/reaction time is identical for all players.
// But we multiply 450 by the phone's exact physical aspect ratio to get the perfect Canvas Height!
const dynamicMobileHeight = Math.floor(
  450 * (window.innerHeight / window.innerWidth),
);

export const CONFIG = {
  TITLE: "Flappy Binnie",
  VERSION: "v1.0",

  // 1. GRID SIZES
  WIDTH: useMobileGrid ? 450 : 1080,
  HEIGHT: useMobileGrid ? dynamicMobileHeight : 720,
  BIRD_SIZE: 80,

  // 2. DYNAMIC PHYSICS
  // Mobile needs slightly heavier gravity but a much stronger flap to cover the taller screen smoothly.
  GRAVITY: useMobileGrid ? 0.3 : 0.25,
  FLAP_STRENGTH: useMobileGrid ? -6.5 : -5.5,
  MAX_FALL_SPEED: 14.5,

  // 3. DYNAMIC SPEEDS & DISTANCES
  // We slightly reduce the base speed on mobile because of the narrower reaction window.
  PIPE_SPEED: useMobileGrid ? 3.5 : 4.5,
  MAX_PIPE_SPEED: 9,

  // Thinner pipes on mobile give the player more horizontal breathing room.
  PIPE_WIDTH: useMobileGrid ? 90 : 130,

  // CRITICAL FIX: Bring pipes much closer horizontally on mobile so the player can see what is coming!
  HORIZ_GAP: useMobileGrid ? 280 : 400,

  // Slightly larger vertical safe space on mobile to account for the stronger flap.
  VERT_GAP: useMobileGrid ? 230 : 200,

  GROUND_HEIGHT: useMobileGrid ? 200 : 150,
  BG_OFFSET: -900,

  // Add this near your CHAR_IMG
  COIN_IMG: "assets/coin/coin.png",

  // Add the coin sound to your SOUNDS list
  SOUNDS: {
    flap: "assets/sound_effects/tapFX.ogg",
    crash: "assets/sound_effects/gameOver.ogg",
    start: "assets/sound_effects/gameStart.ogg",
    music: "assets/sound_effects/backgroundMusic.ogg",
    coin: "assets/sound_effects/coin.ogg",
    error: "assets/sound_effects/error.ogg", // <-- NEW
  },

  BACKGROUNDS: [
    "assets/Background/Background1.png",
    "assets/Background/Background2.png",
    "assets/Background/Background3.png",
    "assets/Background/Background5.png",
    "assets/Background/Background7.png",
    "assets/Background/Background8.png",
    "assets/Background/Background9.png",
  ],
  PIPE_SHEET: "assets/tiles/SimpleStyle4.png",

  CHAR_IMG: "assets/charIMG/ribiniew.png",

  // --- NEW: ACHIEVEMENT DEFINITIONS ---
  ACHIEVEMENTS: [
    {
      id: "first_flap",
      name: "First Flight",
      desc: "Play your very first game.",
    },
    {
      id: "score_10",
      name: "Bronze Bird",
      desc: "Earn a Bronze Medal (Score 10+).",
    },
    {
      id: "score_20",
      name: "Silver Bird",
      desc: "Earn a Silver Medal (Score 20+).",
    },
    {
      id: "score_30",
      name: "Gold Bird",
      desc: "Earn a Gold Medal (Score 30+).",
    },
    {
      id: "score_40",
      name: "Platinum Bird",
      desc: "Earn a Platinum Medal (Score 40+).",
    },
    {
      id: "custom_face",
      name: "Vanity",
      desc: "Equip a custom character face.",
    },
    {
      id: "max_speed",
      name: "Speed Demon",
      desc: "Reach Level 5 maximum pipe speed.",
    },
    { id: "die_pipe", name: "Ouch!", desc: "Crash directly into a pipe." },

    // (Add these inside your existing ACHIEVEMENTS array!)
    { id: "score_50", name: "Emerald Bird", desc: "Score 50+" },
    { id: "score_60", name: "Ruby Bird", desc: "Score 60+" },
    { id: "score_70", name: "Sapphire Bird", desc: "Score 70+" },
    { id: "score_80", name: "Amethyst Bird", desc: "Score 80+" },
    { id: "score_90", name: "Diamond Bird", desc: "Score 90+" },
    { id: "score_100", name: "Master Bird", desc: "Score 100+" },

     // --- UPDATED PURCHASABLE TROPHIES ---
    { id: "buy_king", name: "Royal Bird", desc: "Purchased the King bird." },
    { id: "buy_cyborg", name: "Future Bird", desc: "Purchased the Cyborg bird." },
    { id: "buy_wizard", name: "Magic Bird", desc: "Purchased the Wizard bird." },
    { id: "buy_god", name: "Divine Bird", desc: "Purchased the God bird." }
  ],
};

// Add this to the very bottom of config.js!
export const BIRD_DESIGNS = {
  classic: {
    palette: { W: "#FFFFFF", G: "#DDDDDD", B: "#543847" },
    art: [
      "  BB    ",
      " BGWBB  ",
      "BWWWGBB ",
      "BWWWWWB ",
      " BBWWWB ",
      "   BWWB ",
      "    BBB ",
    ],
  },
  bat: {
    palette: { P: "#663399", D: "#330066", B: "#111111" },
    art: [
      "  B     ",
      " BDB    ",
      "BPPBB B ",
      "BPPPPBDB",
      " BPPPPPB",
      "  BBDBB ",
      "    B   ",
    ],
  },
  mecha: {
    palette: { O: "#FF7A00", M: "#CCCCCC", D: "#888888", B: "#222222" },
    art: [
      "   BBB  ",
      "  BMMMB ",
      " BOOOOMB",
      " BOOOOMB",
      " BBMMMB ",
      "   BBB  ",
    ],
  },
  fairy: {
    palette: { P: "#FFB6C1", C: "#00FFFF", B: "#FF69B4" },
    art: [
      "   BB   ",
      "  BPCB  ",
      " BPPPCB ",
      " BPPPCB ",
      "  BPCB  ",
      "   BB   ",
    ],
  },
  demon: {
    palette: { R: "#FF0000", D: "#8B0000", B: "#000000" },
    art: [
      "B       ",
      "BRB     ",
      "BRRBB B ",
      "BRRRRBDB",
      " BRRRRRB",
      "  BBDRB ",
      "    B   ",
    ],
  },
  angel: {
    palette: { G: "#FFD700", W: "#FFFFFF", B: "#DAA520" },
    art: [
      "  BB    ",
      " BGWBB  ",
      "BWWWGBB ",
      "BWWWWWB ",
      " BBWWWB ",
      "  BWWWB ",
      "   BBB  ",
    ],
  },
  dragon: {
    palette: { G: "#32CD32", Y: "#FFD700", B: "#006400" },
    art: [
      "  B     ",
      " BGB    ",
      "BGYBB B ",
      "BGYYYBGB",
      " BGYYYYB",
      "  BBGBB ",
      "    B   ",
    ],
  },
  butterfly: {
    palette: { M: "#FF00FF", C: "#00FFFF", B: "#000080" },
    art: [
      " B   B  ",
      " BMBMB  ",
      "BMMCMMB ",
      "BMMMMMB ",
      " BMBMB  ",
      "  BBB   ",
    ],
  },
  bone: {
    palette: { W: "#F5F5F5", G: "#A9A9A9", B: "#2F4F4F" },
    art: [
      "  BB    ",
      " BWWBB  ",
      "BWBBWWB ",
      "BWWWWWWB",
      " BBWWBB ",
      "   BB   ",
    ],
  },
  crystal: {
    palette: { C: "#00FFFF", L: "#E0FFFF", B: "#008B8B" },
    art: [
      "   B    ",
      "  BCCB  ",
      " BCCLCB ",
      "BCCCCCB ",
      " BCCLCB ",
      "  BCCB  ",
      "   B    ",
    ],
  },
  ninja: {
    palette: { W: "#555555", B: "#222222", E: "#FF0000" },
    art: [
      "  WW    ",
      " WWW    ",
      "WWWWW   ",
      "WWWWWW  ",
      " WWWWW  ",
      "   WW   ",
    ],
  },
  pirate: {
    palette: { W: "#8B4513", B: "#A0522D", E: "#000000" },
    art: [
      "  WW    ",
      " WWWW   ",
      "WWWWWW  ",
      "WWWWWW  ",
      " WWWW   ",
      "  WW    ",
    ],
  },
  zombie: {
    palette: { W: "#800080", B: "#006400", E: "#FF0000" },
    art: [
      " W      ",
      " WWW    ",
      "WWWW W  ",
      "WWWWWW  ",
      " WWWWW  ",
      "  WWW   ",
    ],
  },
  alien: {
    palette: { W: "#00FFFF", B: "#32CD32", E: "#000000" },
    art: [
      "   W    ",
      "  WWW   ",
      " WWWWW  ",
      " WWWWW  ",
      "  WWW   ",
      "   W    ",
    ],
  },
  ghost: {
    palette: { W: "#ADD8E6", B: "#F8F8FF", E: "#000000" },
    art: [
      "  WW    ",
      " WWWW   ",
      "WWWWWW  ",
      "WWWWWW  ",
      " WWWW   ",
      "  WW    ",
    ],
  },
  phoenix: {
    palette: { W: "#FFD700", B: "#FF4500", E: "#000000" },
    art: [
      " W      ",
      " WWW    ",
      "WWWW W  ",
      "WWWWWW  ",
      " WWWWW  ",
      "  WW    ",
    ],
  },
  king: {
    palette: { W: "#4B0082", B: "#FFD700", E: "#000000" },
    art: [
      "  WW    ",
      " WWWW   ",
      "WWWWWW  ",
      "WWWWWW  ",
      " WWWW   ",
      "  WW    ",
    ],
  },
  cyborg: {
    palette: { W: "#FF0000", B: "#C0C0C0", E: "#00FFFF" },
    art: [
      "   WW   ",
      "  WWWW  ",
      " WWWWWW ",
      " WWWWWW ",
      "  WWWW  ",
      "   WW   ",
    ],
  },
  wizard: {
    palette: { W: "#FFD700", B: "#0000CD", E: "#FFFFFF" },
    art: [
      "  W     ",
      " WWW    ",
      "WWWWW   ",
      "WWWWWW  ",
      " WWWWW  ",
      "  WWW   ",
    ],
  },
  god: {
    palette: { W: "#00FFFF", B: "#FFFFFF", E: "#FFD700" },
    art: [
      "  WW    ",
      " WWWW   ",
      "WWWWWW  ",
      "WWWWWW  ",
      " WWWW   ",
      "  WW    ",
    ],
  },
};
