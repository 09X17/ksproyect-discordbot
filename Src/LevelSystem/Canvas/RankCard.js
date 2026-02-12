import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const USER_BG_DIR = path.join(
    __dirname,
    '../Assets/UserBackgrounds'
);

try {
    registerFont(path.join(__dirname, '../Fonts/Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });
    registerFont(path.join(__dirname, '../Fonts/Montserrat-Regular.ttf'), { family: 'Montserrat' });
    registerFont(path.join(__dirname, '../Fonts/Poppins-Bold.ttf'), { family: 'Poppins', weight: 'bold' });
    registerFont(path.join(__dirname, '../Fonts/Poppins-Regular.ttf'), { family: 'Poppins' });
} catch (error) {
    console.warn('Fuentes no encontradas, usando fuentes por defecto');
}

export default class RankCardGenerator {
    constructor(options = {}) {
        this.width = options.width || 1400;
        this.height = options.height || 500;
        this.badgesPath = options.badgesPath || '../Badges';
        this.iconsPath = options.iconsPath || '../Icons';

        this.themes = {
            neon: {
                bg1: '#0a0e27',
                bg2: '#1a1d3a',
                bg3: '#252849',
                primary: '#00ff9d',
                secondary: '#00d4ff',
                accent: '#7c3aed',
                gold: '#fbbf24',
                silver: '#e5e7eb',
                text: '#ffffff',
                textDim: '#9ca3af',
                shadow: 'rgba(0, 255, 157, 0)',
                glow: 'rgba(124, 58, 237, 0)'
            },
            midnight: {
                bg1: '#0f172a',
                bg2: '#1e293b',
                bg3: '#334155',
                primary: '#3b82f6',
                secondary: '#8b5cf6',
                accent: '#ec4899',
                gold: '#fbbf24',
                silver: '#e5e7eb',
                text: '#f1f5f9',
                textDim: '#94a3b8',
                shadow: 'rgba(59, 131, 246, 0)',
                glow: 'rgba(236, 72, 154, 0)'
            },
            cyberpunk: {
                bg1: '#0d0221',
                bg2: '#1a0b2e',
                bg3: '#2d1b4e',
                primary: '#f72585',
                secondary: '#b5179e',
                accent: '#7209b7',
                gold: '#ffd60a',
                silver: '#e0e1dd',
                text: '#ffffff',
                textDim: '#b8b8d1',
                shadow: 'rgba(247, 37, 132, 0)',
                glow: 'rgba(113, 9, 183, 0)'
            },
            aurora: {
                bg1: '#0b1121',
                bg2: '#162032',
                bg3: '#1f2b3e',
                primary: '#06ffa5',
                secondary: '#2dd4bf',
                accent: '#a78bfa',
                gold: '#fde047',
                silver: '#f3f4f6',
                text: '#f0fdfa',
                textDim: '#99f6e4',
                shadow: 'rgba(6, 255, 164, 0)',
                glow: 'rgba(167, 139, 250, 0)'
            }
        };

        this.theme = this.themes[options.theme || 'neon'];
    }

    async generate(userData) {
        const {
            username,
            discriminator,
            avatarURL,
            level,
            xp, // XP TOTAL acumulado
            rank,
            totalUsers,
            messages,
            voiceMinutes,
            streakDays,
            totalXP,
            coins = 0,
            tokens = 0,
            boostMultiplier = 1.0,
            badges = [],
            title = '',
            prestige = 0,
            guildId = 'default', // Para cálculos de progreso,
            backgroundUrl = null,
            accentColor = null,
        } = userData;

        if (accentColor) {
            this.theme = {
                ...this.theme,
                primary: accentColor,
                secondary: accentColor,
                accent: accentColor,
                shadow: `rgba(6, 255, 164, 0)`,
                glow: `rgba(6, 255, 164, 0)`
            };
        }

        // ✅ CALCULAR PROGRESO CORRECTAMENTE
        const {
            progress,
            xpForNextLevel,
            xpInLevel,
            xpNeededForNextLevel,
            xpForCurrentLevel
        } = await this.calculateProgress(level, xp, guildId);

        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');

        if (backgroundUrl &&
            typeof backgroundUrl === 'string' &&
            backgroundUrl.length > 5) {
            await this.drawCustomBackground(ctx, backgroundUrl).catch(err => { });
        } else {
            this.drawModernBackground(ctx);
        }


        await this.drawModernAvatar(ctx, avatarURL, level, prestige);
        this.drawUserInfo(ctx, username, discriminator, title);
        this.drawRankBadge(ctx, rank, totalUsers);
        this.drawCurrency(ctx, coins, tokens);

        // ✅ Pasar los valores CORRECTOS a la barra de progreso
        this.drawProgressSection(
            ctx,
            level,
            xpInLevel,           // XP en el nivel actual
            xpNeededForNextLevel, // XP necesario para subir
            progress,            // Progreso (0-1)
            totalXP
        );

        this.drawStatsGrid(ctx, messages, voiceMinutes, streakDays, boostMultiplier);
        await this.drawModernBadges(ctx, badges, userData);
        this.drawGlowEffects(ctx);

        return canvas.toBuffer();
    }

    // ✅ NUEVO MÉTODO: Calcular progreso correctamente
    async calculateProgress(level, currentXP, guildId) {
        try {
            // Valores por defecto (puedes ajustar o obtener de config)
            const baseXP = 100;
            const growthRate = 1.5;

            // XP TOTAL desde nivel 1 hasta el nivel actual
            let xpForCurrentLevel = 0;
            for (let lvl = 1; lvl < level; lvl++) {
                xpForCurrentLevel += Math.floor(baseXP * Math.pow(lvl, growthRate));
            }

            // XP TOTAL desde nivel 1 hasta el siguiente nivel
            let xpForNextLevel = xpForCurrentLevel;
            xpForNextLevel += Math.floor(baseXP * Math.pow(level, growthRate));

            // XP que tiene el usuario en el nivel ACTUAL
            const xpInLevel = Math.max(0, currentXP - xpForCurrentLevel);

            // XP que necesita para subir al siguiente nivel
            const xpNeededForNextLevel = xpForNextLevel - xpForCurrentLevel;

            // Progreso (0-1)
            const progress = xpNeededForNextLevel > 0
                ? xpInLevel / xpNeededForNextLevel
                : 1.0;

            return {
                progress: Math.min(1.0, Math.max(0, progress)),
                xpForNextLevel,       // XP TOTAL para siguiente nivel
                xpInLevel,            // XP en el nivel actual
                xpNeededForNextLevel, // XP necesario para subir
                xpForCurrentLevel     // XP total hasta nivel actual
            };

        } catch (error) {
            console.error('Error calculando progreso:', error);
            // Valores por defecto en caso de error
            return {
                progress: 0.5,
                xpForNextLevel: 100 * Math.pow(level + 1, 1.5),
                xpInLevel: currentXP,
                xpNeededForNextLevel: 100 * Math.pow(level, 1.5),
                xpForCurrentLevel: 0
            };
        }
    }

    async drawCustomBackground(ctx, fileName) {
        try {
            const bgPath = path.join(USER_BG_DIR, fileName);

            if (!fs.existsSync(bgPath)) {
                console.warn('Background no existe:', bgPath);
                this.drawModernBackground(ctx);
                return;
            }

            const img = await loadImage(bgPath);

            const scale = Math.max(
                this.width / img.width,
                this.height / img.height
            );

            const x = (this.width - img.width * scale) / 2;
            const y = (this.height - img.height * scale) / 2;

            ctx.drawImage(
                img,
                x,
                y,
                img.width * scale,
                img.height * scale
            );

            // Overlay oscuro
            const overlay = ctx.createLinearGradient(0, 0, 0, this.height);
            overlay.addColorStop(0, 'rgba(0,0,0,0.45)');
            overlay.addColorStop(1, 'rgba(0,0,0,0.65)');
            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, this.width, this.height);

        } catch (err) {
            console.error('Error cargando background custom:', err);
            this.drawModernBackground(ctx);
        }
    }

    drawModernBackground(ctx) {
        // Fondo base con gradiente radial
        const bgGradient = ctx.createRadialGradient(
            this.width * 0.3, this.height * 0.5, 0,
            this.width * 0.3, this.height * 0.5, this.width * 0.8
        );
        bgGradient.addColorStop(0, this.theme.bg2);
        bgGradient.addColorStop(0.6, this.theme.bg1);
        bgGradient.addColorStop(1, this.theme.bg1);

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Patrón de hexágonos sutiles
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const hexSize = 30;
        for (let y = -hexSize; y < this.height + hexSize; y += hexSize * 1.5) {
            for (let x = -hexSize; x < this.width + hexSize; x += hexSize * Math.sqrt(3)) {
                const offsetX = (y / (hexSize * 1.5)) % 2 === 0 ? 0 : hexSize * Math.sqrt(3) / 2;
                this.drawHexagon(ctx, x + offsetX, y, hexSize);
            }
        }

        // Ondas decorativas
        ctx.strokeStyle = this.theme.primary;
        ctx.globalAlpha = 0.03;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            for (let x = 0; x < this.width; x += 10) {
                const y = this.height * 0.5 + Math.sin((x + i * 100) * 0.01) * 50 + i * 30;
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Partículas luminosas
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const size = Math.random() * 3 + 1;
            const alpha = Math.random() * 0.5 + 0.1;

            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            gradient.addColorStop(0, `rgba(${this.hexToRgb(this.theme.primary)}, ${alpha})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawHexagon(ctx, x, y, size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + size * Math.cos(angle);
            const hy = y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
    }

    async drawModernAvatar(ctx, avatarURL, level, prestige) {
        try {
            const avatar = await loadImage(avatarURL);
            const size = 200;
            const x = 70;
            const y = (this.height - size) / 2;

            // Contenedor con sombra
            ctx.shadowColor = this.theme.shadow;
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;

            // Anillo exterior animado
            const outerRing = ctx.createLinearGradient(x, y, x + size, y + size);
            outerRing.addColorStop(0, this.theme.primary);
            outerRing.addColorStop(0.5, this.theme.secondary);
            outerRing.addColorStop(1, this.theme.accent);

            ctx.strokeStyle = outerRing;
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2 + 12, 0, Math.PI * 2);
            ctx.stroke();

            // Anillo medio
            ctx.strokeStyle = this.theme.bg1;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2 + 6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            // Clip circular para avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, x, y, size, size);
            ctx.restore();

            // Overlay de brillo
            const overlayGradient = ctx.createLinearGradient(x, y, x, y + size);
            overlayGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
            overlayGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
            overlayGradient.addColorStop(1, 'transparent');

            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.fillStyle = overlayGradient;
            ctx.fillRect(x, y, size, size);
            ctx.restore();

            // Badge de nivel
            this.drawLevelBadge(ctx, x + size - 35, y + size - 35, level, prestige);

        } catch (error) {
            console.error('Error cargando avatar:', error);
            this.drawDefaultAvatar(ctx, 70, (this.height - 200) / 2, 200);
        }
    }

    drawDefaultAvatar(ctx, x, y, size) {
        const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
        gradient.addColorStop(0, this.theme.bg3);
        gradient.addColorStop(1, this.theme.bg2);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.theme.text;
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + size / 2, y + size / 2);
    }

    drawLevelBadge(ctx, x, y, level, prestige) {
        const size = 70;

        // Sombra del badge
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        // Fondo del badge con gradiente
        const bgGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        if (prestige > 0) {
            bgGradient.addColorStop(0, '#ffd700');
            bgGradient.addColorStop(1, '#ff8c00');
        } else {
            bgGradient.addColorStop(0, this.theme.accent);
            bgGradient.addColorStop(1, this.theme.secondary);
        }

        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Borde brillante
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
        ctx.stroke();

        // Texto del nivel
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Poppins';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(level.toString(), x + size / 2, y + size / 2);

        // Indicador de prestigio
        if (prestige > 0) {
            ctx.font = 'bold 14px Poppins';
            ctx.fillText(`P${prestige}`, x + size / 2, y + size / 2 + 20);
        }
    }

    drawUserInfo(ctx, username, discriminator, title) {
        const startX = 310;
        const startY = 80;

        // Título/rol si existe
        /* if (title) {
             ctx.font = 'bold 20px Poppins';
             const titleGradient = ctx.createLinearGradient(startX, startY - 35, startX + 300, startY - 35);
             titleGradient.addColorStop(0, this.theme.gold);
             titleGradient.addColorStop(1, this.theme.secondary);
             ctx.fillStyle = titleGradient;
             ctx.textAlign = 'left';
             ctx.fillText(`✦ ${title}`, startX, startY - 20);
         }*/

        // Nombre de usuario con efecto neón
        ctx.font = 'bold 52px Poppins';
        const nameGradient = ctx.createLinearGradient(startX, startY, startX + 600, startY);
        nameGradient.addColorStop(0, this.theme.primary);
        nameGradient.addColorStop(0.5, this.theme.secondary);
        nameGradient.addColorStop(1, this.theme.primary);

        // Sombra de texto neón
        ctx.shadowColor = this.theme.shadow;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = nameGradient;
        ctx.textAlign = 'left';
        ctx.fillText(username, startX, startY);

        ctx.shadowBlur = 0;

        // Discriminador
        if (discriminator && discriminator !== '0') {
            const nameWidth = ctx.measureText(username).width;
            ctx.font = '32px Poppins';
            ctx.fillStyle = this.theme.textDim;
            ctx.fillText(`#${discriminator}`, startX + nameWidth + 15, startY);
        }
    }

    drawRankBadge(ctx, rank, totalUsers) {
        const x = 310;
        const y = 130;
        const width = 280;
        const height = 70;

        // Fondo con blur glass effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.filter = 'blur(10px)';
        this.roundRect(ctx, x - 2, y - 2, width + 4, height + 4, 15);
        ctx.fill();
        ctx.filter = 'none';

        // Fondo principal
        const bgGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        bgGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        bgGradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        ctx.fillStyle = bgGradient;
        this.roundRect(ctx, x, y, width, height, 15);
        ctx.fill();

        // Borde brillante
        ctx.strokeStyle = `${this.theme.primary}40`;
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, 15);
        ctx.stroke();

        // Emoji de rango
        const rankEmoji = this.getRankEmoji(rank);
        ctx.font = '40px Arial';
        ctx.fillText(rankEmoji, x + 20, y + 48);

        // Texto "RANK"
        ctx.font = 'bold 16px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.textAlign = 'left';
        ctx.fillText('RANGO', x + 75, y + 28);

        // Número de rank con color según posición
        let rankColor;
        if (rank === 1) rankColor = '#ffd700';
        else if (rank === 2) rankColor = '#c0c0c0';
        else if (rank === 3) rankColor = '#cd7f32';
        else if (rank <= 10) rankColor = this.theme.primary;
        else rankColor = this.theme.text;

        ctx.font = 'bold 36px Poppins';
        ctx.fillStyle = rankColor;
        ctx.fillText(`#${rank}`, x + 75, y + 52); // Cambiado de 58 a 48 (-10px)

        const rankWidth = ctx.measureText(`#${rank}`).width;
        ctx.font = '18px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.fillText(`/ ${totalUsers}`, x + 75 + rankWidth + 8, y + 58);
    }

    drawCurrency(ctx, coins, tokens) {
        const startX = 640;
        const y = 145;
        const boxWidth = 180;
        const boxHeight = 60;
        const spacing = 200;

        // Coins con imagen
        this.drawCurrencyBox(
            ctx,
            startX,
            y,
            boxWidth,
            boxHeight,
            path.join(__dirname, '../Icons/dinero.png'), // <-- Ruta a tu imagen de coins
            coins,
            'MONEDAS',
            this.theme.gold
        );

        // Tokens con imagen
        this.drawCurrencyBox(
            ctx,
            startX + spacing,
            y,
            boxWidth,
            boxHeight,
            path.join(__dirname, '../Icons/tokens.png'), // <-- Ruta a tu imagen de tokens
            tokens,
            'TOKENS',
            this.theme.accent
        );
    }

    async drawCurrencyBox(ctx, x, y, width, height, icon, amount, label, accentColor) {
        // Fondo glass morphism
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.roundRect(ctx, x, y, width, height, 12);
        ctx.fill();

        // Borde con color del recurso
        ctx.strokeStyle = `${accentColor}60`;
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, 12);
        ctx.stroke();

        try {
            // Detectar si es una ruta de imagen
            if (typeof icon === 'string' && (icon.includes('.png') || icon.includes('.jpg') || icon.includes('.jpeg'))) {
                // Es una imagen - cargarla
                const iconImage = await loadImage(icon);
                const iconSize = 28;

                // Dibujar la imagen
                ctx.drawImage(
                    iconImage,
                    x + 15,
                    y + (height - iconSize) / 2,
                    iconSize,
                    iconSize
                );
            } else {
                // Es un emoji Unicode
                ctx.font = '28px Arial';
                ctx.fillText(icon, x + 15, y + 40);
            }
        } catch (error) {
            console.error(`Error cargando icono ${icon}:`, error);
            // Fallback a emoji
            ctx.font = '28px Arial';
            ctx.fillText('💰', x + 15, y + 40);
        }

        // Cantidad
        ctx.font = 'bold 24px Poppins';
        const gradient = ctx.createLinearGradient(x + 55, y, x + width, y);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(1, this.theme.text);
        ctx.fillStyle = gradient;
        ctx.textAlign = 'left';
        ctx.fillText(this.formatNumber(amount), x + 55, y + 32);

        // Label
        ctx.font = '12px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.fillText(label, x + 55, y + 50);
    }

    // ✅ CORREGIDO: drawProgressSection con valores correctos
    drawProgressSection(ctx, level, currentXP, requiredXP, progress, totalXP) {
        const x = 310;
        const y = 250;
        const width = 1020;
        const barHeight = 45;

        // Info de nivel y XP
        ctx.font = 'bold 18px Poppins';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(`NIVEL ${level}`, x, y);

        ctx.font = '16px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.textAlign = 'right';

        // ✅ Mostrar: "XP en nivel / XP necesario para subir"
        ctx.fillText(
            `${this.formatNumber(currentXP)} / ${this.formatNumber(requiredXP)} XP`,
            x + width,
            y
        );

        // Fondo de la barra
        const bgY = y + 15;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.roundRect(ctx, x, bgY, width, barHeight, 22);
        ctx.fill();

        // Borde interior
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, x + 2, bgY + 2, width - 4, barHeight - 4, 20);
        ctx.stroke();

        // Barra de progreso
        const progressWidth = Math.max(50, (width - 8) * progress);
        const progressGradient = ctx.createLinearGradient(x + 4, bgY, x + progressWidth, bgY);
        progressGradient.addColorStop(0, this.theme.primary);
        progressGradient.addColorStop(0.5, this.theme.secondary);
        progressGradient.addColorStop(1, this.theme.accent);

        ctx.fillStyle = progressGradient;
        this.roundRect(ctx, x + 4, bgY + 4, progressWidth - 4, barHeight - 8, 18);
        ctx.fill();

        // Efecto de brillo animado
        const shineGradient = ctx.createLinearGradient(x + 4, bgY + 4, x + 4, bgY + barHeight - 8);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        shineGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = shineGradient;
        this.roundRect(ctx, x + 4, bgY + 4, progressWidth - 4, (barHeight - 8) * 0.5, 18);
        ctx.fill();

        // Porcentaje dentro de la barra
        const percentage = (progress * 100).toFixed(1);
        ctx.font = 'bold 20px Poppins';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`${percentage}%`, x + width / 2, bgY + barHeight / 2);
        ctx.shadowBlur = 0;

        // XP Total debajo
        ctx.font = '14px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.textAlign = 'center';
        ctx.fillText(`XP Total: ${this.formatNumber(totalXP)}`, x + width / 2, bgY + barHeight + 25);
    }

    drawStatsGrid(ctx, messages, voiceMinutes, streakDays, boostMultiplier) {
        const startX = 310;
        const startY = 360;
        const boxWidth = 240;
        const boxHeight = 90;
        const spacing = 260;

        // RUTAS A TUS IMÁGENES - AJUSTA ESTAS RUTAS
        const stats = [
            {
                icon: path.join(__dirname, '../Icons/mensajes.png'), // <-- Ruta a tu imagen
                value: this.formatNumber(messages),
                label: 'Mensajes',
                color: this.theme.primary
            },
            {
                icon: path.join(__dirname, '../Icons/micro.png'), // <-- Ruta a tu imagen
                value: this.formatTime(voiceMinutes),
                label: 'Tiempo en Voz',
                color: this.theme.secondary
            },
            {
                icon: path.join(__dirname, '../Icons/fuego.png'), // <-- Ruta a tu imagen
                value: `${streakDays} días`,
                label: 'Racha Activa',
                color: '#f59e0b'
            },
            {
                icon: path.join(__dirname, '../Icons/boost.png'), // <-- Ruta a tu imagen
                value: `${boostMultiplier.toFixed(1)}x`,
                label: 'Multiplicador XP',
                color: this.theme.accent
            }
        ];

        // Dibujar cada stat box
        stats.forEach((stat, index) => {
            const x = startX + ((index % 4) * spacing);
            const y = startY + (Math.floor(index / 4) * 110);

            this.drawStatBox(ctx, x, y, boxWidth, boxHeight, stat.icon, stat.value, stat.label, stat.color);
        });
    }

    async drawStatBox(ctx, x, y, width, height, iconPath, value, label, color) {
        // Fondo glass
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.roundRect(ctx, x, y, width, height, 12);
        ctx.fill();

        // Borde con color del stat
        ctx.strokeStyle = `${color}50`;
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, 12);
        ctx.stroke();

        // Posición para el icono
        const iconSize = 40;
        const iconX = x + 20;
        const iconY = y + height / 2;

        try {
            // Cargar imagen desde archivo
            const iconImage = await loadImage(iconPath);

            // Dibujar el icono como imagen
            this.drawIconAsImage(ctx, iconX, iconY, iconSize, iconImage, color);

        } catch (error) {
            console.error(`Error cargando icono ${iconPath}:`, error);
            // Fallback a emoji si la imagen no se carga
            this.drawIconAsEmoji(ctx, iconX, iconY, iconSize, '❓', color);
        }

        // Valor
        ctx.font = 'bold 22px Poppins';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(value, x + 65, y + 35);

        // Label
        ctx.font = '13px Poppins';
        ctx.fillStyle = this.theme.textDim;
        ctx.fillText(label, x + 65, y + 58);
    }

    // Método para dibujar iconos como imágenes
    drawIconAsImage(ctx, x, y, size, image, color) {
        // Fondo para el icono (glow effect)
        const iconGradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
        iconGradient.addColorStop(0, 'rgba(255,255,255,0.2)');
        iconGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = iconGradient;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Dibujar la imagen del icono (recortada en círculo)
        const imgSize = size - 8; // Un poco más pequeña que el círculo

        // Crear clip circular
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, imgSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Dibujar la imagen centrada
        ctx.drawImage(
            image,
            x - imgSize / 2,
            y - imgSize / 2,
            imgSize,
            imgSize
        );
        ctx.restore();
    }

    // Método para fallback (emoji)
    drawIconAsEmoji(ctx, x, y, size, emoji, color) {
        // Fondo para el icono
        const iconGradient = ctx.createRadialGradient(x, y, 0, x, y, size / 2);
        iconGradient.addColorStop(0, `${color}40`);
        iconGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = iconGradient;
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Dibujar el emoji como texto
        ctx.font = '28px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x, y);
    }

    async drawModernBadges(ctx, badges, userData) {
        const x = 1100;
        const y = 180;
        const badgeSize = 55;
        const spacing = 70;

        // Título de badges - AUMENTA LA SEPARACIÓN
        /* ctx.font = 'bold 18px Poppins';
         ctx.fillStyle = this.theme.text;
         ctx.textAlign = 'left';
         ctx.fillText('LOGROS', x, y - 25);*/

        // Definir badges disponibles con nombres de archivo
        const availableBadges = [
            {
                icon: 'corona.png',
                name: 'Rey',
                condition: () => userData.rank === 1,
                color: '#ffd700'
            },
            {
                icon: 'numero1.png',
                name: 'Top 3',
                condition: () => userData.rank <= 3,
                color: '#ffd700'
            },
            {
                icon: 'estrella.png',
                name: 'Top 10',
                condition: () => userData.rank <= 10,
                color: this.theme.primary
            },
            {
                icon: 'fuego.png',
                name: 'Racha',
                condition: () => userData.streakDays >= 7,
                color: '#f59e0b'
            },
            {
                icon: 'diamante.png',
                name: 'Élite',
                condition: () => userData.level >= 50,
                color: this.theme.accent
            },
            {
                icon: 'hablador.png',
                name: 'Charlatán',
                condition: () => userData.messages >= 1000,
                color: this.theme.secondary
            },
            {
                icon: 'sol.png',
                name: 'Cantante',
                condition: () => userData.voiceMinutes >= 360,
                color: '#8b5cf6'
            },
            {
                icon: 'dinero.png',
                name: 'Rico',
                condition: () => userData.coins >= 10000,
                color: this.theme.gold
            }
        ];

        const earnedBadges = availableBadges.filter(b => b.condition()).slice(0, 8);

        // Cargar y dibujar cada badge
        for (let i = 0; i < earnedBadges.length; i++) {
            const badge = earnedBadges[i];
            const bx = x + ((i % 4) * spacing);
            const by = y + 10 + (Math.floor(i / 4) * spacing);

            try {
                // Cargar la imagen desde la carpeta Badges
                const badgeImage = await loadImage(path.join(__dirname, this.badgesPath, badge.icon));
                //console.log(badgeImage)

                // Glow effect
                const glowGradient = ctx.createRadialGradient(bx, by, 0, bx, by, badgeSize);
                glowGradient.addColorStop(0, `${badge.color}40`);
                glowGradient.addColorStop(1, 'transparent');

                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(bx, by, badgeSize, 0, Math.PI * 2);
                ctx.fill();

                // Fondo del badge
                const badgeGradient = ctx.createRadialGradient(bx, by, 0, bx, by, badgeSize / 2);
                badgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
                badgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

                ctx.fillStyle = badgeGradient;
                ctx.beginPath();
                ctx.arc(bx, by, badgeSize / 2, 0, Math.PI * 2);
                ctx.fill();

                // Borde del badge
                ctx.strokeStyle = badge.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(bx, by, badgeSize / 2, 0, Math.PI * 2);
                ctx.stroke();

                // Dibujar la imagen del badge (ajustada al círculo)
                const imgSize = badgeSize - 10; // Un poco más pequeña que el círculo
                ctx.save();
                ctx.beginPath();
                ctx.arc(bx, by, imgSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // Centrar la imagen
                ctx.drawImage(
                    badgeImage,
                    bx - imgSize / 2,
                    by - imgSize / 2,
                    imgSize,
                    imgSize
                );
                ctx.restore();

            } catch (error) {
                console.error(`Error cargando badge ${badge.icon}:`, error);
                // Fallback a emoji si la imagen no se carga
                ctx.font = '30px Arial';
                ctx.fillStyle = badge.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Emojis de respaldo según el tipo de badge
                let fallbackEmoji = '🏆';
                if (badge.name.includes('Rey')) fallbackEmoji = '👑';
                else if (badge.name.includes('Top')) fallbackEmoji = '⭐';
                else if (badge.name.includes('Racha')) fallbackEmoji = '🔥';

                ctx.fillText(fallbackEmoji, bx, by);
            }
        }

        // Mensaje si no hay badges
        if (earnedBadges.length === 0) {
            ctx.font = '14px Poppins';
            ctx.fillStyle = this.theme.textDim;
            ctx.textAlign = 'center';
            ctx.fillText('Completa desafíos para ganar logros', x + 150, y + 50);
        }
    }

    drawGlowEffects(ctx) {
        // Efecto de luz superior izquierda
        const topGlow = ctx.createRadialGradient(200, 100, 0, 200, 100, 400);
        topGlow.addColorStop(0, this.theme.glow);
        topGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = topGlow;
        ctx.fillRect(0, 0, 600, 300);

        // Efecto de luz inferior derecha
        const bottomGlow = ctx.createRadialGradient(
            this.width - 200, this.height - 100, 0,
            this.width - 200, this.height - 100, 300
        );
        bottomGlow.addColorStop(0, this.theme.shadow);
        bottomGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = bottomGlow;
        ctx.fillRect(this.width - 600, this.height - 300, 600, 300);

        // Borde exterior con gradiente
        const borderGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        borderGradient.addColorStop(0, this.theme.primary);
        borderGradient.addColorStop(0.5, this.theme.secondary);
        borderGradient.addColorStop(1, this.theme.accent);

        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 4;
        this.roundRect(ctx, 12, 12, this.width - 24, this.height - 24, 25);
        ctx.stroke();

        // Borde interior sutil
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, 16, 16, this.width - 32, this.height - 32, 23);
        ctx.stroke();
    }

    // Utilidades
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

    formatNumber(num) {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    }

    formatTime(minutes) {
        if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${minutes}m`;
    }

    getRankEmoji(rank) {
        if (rank === 1) return '👑';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        if (rank <= 10) return '⭐';
        if (rank <= 50) return '🔸';
        return '🔹';
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
            : '255, 255, 255';
    }
}