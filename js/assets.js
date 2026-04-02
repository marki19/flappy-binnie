import { CONFIG } from "./config.js";

// Initialize the Web Audio API context safely
const AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioCtx = new AudioContext();

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

  // --- THE FAILSAFE ---
  // If the browser gets stuck loading an asset, force the game to start after 5 seconds anyway!
  setTimeout(() => {
    if (!hasStartedGame) {
      console.warn("Asset load timeout! Forcing game to start...");
      hasStartedGame = true;
      callback();
    }
  }, 5000);

  // Load Backgrounds
  CONFIG.BACKGROUNDS.forEach((src, i) => {
    let img = new Image();
    img.onload = () => { img.onload = null; checkLoad(); };
    img.onerror = () => { img.onerror = null; checkLoad(); };
    img.src = src;
    Assets.images[`bg_${i}`] = img;
  });

  // Load Bird
  Assets.images.bird = new Image();
  Assets.images.bird.onload = () => { Assets.images.bird.onload = null; checkLoad(); };
  Assets.images.bird.onerror = () => { Assets.images.bird.onerror = null; checkLoad(); };
  const customFace = localStorage.getItem("flappyBinnieCustomFace");
  Assets.images.bird.src = customFace ? customFace : CONFIG.CHAR_IMG;

  // Load Pipes
  Assets.images.pipes = new Image();
  Assets.images.pipes.onload = () => { Assets.images.pipes.onload = null; checkLoad(); };
  Assets.images.pipes.onerror = () => { Assets.images.pipes.onerror = null; checkLoad(); };
  Assets.images.pipes.src = CONFIG.PIPE_SHEET;

  // Load Audio (Bulletproof Web Audio API loader)
  for (let [key, src] of Object.entries(CONFIG.SOUNDS)) {
    fetch(src)
      .then(response => {
        if (!response.ok) throw new Error("File not found");
        return response.arrayBuffer();
      })
      .then(arrayBuffer => {
        // Universal compatibility: Works on Safari, iOS, Chrome, Android, Edge
        return new Promise((resolve, reject) => {
          audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
        });
      })
      .then(audioBuffer => {
        Assets.audio[key] = audioBuffer;
        checkLoad();
      })
      .catch(e => {
        console.warn(`Could not load audio (${src}):`, e);
        checkLoad(); // Always continue loading even if sound fails!
      });
  }
}