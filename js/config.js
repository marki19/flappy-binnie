// At the very top of config.js, before exporting CONFIG
const isMobilePortrait = window.innerHeight > window.innerWidth;

export const CONFIG = {
  TITLE: "Flappy Binnie",
  // Swap dimensions if holding a phone!
  WIDTH: isMobilePortrait ? 720 : 1080,
  HEIGHT: isMobilePortrait ? 1080 : 720,
  BIRD_SIZE: 80,
  GRAVITY: 0.4,
  FLAP_STRENGTH: -8,
  MAX_FALL_SPEED: 14.5,
  PIPE_SPEED: 4,
  MAX_PIPE_SPEED: 9,
  PIPE_WIDTH: 130,
  HORIZ_GAP: 400,
  VERT_GAP: 200,
  GROUND_HEIGHT: 150,
  BG_OFFSET: -900,
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
