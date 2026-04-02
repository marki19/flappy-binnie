import { CONFIG } from "./config.js";

export const Assets = { images: {}, audio: {} };

export function loadAssets(callback) {
  let loaded = 0;
  let total = CONFIG.BACKGROUNDS.length + 2 + Object.keys(CONFIG.SOUNDS).length;
  let hasStartedGame = false;

  const checkLoad = () => {
    loaded++;
    if (loaded >= total && !hasStartedGame) {
      hasStartedGame = true;
      callback();
    }
  };

  CONFIG.BACKGROUNDS.forEach((src, i) => {
    let img = new Image();
    img.onload = () => {
      img.onload = null;
      checkLoad();
    };
    img.onerror = () => {
      img.onerror = null;
      checkLoad();
    };
    img.src = src;
    Assets.images[`bg_${i}`] = img;
  });

  // Load Bird (Check for custom face first)
  Assets.images.bird = new Image();
  Assets.images.bird.onload = () => {
    Assets.images.bird.onload = null;
    checkLoad();
  };
  Assets.images.bird.onerror = () => {
    Assets.images.bird.onerror = null;
    checkLoad();
  };

  const customFace = localStorage.getItem("flappyBinnieCustomFace");
  if (customFace) {
    Assets.images.bird.src = customFace;
  } else {
    Assets.images.bird.src = CONFIG.CHAR_IMG;
  }

  Assets.images.pipes = new Image();
  Assets.images.pipes.onload = () => {
    Assets.images.pipes.onload = null;
    checkLoad();
  };
  Assets.images.pipes.onerror = () => {
    Assets.images.pipes.onerror = null;
    checkLoad();
  };
  Assets.images.pipes.src = CONFIG.PIPE_SHEET;

  for (let [key, src] of Object.entries(CONFIG.SOUNDS)) {
    let audio = new Audio(src);
    audio.oncanplaythrough = () => {
      audio.oncanplaythrough = null;
      checkLoad();
    };
    audio.onerror = () => {
      audio.onerror = null;
      checkLoad();
    };
    Assets.audio[key] = audio;
  }

  if (Assets.audio.music) Assets.audio.music.loop = true;
}
