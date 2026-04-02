import { CONFIG } from "./config.js";
import { loadAssets } from "./assets.js";
import { Game } from "./game.js";

window.onload = () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // ADD THIS LINE: Disables anti-aliasing on the canvas context
  ctx.imageSmoothingEnabled = false;

  // Draw loading screen
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "30px Courier";
  ctx.textAlign = "center";
  ctx.fillText("Loading Assets...", CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);

  // Load assets, then inject canvas into the Game object
  loadAssets(() => {
    new Game(canvas, ctx);
  });
};
