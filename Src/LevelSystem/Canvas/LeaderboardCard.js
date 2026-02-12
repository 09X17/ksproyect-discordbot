import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* =======================
   FONT REGISTRATION SAFE
======================= */
function safeRegisterFont(fontPath, options) {
  if (fs.existsSync(fontPath)) {
    registerFont(fontPath, options);
  }
}

safeRegisterFont(path.join(__dirname, '../Fonts/Montserrat-Bold.ttf'), {
  family: 'Montserrat',
  weight: 'bold'
});
safeRegisterFont(path.join(__dirname, '../Fonts/Montserrat-Regular.ttf'), {
  family: 'Montserrat'
});
safeRegisterFont(path.join(__dirname, '../Fonts/Poppins-Bold.ttf'), {
  family: 'Poppins',
  weight: 'bold'
});
safeRegisterFont(path.join(__dirname, '../Fonts/Poppins-Regular.ttf'), {
  family: 'Poppins'
});

/* =======================
   IMAGE LOADER (DISCORD SAFE)
======================= */
async function loadImageFromUrl(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const buffer = await res.arrayBuffer();
    return await loadImage(Buffer.from(buffer));
  } catch {
    return null;
  }
}

export default class LeaderboardCanvasGenerator {
  constructor(options = {}) {
    this.width = options.width || 1400;
    this.height = options.height || 900;
    this.theme = this.getTheme(options.theme || 'neon');
  }

  getTheme(name) {
    const themes = {
      neon: {
        bg1: '#0a0e27',
        bg2: '#1a1d3a',
        bg3: '#252849',
        primary: '#00ff9d',
        secondary: '#00d4ff',
        accent: '#7c3aed',
        gold: '#fbbf24',
        silver: '#c0c0c0',
        bronze: '#cd7f32',
        text: '#ffffff',
        textDim: '#9ca3af'
      }
    };
    return themes[name] || themes.neon;
  }

  /* =======================
     MAIN GENERATOR
  ======================= */
  async generate(data = {}) {
    const leaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
    const {
      type = 'level',
      page = 1,
      totalPages = 1,
      stats = {},
      guildName = 'Servidor',
      guildIcon,
      userRank
    } = data;

    const canvas = createCanvas(this.width, this.height);
    const ctx = canvas.getContext('2d');

    this.drawBackground(ctx);
    await this.drawHeader(ctx, guildName, guildIcon, stats, type, page, totalPages);

    if (leaderboard.length > 0) {
      await this.drawTopThree(ctx, leaderboard.slice(0, 3), type);
    }

    if (leaderboard.length > 3) {
      this.drawRemainingPositions(ctx, leaderboard.slice(3, 10), type);
    }

    if (userRank) {
      this.drawUserRankInfo(ctx, userRank);
    }

    this.drawFinalEffects(ctx);
    return canvas.toBuffer('image/png');
  }

