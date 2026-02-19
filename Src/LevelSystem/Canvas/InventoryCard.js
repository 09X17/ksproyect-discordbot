import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { boxTypes } from '../Managers/boxTypesConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_BG_DIR = path.join(__dirname, '../Assets/UserBackgrounds');

try {
    registerFont(path.join(__dirname, '../Fonts/Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });
    registerFont(path.join(__dirname, '../Fonts/Montserrat-Regular.ttf'), { family: 'Montserrat' });
    registerFont(path.join(__dirname, '../Fonts/Poppins-Bold.ttf'), { family: 'Poppins', weight: 'bold' });
    registerFont(path.join(__dirname, '../Fonts/Poppins-Regular.ttf'), { family: 'Poppins' });
} catch (error) {
    console.warn('Fuentes no encontradas, usando fuentes por defecto');
}

export default class InventoryCardGenerator {
    constructor(options = {}) {
        this.width = options.width || 1800;
        this.height = options.height || 1200;
        this.iconsPath = options.iconsPath || path.join(__dirname, '../Icons');
        this.themes = {
            legendary: {
                bg1: '#0a0a1200',
                bg2: '#14142000',
                bg3: '#1e1e2e00',
                primary: '#ff6b35', // Naranja gaming
                secondary: '#00e0ff', // Cian brillante
                accent: '#9d4edd', // Púrpura
                legendary: '#ffaa00', // Dorado legendario
                epic: '#c770ff', // Púrpura épico
                rare: '#4d8bff', // Azul raro
                common: '#7289DA', // Azul común (de tu boxTypes)
                uncommon: '#2ECC71', // Verde poco común
                mythic: '#C0392B', // Rojo mítico
                divine: '#FFFFFF', // Blanco divino
                gold: '#fbbf24',
                text: '#ffffff',
                textDim: '#b0b0c0',
                cardBg: 'rgba(20, 20, 32, 0)',
                cardBorder: 'rgba(255, 107, 53, 0.3)',
                glow: 'rgba(255, 107, 53, 0.5)'
            }
        };
        this.customIcons = options.customIcons || {
            coins: 'dinero.png',
            tokens: 'tokens.png',
            messages: 'mensajes.png',
            voice: 'micro.png',
            streak: 'fuego.png',
            rank: 'rango.png',
            badgeDefault: 'tarjetas.png'
        };

        this.theme = this.themes[options.theme || 'legendary'];


    }

    async generate(inventoryData) {
        const {
            username,
            avatarURL,
            coins = 0,
            tokens = 0,
            xp = 0,
            level = 1,
            lootboxes = [],
            backgroundUrl = null,
            accentColor = null,
            badges = [],
            stats = {}
        } = inventoryData;

        if (accentColor) {
            this.theme = {
                ...this.theme,
                primary: accentColor,
                secondary: this.adjustColor(accentColor, 30),
                accent: this.adjustColor(accentColor, -30)
            };
        }

        const canvas = createCanvas(this.width, this.height);
        const ctx = canvas.getContext('2d');

        // Fondo estilo gaming
        if (backgroundUrl && typeof backgroundUrl === 'string' && backgroundUrl.length > 5) {
            await this.drawGamingBackground(ctx, backgroundUrl);
        } else {
            this.drawDefaultGamingBackground(ctx);
        }

        // Tarjeta de perfil estilo HUD
        await this.drawProfileCard(ctx, username, avatarURL, level, xp, badges);

        // Panel de recursos con estilo de juego
        this.drawResourcesPanel(ctx, coins, tokens);

        // Inventario de cajas con estilo de items
        await this.drawLootboxInventory(ctx, lootboxes);

        // Estadísticas del jugador
        this.drawPlayerStats(ctx, stats);

        // Barra inferior decorativa
        this.drawBottomBar(ctx);

        return canvas.toBuffer();
    }

    async drawGamingBackground(ctx, fileName) {
        try {
            const bgPath = path.join(USER_BG_DIR, fileName);

            if (!fs.existsSync(bgPath)) {
                console.warn('Background no existe:', bgPath);
                this.drawDefaultGamingBackground(ctx);
                return;
            }

            const img = await loadImage(bgPath);
            const scale = Math.max(this.width / img.width, this.height / img.height);
            const x = (this.width - img.width * scale) / 2;
            const y = (this.height - img.height * scale) / 2;

            // Imagen con efecto gaming
            ctx.filter = 'blur(4px) brightness(0.4) contrast(1.2)';
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            ctx.filter = 'none';

            const overlay = ctx.createLinearGradient(0, 0, 0, this.height);
            overlay.addColorStop(0, 'rgba(0,0,0,0.45)');
            overlay.addColorStop(1, 'rgba(0,0,0,0.65)');
            ctx.fillStyle = overlay;
            ctx.fillRect(0, 0, this.width, this.height);

            // Overlay con patrón de circuito
            this.drawCircuitPattern(ctx);

        } catch (err) {
            console.error('Error cargando background:', err);
            this.drawDefaultGamingBackground(ctx);
        }
    }

    drawDefaultGamingBackground(ctx) {
        // Gradiente base oscuro
        const bgGradient = ctx.createLinearGradient(0, 0, this.width, this.height);
        bgGradient.addColorStop(0, '#0a0a0a00');
        bgGradient.addColorStop(0.3, '#14141400');
        bgGradient.addColorStop(0.7, '#0f0f1a00');
        bgGradient.addColorStop(1, '#0a0a0a00');

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // Patrón de hexágonos estilo gaming
        this.drawHexGrid(ctx, 60);

        // Líneas de energía
        this.drawEnergyLines(ctx);

        // Partículas de energía
        this.drawEnergyParticles(ctx);
    }

    drawHexGrid(ctx, size) {
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.1)'; // 10% opacidad en vez de 5%
        ctx.lineWidth = 1.5; // Un poco más grueso

        for (let y = 0; y < this.height + size; y += size * 1.5) {
            for (let x = 0; x < this.width + size; x += size * Math.sqrt(3)) {
                const offsetX = (Math.floor(y / (size * 1.5)) % 2) * (size * Math.sqrt(3) / 2);
                this.drawHexagon(ctx, x + offsetX, y, size);
            }
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

    drawEnergyLines(ctx) {
        ctx.strokeStyle = 'rgba(0, 224, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(0, this.height * 0.2 + i * 150);
            for (let x = 0; x < this.width; x += 50) {
                const y = this.height * 0.2 + i * 150 + Math.sin(x * 0.01 + Date.now() * 0.0001) * 20;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.setLineDash([]);
    }

    drawEnergyParticles(ctx) {
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const size = Math.random() * 4 + 1;
            const alpha = Math.random() * 0.3 + 0.1;

            // Partículas con gradiente
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
            gradient.addColorStop(0, `rgba(255, 107, 53, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(0, 224, 255, ${alpha * 0.5})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, size * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawCircuitPattern(ctx) {
        // Dibuja un patrón de circuitos electrónicos
        ctx.strokeStyle = 'rgba(0, 224, 255, 0.05)';
        ctx.lineWidth = 1;

        // Líneas horizontales y verticales
        for (let i = 0; i < 20; i++) {
            const x = (this.width / 20) * i;
            const y = (this.height / 15) * i;

            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Nodos de circuito
        ctx.fillStyle = 'rgba(255, 107, 53, 0.1)';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.width;
            const y = Math.random() * this.height;
            const size = Math.random() * 6 + 2;

            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    async drawProfileCard(ctx, username, avatarURL, level, xp, badges = []) {
        const cardX = 100;
        const cardY = 100;
        const cardWidth = 750;
        const cardHeight = 300;

        // Tarjeta con efecto metalico
        this.drawMetalCard(ctx, cardX, cardY, cardWidth, cardHeight, this.theme.primary);

        // Avatar con marco de nivel
        try {
            const avatar = await loadImage(avatarURL);
            const size = 180;
            const avatarX = cardX + 40;
            const avatarY = cardY + (cardHeight - size) / 2;

            // Marco exterior con efecto de nivel
            const levelColor = this.getLevelColor(level);
            this.drawLevelFrame(ctx, avatarX - 10, avatarY - 10, size + 20, levelColor);

            // Clip circular para avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + size / 2, avatarY + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Avatar con filtro gaming
            ctx.filter = 'contrast(1.1) brightness(1.05)';
            ctx.drawImage(avatar, avatarX, avatarY, size, size);
            ctx.filter = 'none';
            ctx.restore();

            // Indicador de nivel sobre el avatar
            this.drawLevelIndicator(ctx, avatarX + size - 40, avatarY + size - 40, level);

        } catch (error) {
            console.error('Error cargando avatar:', error);
            // Avatar por defecto
            this.drawDefaultAvatar(ctx, cardX + 40, cardY + (300 - 180) / 2, 180);
        }

        // Información del usuario
        const infoX = cardX + 250;
        const infoY = cardY + 70;

        // Nombre de usuario con efecto neón
        ctx.font = 'bold 48px "Poppins"';
        const nameMetrics = ctx.measureText(username);
        const maxWidth = cardWidth - 270;

        let displayName = username;
        if (nameMetrics.width > maxWidth) {
            // Acortar nombre si es muy largo
            while (ctx.measureText(displayName + '...').width > maxWidth && displayName.length > 1) {
                displayName = displayName.slice(0, -1);
            }
            displayName += '...';
        }

        // Sombra de texto
        ctx.shadowColor = this.theme.primary;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Gradiente para el nombre
        const nameGradient = ctx.createLinearGradient(infoX, infoY, infoX + 400, infoY);
        nameGradient.addColorStop(0, this.theme.primary);
        nameGradient.addColorStop(0.5, this.theme.secondary);
        nameGradient.addColorStop(1, this.theme.primary);

        ctx.fillStyle = nameGradient;
        ctx.textAlign = 'left';
        ctx.fillText(displayName, infoX, infoY);

        ctx.shadowBlur = 0;

        // Nivel y progreso
        ctx.font = 'bold 28px "Poppins"';
        ctx.fillStyle = this.theme.textDim;
        ctx.fillText(`NIVEL ${level}`, infoX, infoY + 45);

        // Barra de XP
        this.drawXPBar(ctx, infoX, infoY + 75, 450, 20, level, xp);

        // Badges si existen
        if (badges && badges.length > 0) {
            this.drawPlayerBadges(ctx, infoX, infoY + 120, badges);
        }

        // Separador decorativo
        this.drawSeparator(ctx, infoX, infoY + 170, 450);
    }

    drawMetalCard(ctx, x, y, width, height, color) {
        // Fondo principal - CASI INVISIBLE
        const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
        bgGradient.addColorStop(0, 'rgba(20, 20, 30, 0.2)');     // 20% opacidad
        bgGradient.addColorStop(0.5, 'rgba(15, 15, 25, 0.15)');  // 15% opacidad
        bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.1)');     // 10% opacidad

        ctx.fillStyle = bgGradient;
        this.roundRect(ctx, x, y, width, height, 15);
        ctx.fill();

        // Borde - MUY SUTIL
        const borderGradient = ctx.createLinearGradient(x, y, x + width, y + height);
        borderGradient.addColorStop(0, `${color}33`);  // 33 = 20% opacidad
        borderGradient.addColorStop(0.5, `${color}22`); // 22 = 13% opacidad
        borderGradient.addColorStop(1, `${color}33`);

        ctx.strokeStyle = borderGradient;
        ctx.lineWidth = 1; // Muy fino
        this.roundRect(ctx, x, y, width, height, 15);
        ctx.stroke();

        // Reflejos - CASI IMPERCEPTIBLES
        const highlight = ctx.createLinearGradient(x, y, x, y + 40);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.03)');  // 3% opacidad
        highlight.addColorStop(1, 'transparent');

        ctx.fillStyle = highlight;
        ctx.save();
        ctx.beginPath();
        this.roundRect(ctx, x, y, width, height, 15);
        ctx.clip();
        ctx.fillRect(x, y, width, 40);
        ctx.restore();

        // Sin esquinas decorativas para mantenerlo minimal
    }
    drawCornerDecorations(ctx, x, y, width, height, color) {
        const cornerSize = 20;
        const lineWidth = 2;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;

        // Esquina superior izquierda
        ctx.beginPath();
        ctx.moveTo(x + cornerSize, y + lineWidth / 2);
        ctx.lineTo(x + lineWidth / 2, y + lineWidth / 2);
        ctx.lineTo(x + lineWidth / 2, y + cornerSize);
        ctx.stroke();

        // Esquina superior derecha
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y + lineWidth / 2);
        ctx.lineTo(x + width - lineWidth / 2, y + lineWidth / 2);
        ctx.lineTo(x + width - lineWidth / 2, y + cornerSize);
        ctx.stroke();

        // Esquina inferior izquierda
        ctx.beginPath();
        ctx.moveTo(x + lineWidth / 2, y + height - cornerSize);
        ctx.lineTo(x + lineWidth / 2, y + height - lineWidth / 2);
        ctx.lineTo(x + cornerSize, y + height - lineWidth / 2);
        ctx.stroke();

        // Esquina inferior derecha
        ctx.beginPath();
        ctx.moveTo(x + width - cornerSize, y + height - lineWidth / 2);
        ctx.lineTo(x + width - lineWidth / 2, y + height - lineWidth / 2);
        ctx.lineTo(x + width - lineWidth / 2, y + height - cornerSize);
        ctx.stroke();
    }

    drawLevelFrame(ctx, x, y, size, color) {
        // Marco con efecto de nivel
        const frameGradient = ctx.createRadialGradient(
            x + size / 2, y + size / 2, size / 4,
            x + size / 2, y + size / 2, size / 2
        );
        frameGradient.addColorStop(0, `${color}80`);
        frameGradient.addColorStop(0.7, `${color}30`);
        frameGradient.addColorStop(1, 'transparent');

        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = frameGradient;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Marco interior
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
    }

    getLevelColor(level) {
        if (level >= 100) return this.theme.legendary;
        if (level >= 50) return this.theme.epic;
        if (level >= 25) return this.theme.rare;
        return this.theme.common;
    }

    drawLevelIndicator(ctx, x, y, level) {
        const size = 50;
        const levelColor = this.getLevelColor(level);

        // Fondo del indicador
        const bgGradient = ctx.createLinearGradient(x, y, x + size, y + size);
        bgGradient.addColorStop(0, levelColor);
        bgGradient.addColorStop(1, this.adjustColor(levelColor, -20));

        ctx.fillStyle = bgGradient;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Borde brillante
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();

        // Texto del nivel
        ctx.font = 'bold 20px "Poppins"';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(level.toString(), x + size / 2, y + size / 2);
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
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x + size / 2, y + size / 2);
    }

    drawXPBar(ctx, x, y, width, height, level, xp) {
        const nextLevelXP = this.calculateNextLevelXP(level);
        const currentLevelXP = xp % nextLevelXP;
        const progress = currentLevelXP / nextLevelXP;

        // Fondo de la barra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.roundRect(ctx, x, y, width, height, height / 2);
        ctx.fill();

        // Borde de la barra
        ctx.strokeStyle = this.theme.textDim;
        ctx.lineWidth = 2;
        this.roundRect(ctx, x, y, width, height, height / 2);
        ctx.stroke();

        // Progreso con gradiente
        const progressWidth = Math.max(10, width * progress);
        const progressGradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
        progressGradient.addColorStop(0, this.theme.primary);
        progressGradient.addColorStop(0.5, this.theme.secondary);
        progressGradient.addColorStop(1, this.theme.accent);

        ctx.fillStyle = progressGradient;
        this.roundRect(ctx, x + 2, y + 2, progressWidth - 4, height - 4, (height - 4) / 2);
        ctx.fill();

        // Efecto de brillo
        const shineGradient = ctx.createLinearGradient(x + 2, y + 2, x + 2, y + height - 2);
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        shineGradient.addColorStop(1, 'transparent');

        ctx.fillStyle = shineGradient;
        this.roundRect(ctx, x + 2, y + 2, progressWidth - 4, (height - 4) / 2, (height - 4) / 2);
        ctx.fill();

        // Texto de XP
        ctx.font = '14px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            `${this.formatNumber(currentLevelXP)}/${this.formatNumber(nextLevelXP)} XP`,
            x + width / 2,
            y + height / 2
        );
    }

    drawPlayerBadges(ctx, x, y, badges) {
        const badgeSize = 32;
        const spacing = 10;
        const maxBadges = 6;

        badges.slice(0, maxBadges).forEach((badge, i) => {
            const badgeX = x + (i * (badgeSize + spacing));

            // Fondo del badge
            const badgeGradient = ctx.createRadialGradient(
                badgeX + badgeSize / 2, y + badgeSize / 2, 0,
                badgeX + badgeSize / 2, y + badgeSize / 2, badgeSize / 2
            );
            badgeGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            badgeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = badgeGradient;
            ctx.beginPath();
            ctx.arc(badgeX + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Borde del badge
            ctx.strokeStyle = badge.color || this.theme.primary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(badgeX + badgeSize / 2, y + badgeSize / 2, badgeSize / 2 - 1, 0, Math.PI * 2);
            ctx.stroke();

            // Emoji o icono
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(badge.emoji || '⭐', badgeX + badgeSize / 2, y + badgeSize / 2);
        });

        // Indicador de más badges
        if (badges.length > maxBadges) {
            ctx.font = '12px "Poppins"';
            ctx.fillStyle = this.theme.textDim;
            ctx.textAlign = 'left';
            ctx.fillText(`+${badges.length - maxBadges} más`, x + (maxBadges * (badgeSize + spacing)) + 5, y + badgeSize / 2);
        }
    }

    drawSeparator(ctx, x, y, width) {
        const gradient = ctx.createLinearGradient(x, y, x + width, y);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.2, this.theme.primary);
        gradient.addColorStop(0.8, this.theme.primary);
        gradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + width, y);
        ctx.stroke();

        // Puntos decorativos
        ctx.fillStyle = this.theme.primary;
        ctx.beginPath();
        ctx.arc(x + width * 0.2, y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x + width * 0.8, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawResourcesPanel(ctx, coins, tokens) {
        const panelX = 900;
        const panelY = 100;
        const panelWidth = 800;
        const panelHeight = 150;

        // Panel de recursos
        this.drawMetalCard(ctx, panelX, panelY, panelWidth, panelHeight, this.theme.secondary);

        // Título
        ctx.font = 'bold 28px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText('RECURSOS', panelX + 30, panelY + 45);

        // Recursos en grid
        const resources = [
            {
                icon: '💰',
                label: 'MONEDAS',
                value: coins,
                color: this.theme.gold || '#ffaa00',
                gradient: ['#ffaa00', '#ffcc00']
            },
            {
                icon: '🎫',
                label: 'TOKENS',
                value: tokens,
                color: this.theme.accent,
                gradient: [this.theme.accent, this.adjustColor(this.theme.accent, 30)]
            }
        ];

        const itemWidth = 350;
        const itemHeight = 70;
        const startX = panelX + 30;
        const startY = panelY + 70;

        resources.forEach((resource, i) => {
            const x = startX + (i * (itemWidth + 30));
            this.drawResourceItem(ctx, x, startY, itemWidth, itemHeight, resource);
        });
    }

    drawResourceItem(ctx, x, y, width, height, resource) {
        // SIN FONDO - solo borde muy sutil
        ctx.strokeStyle = `${resource.color}22`;
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, width, height, 10);
        ctx.stroke();

        // Intentar cargar icono custom
        const iconSize = 40;
        const iconX = x + 15;
        const iconY = y + (height - iconSize) / 2;

        // Determinar qué icono usar basado en el recurso
        const iconName =
            resource.label === 'TOKENS'
                ? this.customIcons.tokens
                : this.customIcons.coins;

        this.drawCustomIcon(ctx, iconX, iconY, iconSize, iconName, resource.color)
            .catch(() => {
                // Fallback a emoji si la imagen no se carga
                ctx.font = 'bold 32px Arial';
                ctx.fillStyle = resource.color;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(resource.icon, x + 20, y + height / 2);
            });

        // Label - texto tenue
        ctx.font = 'bold 16px "Poppins"';
        ctx.fillStyle = `${this.theme.text}99`;
        ctx.textAlign = 'left';
        ctx.fillText(resource.label, x + 70, y + height / 2 - 15);

        // Valor - texto normal
        ctx.font = 'bold 28px "Poppins"';
        ctx.fillStyle = resource.color;
        ctx.fillText(this.formatNumber(resource.value), x + 70, y + height / 2 + 15);
    }

    async drawLootboxInventory(ctx, lootboxes) {
        const panelX = 900;
        const panelY = 280;
        const panelWidth = 800;
        const panelHeight = 400;

        // Panel de inventario
        this.drawMetalCard(ctx, panelX, panelY, panelWidth, panelHeight, this.theme.accent);

        // Header del inventario
        ctx.font = 'bold 28px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(`INVENTARIO [${lootboxes.length}]`, panelX + 30, panelY + 45);

        if (lootboxes.length === 0) {
            // Mensaje de inventario vacío
            ctx.font = '20px "Poppins"';
            ctx.fillStyle = this.theme.textDim;
            ctx.textAlign = 'center';
            ctx.fillText('El inventario está vacío', panelX + panelWidth / 2, panelY + panelHeight / 2);
            return;
        }

        // Grid de items
        const cols = 2;
        const rows = 3;
        const itemWidth = 350;
        const itemHeight = 100;
        const padding = 20;
        const startX = panelX + 30;
        const startY = panelY + 70;

        // ✅ FILTRAR SOLO ITEMS CON CANTIDAD > 0
        const validBoxes = lootboxes.filter(box => box.quantity > 0);
        const visibleBoxes = validBoxes.slice(0, cols * rows);

        for (let i = 0; i < visibleBoxes.length; i++) {
            const box = visibleBoxes[i];

            // ✅ BUSCAR DEFINICIÓN DE CAJA - MEJORADO
            const boxDef = boxTypes[box.boxType] ||
                Object.values(boxTypes).find(b => b.name === box.itemName) || {
                name: box.itemName || box.boxType || 'Caja Desconocida',
                color: this.theme.common,
                emoji: '🎁',
                rarity: 'common'
            };

            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + (col * (itemWidth + padding));
            const y = startY + (row * (itemHeight + padding));

            await this.drawLootboxItem(ctx, x, y, itemWidth, itemHeight, boxDef, box.quantity);
        }

        // Indicador de más items
        if (validBoxes.length > cols * rows) {
            ctx.font = '16px "Poppins"';
            ctx.fillStyle = this.theme.textDim;
            ctx.textAlign = 'center';
            ctx.fillText(
                `+${validBoxes.length - (cols * rows)} items más...`,
                panelX + panelWidth / 2,
                panelY + panelHeight - 20
            );
        }
    }

    async drawLootboxItem(ctx, x, y, width, height, boxDef, quantity) {
        const rarity = boxDef.rarity || this.getRarityFromBoxType(boxDef.name);
        const rarityColor = this.theme[rarity] || boxDef.color || this.theme.common;
        const boxName = boxDef.name || 'Caja Desconocida';

        // SIN FONDO - solo borde muy sutil
        ctx.strokeStyle = `${rarityColor}22`;
        ctx.lineWidth = 1.5;
        this.roundRect(ctx, x, y, width, height, 12);
        ctx.stroke();

        // Indicador de rareza (barra lateral)
        ctx.fillStyle = `${rarityColor}33`;
        ctx.fillRect(x, y, 3, height);

        // Icono de la caja - intentar usar icono custom
        const iconSize = 60;
        const iconX = x + 20;
        const iconY = y + (height - iconSize) / 2;

        // Intentar cargar icono custom basado en la rareza
        const iconName = `caja-de-regalo.png`; // Ej: common_box.png, legendary_box.png

        try {
            await this.drawCustomIcon(ctx, iconX, iconY, iconSize, iconName, rarityColor);
        } catch (error) {
            // Fallback a emoji
            const boxEmoji = boxDef.emoji || '🎁';
            let displayEmoji = '🎁';
            const unicodeMatch = boxEmoji.match(/\p{Emoji}/u);
            if (unicodeMatch) {
                displayEmoji = unicodeMatch[0];
            }

            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = `${rarityColor}DD`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(displayEmoji, iconX + iconSize / 2, iconY + iconSize / 2);
        }

        // Nombre de la caja
        ctx.font = 'bold 22px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText(boxName.toUpperCase(), x + 100, y + 35);

        // Indicador de rareza
        ctx.font = 'bold 14px "Poppins"';
        ctx.fillStyle = `${rarityColor}99`;
        ctx.fillText(rarity.toUpperCase(), x + 100, y + 60);

        // Cantidad
        const qtyText = `×${quantity}`;
        ctx.font = 'bold 24px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'right';
        ctx.fillText(qtyText, x + width - 20, y + height / 2 + 5);
    }

    getRarityFromBoxType(boxName) {
        if (!boxName) return 'COMÚN';

        const nameLower = boxName.toLowerCase();
        if (nameLower.includes('legendaria') || nameLower.includes('legendary')) return 'LEGENDARIA';
        if (nameLower.includes('épica') || nameLower.includes('epic')) return 'ÉPICA';
        if (nameLower.includes('rara') || nameLower.includes('rare')) return 'RARA';
        if (nameLower.includes('poco común') || nameLower.includes('uncommon')) return 'NO COMÚN';
        if (nameLower.includes('mítica') || nameLower.includes('mythic')) return 'MÍTICA';
        if (nameLower.includes('divina') || nameLower.includes('divine')) return 'DIVINA';
        if (nameLower.includes('Caja de la Fortuna') || nameLower.includes('fortune')) return 'FORTUNA';
        if (nameLower.includes('Caja de Experiencia') || nameLower.includes('xp_boost')) return 'EXPERIENCIA';
        if (nameLower.includes("Caja del Juicio Divino") || nameLower.includes('divine_2')) return 'JUICIO DIVINO';
        if (nameLower.includes('Caja de Monedas') || nameLower.includes('coin_box')) return 'CAJA MONEDAS';
        if (nameLower.includes('Caja de Tokens') || nameLower.includes('token_box')) return 'CAJA TOKENS';
        if (nameLower.includes('Caja del Tesoro') || nameLower.includes('treasure_box')) return 'CAJA DE TESORO';
        if (nameLower.includes('Caja Suprema de Tokens') || nameLower.includes('supreme_tokens')) return 'CAJA SUPREMA TOKENS';
        return 'COMÚN';
    }

    drawPlayerStats(ctx, stats = {}) {
        const panelX = 100;
        const panelY = 450;
        const panelWidth = 750;
        const panelHeight = 230;

        // Panel de estadísticas
        this.drawMetalCard(ctx, panelX, panelY, panelWidth, panelHeight, this.theme.primary);

        // Título
        ctx.font = 'bold 28px "Poppins"';
        ctx.fillStyle = this.theme.text;
        ctx.textAlign = 'left';
        ctx.fillText('ESTADÍSTICAS', panelX + 30, panelY + 45);

        // Grid de stats (2x3) - USANDO STATS REALES
        const defaultStats = [
            {
                icon: '💬',
                label: 'MENSAJES',
                value: stats.messages || 0,
                color: this.theme.accent,
                suffix: ''
            },
            {
                icon: '🎤',
                label: 'TIEMPO VOZ',
                value: this.formatTime(stats.voiceMinutes || 0),
                color: this.theme.accent,
                suffix: ''
            },
            {
                icon: '🔥',
                label: 'RACHA',
                value: stats.streakDays || stats.activeDays || 0,
                color: this.theme.accent,
                suffix: ' días'
            },
            {
                icon: '🏆',
                label: 'RANGO',
                value: stats.rank ? `#${stats.rank}` : '#999',
                color: this.theme.accent || '#ffaa00',
                suffix: ''
            },
            {
                icon: '⚡',
                label: 'BOOST XP',
                value: `${(stats.boostMultiplier || 1.0).toFixed(1)}x`,
                color: this.theme.accent || '#ffaa00',
                suffix: ''
            }
        ];

        const cols = 3;
        const rows = 2;
        const cellWidth = 220;
        const cellHeight = 70;
        const startX = panelX + 30;
        const startY = panelY + 70;

        defaultStats.forEach((stat, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + (col * (cellWidth + 20));
            const y = startY + (row * (cellHeight + 10));

            this.drawStatItem(ctx, x, y, cellWidth, cellHeight, stat);
        });
    }

    // Método auxiliar para formatear tiempo
    formatTime(minutes) {
        if (minutes >= 60 * 24) {
            const days = Math.floor(minutes / (60 * 24));
            return `${days}d`;
        } else if (minutes >= 60) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
        }
        return `${minutes}m`;
    }

    drawStatItem(ctx, x, y, width, height, stat) {
        // SIN FONDO - solo línea de borde muy tenue
        ctx.strokeStyle = `${stat.color}11`;
        ctx.lineWidth = 1;
        this.roundRect(ctx, x, y, width, height, 8);
        ctx.stroke();

        // Determinar qué icono custom usar basado en la stat
        let iconName = this.getIconForStat(stat.label);
        const iconSize = 35;
        const iconX = x + 15;
        const iconY = y + (height - iconSize) / 2;

        // Intentar dibujar icono custom
        this.drawCustomIcon(ctx, iconX, iconY, iconSize, iconName, stat.color)
            .catch(() => {
                // Fallback a emoji si la imagen no se carga
                ctx.font = '24px Arial';
                ctx.fillStyle = `${stat.color}CC`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(stat.icon, x + 15, y + height / 2);
            });

        // Label - texto muy tenue
        ctx.font = 'bold 14px "Poppins"';
        ctx.fillStyle = `${this.theme.text}66`;
        ctx.textAlign = 'left';
        ctx.fillText(stat.label, x + 60, y + height / 2 - 15);

        // Valor - texto normal
        ctx.font = 'bold 24px "Poppins"';
        ctx.fillStyle = stat.color;
        ctx.fillText(`${this.formatNumber(stat.value)}${stat.suffix}`, x + 60, y + height / 2 + 15);
    }

    drawBottomBar(ctx) {
        const barHeight = 60;
        const y = this.height - barHeight;

        // Fondo de la barra
        const bgGradient = ctx.createLinearGradient(0, y, 0, this.height);
        bgGradient.addColorStop(0, 'rgba(20, 20, 32, 0.8)');
        bgGradient.addColorStop(1, 'rgba(10, 10, 20, 0.95)');

        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, y, this.width, barHeight);

        // Línea superior decorativa
        const lineGradient = ctx.createLinearGradient(0, y, this.width, y);
        lineGradient.addColorStop(0, this.theme.primary);
        lineGradient.addColorStop(0.5, this.theme.secondary);
        lineGradient.addColorStop(1, this.theme.primary);

        ctx.strokeStyle = lineGradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();

        // Texto informativo
        ctx.font = '16px "Poppins"';
        ctx.fillStyle = this.theme.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('INVENTARIO DEL JUGADOR', this.width / 2, y + barHeight / 2);

        // Decoraciones de esquina
        this.drawCornerDecorations(ctx, 50, y + 10, 100, barHeight - 20, this.theme.primary);
        this.drawCornerDecorations(ctx, this.width - 150, y + 10, 100, barHeight - 20, this.theme.secondary);
    }

    // Utilidades
    roundRect(ctx, x, y, width, height, radius) {
        if (radius > width / 2) radius = width / 2;
        if (radius > height / 2) radius = height / 2;

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

    calculateNextLevelXP(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    adjustColor(color, amount) {
        // Convierte hex a RGB, ajusta brillo, y vuelve a hex
        let usePound = false;

        if (color[0] === "#") {
            color = color.slice(1);
            usePound = true;
        }

        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = Math.min(Math.max(0, r), 255);
        g = Math.min(Math.max(0, g), 255);
        b = Math.min(Math.max(0, b), 255);

        return (usePound ? "#" : "") + (b | (g << 8) | (r << 16)).toString(16).padStart(6, '0');
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
    }

    async drawCustomIcon(ctx, x, y, size, iconName, tintColor = null) {
        const iconPath = path.join(this.iconsPath, iconName);

        if (!fs.existsSync(iconPath)) {
            throw new Error(`Icono no encontrado: ${iconPath}`);
        }

        const iconImage = await loadImage(iconPath);

        // Dibujar icono ORIGINAL (sin tinte)
        ctx.drawImage(iconImage, x, y, size, size);
    }


    getIconForStat(label) {
        const iconMap = {
            'MENSAJES': 'mensajes.png',
            'TIEMPO VOZ': 'micro.png',
            "TOKENS": 'tokens.png',
            'MONEDAS': 'dinero.png',
            'RANGO': 'rango.png',
            'BOOST XP': 'boost.png',
            'RACHA': 'fuego.png',
            'XP TOTAL': 'xp.png'
        };

        return iconMap[label] || 'tarjetas.png';
    }
}