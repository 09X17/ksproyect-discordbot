import { createCanvas, loadImage, registerFont } from "canvas";
import path from "path";
import fs from "fs";

export default class ToolsInventoryGenerator {

    constructor(options = {}) {
        this.width = 1400;
        this.height = 900;
        this.iconsPath = options.iconsPath || path.join(process.cwd(), "Src/LevelSystem/Icons");

        this.theme = {
            primary: "#9d4edd",
            text: "#ffffff",
            dim: "#b0b0c0",
            panel: "rgba(20,20,30,0.55)"
        };
    }

    async generate(data) {

        const {
            username,
            avatarURL,
            tools = [],
            equippedToolId = null,
            backgroundUrl = null,
            accentColor = null
        } = data;

        if (accentColor) {
            this.theme.primary = accentColor;
        }

        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext("2d");

        await this.drawBackground(ctx, backgroundUrl);
        await this.drawHeader(ctx, username, avatarURL);
        await this.drawInventoryPanel(ctx, tools, equippedToolId);

        return canvas.toBuffer();
    }

    /* =========================================
       BACKGROUND
    ========================================= */

    async drawBackground(ctx, backgroundUrl) {

        if (backgroundUrl && fs.existsSync(backgroundUrl)) {

            const img = await loadImage(backgroundUrl);

            const scale = Math.max(this.width / img.width, this.height / img.height);
            const x = (this.width - img.width * scale) / 2;
            const y = (this.height - img.height * scale) / 2;

            ctx.filter = "blur(6px) brightness(0.5)";
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.filter = "none";

            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, 0, this.width, this.height);

        } else {
            ctx.fillStyle = "#111";
            ctx.fillRect(0, 0, this.width, this.height);
        }
    }

    /* =========================================
       HEADER
    ========================================= */

    async drawHeader(ctx, username, avatarURL) {

        const headerHeight = 140;

        ctx.fillStyle = this.theme.panel;
        this.roundRect(ctx, 60, 40, this.width - 120, headerHeight, 20);
        ctx.fill();

        ctx.strokeStyle = `${this.theme.primary}88`;
        ctx.lineWidth = 3;
        this.roundRect(ctx, 60, 40, this.width - 120, headerHeight, 20);
        ctx.stroke();

        // Avatar
        try {
            const avatar = await loadImage(avatarURL);
            const size = 90;
            const x = 90;
            const y = 65;

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, x, y, size, size);
            ctx.restore();

            ctx.strokeStyle = this.theme.primary;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2 + 2, 0, Math.PI * 2);
            ctx.stroke();

        } catch {}

        ctx.fillStyle = this.theme.text;
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "left";
        ctx.fillText("🎒 Inventario de Herramientas", 220, 105);

        ctx.fillStyle = this.theme.dim;
        ctx.font = "22px Arial";
        ctx.fillText(username, 220, 135);
    }

    /* =========================================
       INVENTORY PANEL
    ========================================= */

    async drawInventoryPanel(ctx, tools, equippedToolId) {

        const panelY = 220;

        ctx.fillStyle = this.theme.panel;
        this.roundRect(ctx, 120, panelY, this.width - 240, 580, 25);
        ctx.fill();

        ctx.strokeStyle = `${this.theme.primary}66`;
        ctx.lineWidth = 3;
        this.roundRect(ctx, 120, panelY, this.width - 240, 580, 25);
        ctx.stroke();

        await this.drawGrid(ctx, tools, equippedToolId, 150, panelY + 60);
    }

    /* =========================================
       GRID
    ========================================= */

    async drawGrid(ctx, tools, equippedToolId, startX, startY) {

        const cols = 5;
        const rows = 3;
        const slotSize = 150;
        const gap = 35;

        let index = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                const x = startX + c * (slotSize + gap);
                const y = startY + r * (slotSize + gap);

                const tool = tools[index];
                const equipped = tool?.toolId === equippedToolId;

                this.drawSlot(ctx, x, y, slotSize, equipped);

                if (tool)
                    await this.drawTool(ctx, tool, x, y, slotSize);

                index++;
            }
        }
    }

    drawSlot(ctx, x, y, size, equipped) {

        ctx.fillStyle = "rgba(255,255,255,0.04)";
        this.roundRect(ctx, x, y, size, size, 18);
        ctx.fill();

        ctx.strokeStyle = equipped
            ? this.theme.primary
            : "rgba(255,255,255,0.15)";

        ctx.lineWidth = equipped ? 4 : 2;
        this.roundRect(ctx, x, y, size, size, 18);
        ctx.stroke();
    }

    async drawTool(ctx, tool, x, y, size) {

        const iconSize = 90;
        const iconX = x + (size - iconSize) / 2;
        const iconY = y + 20;

        try {
            const iconPath = path.join(this.iconsPath, `${tool.toolId}.png`);
            if (fs.existsSync(iconPath)) {
                const img = await loadImage(iconPath);
                ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.font = "60px Arial";
                ctx.textAlign = "center";
                ctx.fillStyle = "#fff";
                ctx.fillText("⛏️", x + size / 2, y + 85);
            }
        } catch {}

        ctx.font = "bold 18px Arial";
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = "center";
        ctx.fillText(tool.name, x + size / 2, y + size - 30);

        if (tool.upgradeLevel > 0) {
            ctx.fillStyle = this.theme.primary;
            ctx.fillText(`+${tool.upgradeLevel}`, x + size - 20, y + 25);
        }
    }

    /* =========================================
       UTIL
    ========================================= */

    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
