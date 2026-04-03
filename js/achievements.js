import { CONFIG } from "./config.js";

export const AchievementsMenu = {
    open: function(gameInstance) {
        const modal = document.getElementById("achievements-modal");
        modal.classList.remove("hidden");

        // Wire up the close button
        document.getElementById("close-achievements").onclick = () => {
            modal.classList.add("hidden");
        };

        this.render(gameInstance);
    },

    render: function(game) {
        const list = document.getElementById("achievements-list");
        list.innerHTML = "";

        let unlockedCount = 0;

        CONFIG.ACHIEVEMENTS.forEach(ach => {
            let isUnlocked = game.unlockedAchievements.includes(ach.id);
            if (isUnlocked) unlockedCount++;

            let item = document.createElement("div");
            item.className = `achievement-item ${!isUnlocked ? "locked" : ""}`;
            
            let icon = isUnlocked ? "✔" : "🔒";
            
            item.innerHTML = `
                <div class="ach-icon">${icon}</div>
                <div class="ach-text">
                    <span>${isUnlocked ? ach.name : "???"}</span>
                    <small>${isUnlocked ? ach.desc : "Keep playing to unlock."}</small>
                </div>
            `;
            list.appendChild(item);
        });

        // Update the progress tracker at the top
        document.getElementById("ach-progress").innerText = unlockedCount;
        document.getElementById("ach-total").innerText = CONFIG.ACHIEVEMENTS.length;
    }
};