  /* =======================
     BACKGROUND
  ======================= */
  drawBackground(ctx) {
    const g = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      this.width
    );
    g.addColorStop(0, this.theme.bg2);
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /* =======================
     HEADER
  ======================= */
  async drawHeader(ctx, name, iconUrl, stats, type, page, totalPages) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, this.width, 180);

    let guildName = name.length > 25 ? name.slice(0, 22) + '...' : name;

    if (iconUrl) {
      const icon = await loadImageFromUrl(iconUrl);
      if (icon) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(90, 90, 40, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(icon, 50, 50, 80, 80);
        ctx.restore();
      }
    }

    ctx.font = 'bold 36px Poppins, Arial';
    ctx.fillStyle = this.theme.text;
    ctx.fillText(guildName, 150, 75);

    ctx.font = '22px Poppins, Arial';
    ctx.fillStyle = this.theme.primary;
    ctx.fillText(`📊 Leaderboard - ${type.toUpperCase()}`, 150, 110);

    ctx.font = '16px Poppins, Arial';
    ctx.fillStyle = this.theme.textDim;
    ctx.fillText(
      `Usuarios: ${stats.totalUsers || 0} • Nivel Promedio: ${Math.round(stats.averageLevel || 1)}`,
      150,
      140
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = this.theme.secondary;
    ctx.fillText(`Página ${page}/${totalPages}`, this.width - 50, 140);
    ctx.textAlign = 'left';
  }

  /* =======================
     TOP 3
  ======================= */
  async drawTopThree(ctx, users, type) {
    const positions = [
      { x: this.width / 2, y: 320, size: 110 },
      { x: this.width / 2 - 200, y: 360, size: 90 },
      { x: this.width / 2 + 200, y: 360, size: 90 }
    ].slice(0, users.length);

    const colors = [this.theme.gold, this.theme.silver, this.theme.bronze];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const pos = positions[i];
      await this.drawAvatar(ctx, user, pos.x, pos.y, pos.size, colors[i]);
      this.drawTopInfo(ctx, user, pos.x, pos.y + pos.size / 2 + 35, type, colors[i]);
    }
  }

  async drawAvatar(ctx, user, x, y, size, color) {
    const avatarUrl =
      typeof user.avatarURL === 'function'
        ? user.avatarURL({ extension: 'png', size: 256 })
        : user.avatarURL;

    const avatar =
      avatarUrl && (await loadImageFromUrl(avatarUrl));

    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(x, y, size / 2 + 6, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.clip();

    if (avatar) {
      ctx.drawImage(avatar, x - size / 2, y - size / 2, size, size);
    } else {
      ctx.fillStyle = this.theme.bg3;
      ctx.fillRect(x - size / 2, y - size / 2, size, size);
    }

    ctx.restore();
  }

  drawTopInfo(ctx, user, x, y, type, color) {
    ctx.font = 'bold 20px Poppins, Arial';
    ctx.fillStyle = this.theme.text;
    ctx.textAlign = 'center';

    let name = user.username || 'Usuario';
    if (name.length > 14) name = name.slice(0, 11) + '...';
    ctx.fillText(name, x, y);

    ctx.font = 'bold 16px Poppins, Arial';
    ctx.fillStyle = color;
    ctx.fillText(this.getValueText(user, type), x, y + 25);

    this.drawProgressBar(ctx, x, y + 40, 120, 8, user, color);
  }

  /* =======================
     REST POSITIONS
  ======================= */
  drawRemainingPositions(ctx, users, type) {
    let y = 520;
    for (let i = 0; i < users.length; i++) {
      this.drawRankRow(ctx, users[i], i + 4, 100, y, this.width - 200, type);
      y += 70;
    }
  }

  drawRankRow(ctx, user, rank, x, y, width, type) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    this.roundRect(ctx, x, y, width, 55, 8);
    ctx.fill();

    ctx.font = 'bold 20px Poppins, Arial';
    ctx.fillStyle = this.theme.primary;
    ctx.fillText(`#${rank}`, x + 20, y + 35);

    ctx.font = '18px Poppins, Arial';
    ctx.fillStyle = this.theme.text;
    ctx.fillText(user.username || 'Usuario', x + 80, y + 35);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.theme.secondary;
    ctx.fillText(this.getValueText(user, type), x + width - 20, y + 35);
    ctx.textAlign = 'left';
  }

  /* =======================
     USER RANK
  ======================= */
  drawUserRankInfo(ctx, user) {
    const y = this.height - 100;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.roundRect(ctx, 50, y, this.width - 100, 70, 12);
    ctx.fill();

    ctx.font = 'bold 22px Poppins, Arial';
    ctx.fillStyle = this.theme.primary;
    ctx.fillText(`🎯 Tu posición: #${user.rank}`, 80, y + 45);
  }

  /* =======================
     EFFECTS
  ======================= */
  drawFinalEffects(ctx) {
    ctx.strokeStyle = this.theme.primary;
    ctx.lineWidth = 4;
    this.roundRect(ctx, 10, 10, this.width - 20, this.height - 20, 20);
    ctx.stroke();
  }

  /* =======================
     HELPERS
  ======================= */
  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawProgressBar(ctx, cx, cy, w, h, user, color) {
    const xp = Number(user.xp) || 0;
    const level = Number(user.level) || 1;
    const needed = 100 + level * 50;
    const progress = Math.min(1, xp / needed);

    const x = cx - w / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.roundRect(ctx, x, cy, w, h, h / 2);
    ctx.fill();

    ctx.fillStyle = color;
    this.roundRect(ctx, x, cy, w * progress, h, h / 2);
    ctx.fill();
  }

  getValueText(user, type) {
    switch (type) {
      case 'xp':
        return `${this.formatNumber(user.xp || 0)} XP`;
      case 'messages':
        return `${this.formatNumber(user.messages || 0)} msgs`;
      default:
        return `Nivel ${user.level || 0}`;
    }
  }

  formatNumber(n) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return `${n}`;
  }
}
