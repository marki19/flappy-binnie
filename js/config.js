// --- AUTO-DETECT ORIENTATION ---
const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isPortrait = window.innerHeight > window.innerWidth;
const useMobileGrid = isMobileDevice && isPortrait; // true for phones, false for PC

export const CONFIG = {
  TITLE: "Flappy Binnie",

  // 1. GRID SIZES
  WIDTH: useMobileGrid ? 450 : 1080,
  HEIGHT: useMobileGrid ? 800 : 720,
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
  // ... Keep all your BACKGROUNDS, ACHIEVEMENTS, and SOUNDS exactly the same below this line!
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
  CHAR_IMG: "assets/charIMG/ribinie.png",
  SOUNDS: {
    flap: "assets/sound_effects/tapFX.ogg",
    crash: "assets/sound_effects/gameOver.ogg",
    start: "assets/sound_effects/gameStart.ogg",
    music: "assets/sound_effects/backgroundMusic.ogg",
  },
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
  ],
};
