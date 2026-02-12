import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import ContestEntry from '../../../Contest/Models/ContestEntry.js';
import ContestChannel from '../../../Contest/Models/ContestChannel.js';
import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class ContestWinnerCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-winner')
                .setDescription('Selecciona ganadores automáticamente y muestra tabla de posiciones')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

                .addChannelOption(option =>
                    option
                        .setName('canal-concurso')
                        .setDescription('Canal del concurso para analizar')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )

                .addChannelOption(option =>
                    option
                        .setName('canal-anuncio')
                        .setDescription('Canal para anunciar ganadores')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )

                .addIntegerOption(option =>
                    option
                        .setName('top')
                        .setDescription('Número de posiciones a mostrar (máx: 30)')
                        .setRequired(false)
                        .setMinValue(3)
                        .setMaxValue(30)
                )

                .addBooleanOption(option =>
                    option
                        .setName('imagen-tabla')
                        .setDescription('Generar imagen de la tabla de posiciones')
                        .setRequired(false)
                ),

            cooldown: 30,
            category: 'contest',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles
            ]
        });
    }

    async execute(client, interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const contestChannel = interaction.options.getChannel('canal-concurso');
            const announcementChannel = interaction.options.getChannel('canal-anuncio');
            const topCount = interaction.options.getInteger('top') || 30;
            const generateImage = interaction.options.getBoolean('imagen-tabla') || false;

            const contestConfig = await ContestChannel.findOne({
                guildId: interaction.guild.id,
                channelId: contestChannel.id
            });

            if (!contestConfig) {
                return interaction.editReply({
                    content: `❌ ${contestChannel} no es un canal de concurso configurado.`,
                    flags: 64
                });
            }

            const allEntries = await ContestEntry.find({
                guildId: interaction.guild.id,
                channelId: contestChannel.id,
                status: 'active'
            })
                .sort({ votes: -1, lastVoteAt: -1 })
                .limit(topCount)
                .lean();

            if (allEntries.length === 0) {
                return interaction.editReply({
                    content: `❌ No hay entradas activas en ${contestChannel}.`,
                    flags: 64
                });
            }

            const winners = allEntries.slice(0, 3);

            const topEntries = allEntries.slice(0, Math.min(topCount, allEntries.length));

            const leaderboardText = this.createLeaderboardTable(topEntries);

            const stats = this.calculateStats(allEntries);

            const adminContainer = await this.createAdminResults(
                contestChannel,
                winners,
                leaderboardText,
                stats,
                topCount
            );

            await interaction.editReply({
                components: [adminContainer],
                flags: MessageFlags.IsComponentsV2
            });

            const announcementResult = await this.announceWinnersWithTable(
                client,
                contestChannel,
                announcementChannel,
                winners,
                topEntries,
                stats,
                generateImage
            );

            await this.updateWinnersStatus(winners);

        } catch (error) {
            console.error('Error en contest-winner:', error);
            return interaction.editReply({
                content: '❌ Ocurrió un error al procesar los ganadores.',
                flags: 64
            });
        }
    }

    createLeaderboardTable(entries) {
        let table = '```\n';
        table += '┌─────┬──────────────────────┬────────┬──────────────┐\n';
        table += '│ Pos │ Participante         │ Votos  │ Último voto  │\n';
        table += '├─────┼──────────────────────┼────────┼──────────────┤\n';

        entries.forEach((entry, index) => {
            const position = (index + 1).toString().padEnd(3, ' ');
            const username = this.truncateText(`<@${entry.userId}>`, 18).padEnd(20, ' ');
            const votes = entry.votes.toString().padEnd(6, ' ');
            const lastVote = entry.lastVoteAt
                ? new Date(entry.lastVoteAt).toLocaleDateString('es-ES').padEnd(12, ' ')
                : 'Nunca'.padEnd(12, ' ');

            const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '  ';

            table += `│ ${position} │ ${username} │ ${votes} │ ${lastVote} │\n`;
        });

        table += '└─────┴──────────────────────┴────────┴──────────────┘\n';
        table += '```';

        return table;
    }

    async createSimpleLeaderboard(guild, entries, maxEntries = 15) {
        const displayEntries = entries.slice(0, Math.min(maxEntries, entries.length));

        let table = '```\n';
        table += '┌─────┬──────────────────────┬────────┐\n';
        table += '│ Pos │ Participante         │ Votos  │\n';
        table += '├─────┼──────────────────────┼────────┤\n';

        for (let index = 0; index < displayEntries.length; index++) {
            const entry = displayEntries[index];
            const position = (index + 1).toString().padEnd(3, ' ');

            let displayName = 'Usuario desconocido';

            try {
                const member = await guild.members.fetch(entry.userId);
                displayName = member.nickname || member.user.username;
            } catch {
                displayName = `Usuario ${entry.userId.slice(0, 6)}`;
            }

            const username = this.truncateText(displayName, 20).padEnd(20, ' ');
            const votes = entry.votes.toString().padEnd(6, ' ');
            const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '  ';

            table += `│ ${position}${medal} │ ${username} │ ${votes} │\n`;
        }

        table += '└─────┴──────────────────────┴────────┘\n';

        if (entries.length > maxEntries) {
            table += `\n... y ${entries.length - maxEntries} participantes más.\n`;
        }

        table += '```';

        return table;
    }

    async generateLeaderboardImage(client, entries, contestName) {
        try {
            const canvasWidth = 1000;
            const rowHeight = 80;
            const headerHeight = 180;
            const footerHeight = 100;
            const paddingTop = 20;
            const canvasHeight = headerHeight + (entries.length * rowHeight) + footerHeight + paddingTop;

            const backgroundImage = await loadImage(
                path.join(__dirname, '../../../Assets/Backgrounds/bg1.png')
            );

            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext('2d');

            // BACKGROUND
            ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

            // Overlay oscuro para que se lea bien
            ctx.fillStyle = 'rgba(10, 14, 39, 0.75)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            /* =========================
               Helper Functions
            ========================= */
            function drawRoundedRect(x, y, width, height, radius) {
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

            function drawCircularImage(image, centerX, centerY, radius) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(image, centerX - radius, centerY - radius, radius * 2, radius * 2);
                ctx.restore();
            }

            function drawTextWithShadow(text, x, y, color = '#FFFFFF', shadowColor = 'rgba(0, 0, 0, 0.7)') {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                ctx.fillStyle = color;
                ctx.fillText(text, x, y);
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
            }

            function drawGlowingCircle(x, y, radius, color, alpha = 0.15) {
                ctx.save();
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.5, color + '40');
                gradient.addColorStop(1, 'transparent');

                ctx.globalAlpha = alpha;
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            /* =========================
               FONDO PROFESIONAL
            ========================= */
            // Gradiente de fondo oscuro y elegante
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, '#0a0e2700');
            gradient.addColorStop(0.3, '#16213e00');
            gradient.addColorStop(0.7, '#1a1a2e00');
            gradient.addColorStop(1, '#0f0f2300');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // Efecto de grano refinado
            ctx.save();
            ctx.globalAlpha = 0.015;
            for (let i = 0; i < 2000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#FFD700';
                ctx.fillRect(
                    Math.random() * canvasWidth,
                    Math.random() * canvasHeight,
                    1, 1
                );
            }
            ctx.restore();

            /* =========================
               DECORACIÓN DE FONDO ANIMADA
            ========================= */
            drawGlowingCircle(150, 120, 200, '#FFD700', 0.12);
            drawGlowingCircle(canvasWidth - 120, 180, 180, '#E94560', 0.1);
            drawGlowingCircle(canvasWidth / 2, canvasHeight - 150, 250, '#4ECDC4', 0.08);
            drawGlowingCircle(80, canvasHeight - 100, 150, '#9D4EDD', 0.1);

            /* =========================
               HEADER IMPACTANTE
            ========================= */
            const headerY = 40;

            // Fondo del header con glassmorphism
            ctx.save();
            drawRoundedRect(60, headerY, canvasWidth - 120, 120, 20);

            const headerGradient = ctx.createLinearGradient(60, headerY, 60, headerY + 120);
            headerGradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
            headerGradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.08)');
            headerGradient.addColorStop(1, 'rgba(30, 30, 50, 0.4)');
            ctx.fillStyle = headerGradient;
            ctx.fill();

            // Borde brillante
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();

            // Título principal con estilo
            ctx.font = 'bold 42px "Segoe UI", Arial, sans-serif';
            ctx.textAlign = 'center';
            drawTextWithShadow('CLASIFICACIÓN OFICIAL', canvasWidth / 2, headerY + 60, '#FFFFFF');

            /* =========================
               TABLA DE PARTICIPANTES
            ========================= */
            const tableY = 200;

            // Contenedor de la tabla
            ctx.save();
            drawRoundedRect(40, tableY, canvasWidth - 80, (entries.length * rowHeight) + 50, 15);
            ctx.fillStyle = 'rgba(20, 25, 45, 0.7)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // Encabezados de columnas
            const colHeaderY = tableY + 30;
            ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'left';

            ctx.fillText('RANGO', 70, colHeaderY);
            ctx.fillText('PARTICIPANTE', 260, colHeaderY);
            ctx.textAlign = 'center';
            ctx.fillText('VOTOS', 720, colHeaderY);
            ctx.fillText('ESTADO', 860, colHeaderY);

            const medalImages = {
                0: await loadImage(
                    path.join(__dirname, '../../../Assets/Medals/medalla-de-oro.png')
                ),
                1: await loadImage(
                    path.join(__dirname, '../../../Assets/Medals/medalla-de-plata.png')
                ),
                2: await loadImage(
                    path.join(__dirname, '../../../Assets/Medals/medalla-de-bronce.png')
                )
            };

            /* =========================
               FILAS DE PARTICIPANTES
            ========================= */
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];
                const rowY = tableY + 60 + (i * rowHeight);

                // Fondo de la fila con efecto hover
                ctx.save();
                drawRoundedRect(50, rowY, canvasWidth - 100, rowHeight - 15, 12);

                let rowGradient;
                if (i < 3) {
                    // Top 3 con gradientes premium
                    const topGradients = [
                        ['rgba(255, 215, 0, 0.25)', 'rgba(255, 223, 0, 0.1)'],
                        ['rgba(192, 192, 192, 0.25)', 'rgba(200, 200, 200, 0.1)'],
                        ['rgba(205, 127, 50, 0.25)', 'rgba(210, 140, 70, 0.1)']
                    ];

                    rowGradient = ctx.createLinearGradient(50, rowY, 50, rowY + rowHeight - 15);
                    rowGradient.addColorStop(0, topGradients[i][0]);
                    rowGradient.addColorStop(1, topGradients[i][1]);
                } else {
                    rowGradient = ctx.createLinearGradient(50, rowY, 50, rowY + rowHeight - 15);
                    rowGradient.addColorStop(0, 'rgba(30, 35, 55, 0.5)');
                    rowGradient.addColorStop(1, 'rgba(25, 30, 50, 0.3)');
                }

                ctx.fillStyle = rowGradient;
                ctx.fill();

                // Borde para top 3
                if (i < 3) {
                    const borderColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                    ctx.strokeStyle = borderColors[i];
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
                ctx.restore();

                /* ===== POSICIÓN ===== */
                const posX = 100;
                const posY = rowY + (rowHeight - 15) / 2;

                //   const medals = ['🥇', '🥈', '🥉'];
                const posColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

                if (i < 3) {
                    const medalSize = 42;
                    drawGlowingCircle(posX, posY, 28, posColors[i], 0.25);

                    ctx.drawImage(
                        medalImages[i],
                        posX - medalSize / 2,
                        posY - medalSize / 2,
                        medalSize,
                        medalSize
                    );
                } else {
                    ctx.save();
                    ctx.fillStyle = 'rgba(78, 205, 196, 0.2)';
                    ctx.beginPath();
                    ctx.arc(posX, posY, 20, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();

                    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#4ECDC4';
                    ctx.fillText((i + 1).toString(), posX, posY + 7);
                }

                /* ===== USUARIO ===== */
                let username = 'Usuario Desconocido';
                let avatarURL = null;

                try {
                    const user = await client.users.fetch(entry.userId);
                    username = user.username;
                    avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
                } catch (e) {
                    console.warn('No se pudo obtener usuario:', entry.userId);
                }

                const avatarX = 270;
                const avatarY = rowY + (rowHeight - 15) / 2;
                const avatarRadius = 28;

                // Avatar con borde y sombra
                if (avatarURL) {
                    try {
                        const avatar = await loadImage(avatarURL);

                        // Borde del avatar
                        ctx.save();
                        const borderColor = i < 3 ? posColors[i] : '#4ECDC4';
                        ctx.strokeStyle = borderColor;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(avatarX, avatarY, avatarRadius + 2, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();

                        // Avatar circular
                        drawCircularImage(avatar, avatarX, avatarY, avatarRadius);
                    } catch (e) {
                        console.warn('Error cargando avatar:', e);
                        // Dibujar avatar por defecto si falla
                        ctx.fillStyle = '#555';
                        ctx.beginPath();
                        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }
                } else {
                    // Avatar por defecto
                    ctx.fillStyle = '#555';
                    ctx.beginPath();
                    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#FFF';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', avatarX, avatarY + 7);
                }

                // Nombre de usuario
                ctx.textAlign = 'left';
                ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = '#FFFFFF';

                const maxNameLength = 20;
                const displayName = username.length > maxNameLength
                    ? username.substring(0, maxNameLength) + '...'
                    : username;

                ctx.fillText(displayName, 320, avatarY + 7);

                /* ===== VOTOS ===== */
                const votesX = 720;

                // Badge de votos
                ctx.save();
                const voteWidth = 100;
                const voteHeight = 40;
                drawRoundedRect(votesX - voteWidth / 2, rowY + 12, voteWidth, voteHeight, 20);

                const voteGradient = ctx.createLinearGradient(
                    votesX - voteWidth / 2, rowY + 12,
                    votesX - voteWidth / 2, rowY + 12 + voteHeight
                );
                voteGradient.addColorStop(0, 'rgba(78, 205, 196, 0.3)');
                voteGradient.addColorStop(1, 'rgba(78, 205, 196, 0.1)');
                ctx.fillStyle = voteGradient;
                ctx.fill();

                ctx.strokeStyle = 'rgba(78, 205, 196, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                // Número de votos
                ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#4ECDC4';
                ctx.fillText(entry.votes.toString(), votesX, rowY + 40);

                /* ===== ESTADO ===== */
                const starImage = await loadImage(
                    path.join(__dirname, '../../../Assets/Medals/insignia.png')
                );

                const statusX = 860;
                const statusColor = i < 3 ? posColors[i] : '#4ECDC4';

                ctx.save();
                const badgeWidth = 90;
                const badgeHeight = 32;
                drawRoundedRect(
                    statusX - badgeWidth / 2,
                    rowY + 16,
                    badgeWidth,
                    badgeHeight,
                    16
                );
                ctx.fillStyle = statusColor + '30';
                ctx.fill();

                ctx.strokeStyle = statusColor;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
                ctx.fillStyle = statusColor;

                if (i < 3) {
                    const starSize = 16;
                    ctx.drawImage(
                        starImage,
                        statusX - 28,
                        rowY + 22,
                        starSize,
                        starSize
                    );

                    ctx.textAlign = 'left';
                    ctx.fillText('TOP', statusX - 8, rowY + 35);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText('ACTIVO', statusX, rowY + 37);
                }
            }

            /* =========================
      FOOTER ELEGANTE
   ========================= */

            // Iconos del footer
            const footerIcons = {
                users: await loadImage(path.join(__dirname, '../../../Assets/Medals/users.png')),
                votes: await loadImage(path.join(__dirname, '../../../Assets/Medals/votes.png')),
                date: await loadImage(path.join(__dirname, '../../../Assets/Medals/calendar.png'))
            };

            const footerY = canvasHeight - footerHeight;

            // Fondo del footer
            const footerGradient = ctx.createLinearGradient(0, footerY, 0, canvasHeight);
            footerGradient.addColorStop(0, 'rgba(10, 10, 20, 0)');
            footerGradient.addColorStop(0.5, 'rgba(10, 10, 20, 0.7)');
            footerGradient.addColorStop(1, 'rgba(5, 5, 15, 0.9)');
            ctx.fillStyle = footerGradient;
            ctx.fillRect(0, footerY, canvasWidth, footerHeight);

            // Línea decorativa
            ctx.save();
            const lineGradient = ctx.createLinearGradient(
                100,
                footerY + 10,
                canvasWidth - 100,
                footerY + 10
            );
            lineGradient.addColorStop(0, 'transparent');
            lineGradient.addColorStop(0.5, 'rgba(255, 217, 0, 0)');
            lineGradient.addColorStop(1, 'transparent');
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(100, footerY + 10);
            ctx.lineTo(canvasWidth - 100, footerY + 10);
            ctx.stroke();
            ctx.restore();

            // =========================
            // Estadísticas del footer
            // =========================
            ctx.font = '16px "Segoe UI", Arial, sans-serif';
            ctx.fillStyle = '#AAAAAA';
            ctx.textAlign = 'left';

            const date = new Date();
            const formattedDate = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const totalVotes = entries.reduce((sum, entry) => sum + entry.votes, 0);

            // Datos
            const stats = [
                {
                    icon: footerIcons.users,
                    text: `${entries.length} Participantes`
                },
                {
                    icon: footerIcons.votes,
                    text: `${totalVotes} Votos Totales`
                },
                {
                    icon: footerIcons.date,
                    text: formattedDate
                }
            ];

            // Posicionado auto-centrado
            const iconSize = 18;
            const spacing = 28;
            const textY = footerY + 70;

            // Calcular ancho total
            let totalWidth = 0;
            stats.forEach(stat => {
                totalWidth += iconSize + 8 + ctx.measureText(stat.text).width + spacing;
            });
            totalWidth -= spacing;

            // X inicial centrado real
            let startX = (canvasWidth - totalWidth) / 2;

            // Render
            stats.forEach((stat) => {
                ctx.drawImage(stat.icon, startX, textY - 14, iconSize, iconSize);
                ctx.fillText(stat.text, startX + iconSize + 8, textY);

                startX += iconSize + 8 + ctx.measureText(stat.text).width + spacing;
            });


            /* =========================
               OUTPUT
            ========================= */
            const buffer = canvas.toBuffer('image/png');
            return new AttachmentBuilder(buffer, {
                name: `leaderboard_${Date.now()}.png`
            });

        } catch (error) {
            console.error('❌ Error generando leaderboard:', error);
            return null;
        }
    }

    async announceWinnersWithTable(client, contestChannel, announcementChannel, winners, topEntries, stats, generateImage) {
        try {
            const result = { imageGenerated: false };

            // Obtener nombres reales de usuarios
            const winnersWithNames = await Promise.all(
                winners.map(async (winner, index) => {
                    let userData = {
                        username: `Usuario ${winner.userId.slice(0, 6)}`,
                        tag: `Usuario#${winner.userId.slice(0, 4)}`,
                        avatar: null
                    };

                    try {
                        const user = await client.users.fetch(winner.userId);
                        userData = {
                            username: user.username,
                            tag: user.tag,
                            avatar: user.displayAvatarURL({ extension: 'png', size: 128 })
                        };
                    } catch { }
                    const message = await this.fetchEntryMessage(client, winner);

                    return {
                        ...winner,
                        ...userData,
                        position: index + 1,
                        messageContent: message?.content ?? null,
                        embeds: message?.embeds ?? [],
                        attachments: message
                            ? [...message.attachments.values()]
                            : [],

                        jumpUrl: message?.url ?? null,
                        createdAt: message?.createdAt ?? null,
                        imageUrl:
                            message?.attachments.first()?.url ||
                            winner.imageUrl ||
                            null
                    };
                })
            );


            const leaderboardTable = await this.createSimpleLeaderboard(announcementChannel.guild, topEntries, 15);

            const mainEmbed = new EmbedBuilder()
                .setColor("#FF8FB9")
                .setTitle("**```EL CONCURSO HA FINALIZADO```**")
                .setDescription(
                    `<:flechaderecha:1458904809481572575> **${contestChannel}** Ha llegado a su fin.\n` +
                    `<:flechaderecha:1458904809481572575> ¡Después de \`${stats.totalVotes} VOTOS\`, estos son los resultados!`
                )
                .setThumbnail('https://cdn.discordapp.com/attachments/1147899500275449886/1459216660086001664/estrella-del-trofeo.png?ex=696278ea&is=6961276a&hm=5276784f21c7733cfde0d9b5860851e663afa627a8a8af8c429e818a9380a484&')

            mainEmbed.addFields({
                name: '**```TOP 3 GANADORES```**',
                value: winnersWithNames.map(winner =>
                    `**${['<:RedButton:922997252501405716>', '<:GreenButton:922998420027899965>', '<:WhiteButton:923282526322184212>'][winner.position - 1]} ${winner.position}° LUGAR**\n` +
                    `<:PlayMusic:922505306968313856> **${winner.username.toUpperCase()}** \`|\` **${winner.votes} Votos** \`|\` [Ver mensaje original](${winner.jumpUrl})\n` +
                    `━━━━━━━━━━━━━━━━━━━━`
                ).join('\n'),
                inline: false
            });

            mainEmbed.addFields({
                name: '**```ESTADÍSTICAS DEL CONCURSO```**',
                value:
                    `<:flechaderecha:1458904809481572575> \`TOTAL ENTRADAS:\` __${stats.totalEntries}__\n` +
                    `<:flechaderecha:1458904809481572575> \`TOTAL VOTOS:\` __${stats.totalVotes}__\n` +
                    `<:flechaderecha:1458904809481572575> \`PROMEDIO ENTRADAS:\` __${stats.averageVotes}__\n` +
                    `<:flechaderecha:1458904809481572575> \`PARTICIPANTES ÚNICOS:\` __${stats.uniqueParticipants}__\n` +
                    `<:flechaderecha:1458904809481572575> \`PERÍODO:\` __${new Date(stats.firstEntry).toLocaleDateString('es-ES')} - ${new Date().toLocaleDateString('es-ES')}__`,
                inline: false
            });

            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('CANAL CONCURSO')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/channels/${announcementChannel.guild.id}/${contestChannel.id}`),
                );

            const mainMessage = await announcementChannel.send({
                embeds: [mainEmbed],
                components: [actionRow]
            });

            const tableEmbed = new EmbedBuilder()
                .setColor("#FF8FB9")
                .setTitle(`**\`\`\`TABLA DE POSICIONES - TOP ${Math.min(15, topEntries.length)}\`\`\`**`)

            let tableMessage;
            if (generateImage) {
                const imageAttachment = await this.generateLeaderboardImage(client,
                    topEntries.slice(0, 20),
                    contestChannel.name
                );

                if (imageAttachment) {
                    tableEmbed.setImage(`attachment://${imageAttachment.name}`);

                    tableMessage = await announcementChannel.send({
                        embeds: [tableEmbed],
                        files: [imageAttachment]
                    });

                    result.imageGenerated = true;
                }
            }

            if (!tableMessage) {
                tableMessage = await announcementChannel.send({
                    embeds: [tableEmbed]
                });
            }
            return result;

        } catch (error) {
            console.error('Error anunciando ganadores:', error);
            return { imageGenerated: false };
        }
    }

    async createAdminResults(contestChannel, winners, leaderboardText, stats, topCount) {
        let winnersText = '';

        winners.forEach((winner, index) => {
            const medal = ['🥇', '🥈', '🥉'][index];
            winnersText +=
                `\n${medal} **Puesto ${index + 1}**\n` +
                `• **Participante:** <@${winner.userId}>\n` +
                `• **Votos:** ${winner.votes}\n` +
                `• **Entrada ID:** \`${winner._id}\`\n` +
                (winner.description ?
                    `• **Descripción:** ${this.truncateText(winner.description, 100)}\n` : '') +
                `────────────────`;
        });

        const content =
            `# 🏆 RESULTADOS DEL CONCURSO\n\n` +
            `**Canal:** ${contestChannel}\n` +
            `**Fecha de análisis:** ${stats.date}\n` +
            `**Participantes mostrados:** ${Math.min(topCount, stats.totalEntries)}/${stats.totalEntries}\n\n` +

            `## 🎖️ TOP 3 GANADORES\n` +
            `${winnersText}\n\n` +

            `## 📊 ESTADÍSTICAS\n` +
            `• **Total de entradas:** ${stats.totalEntries}\n` +
            `• **Total de votos:** ${stats.totalVotes}\n` +
            `• **Promedio de votos:** ${stats.averageVotes}\n` +
            `• **Participantes únicos:** ${stats.uniqueParticipants}\n` +
            `• **Máximo de votos:** ${stats.maxVotes}\n` +
            `• **Mínimo de votos:** ${stats.minVotes}\n\n` +

            `## 📈 TABLA DE POSICIONES COMPLETA\n` +
            `${leaderboardText}`;

        return new ContainerBuilder()
            .setAccentColor(0xFFD700)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(content)
            );
    }

    calculateStats(entries) {
        const totalVotes = entries.reduce((sum, entry) => sum + entry.votes, 0);
        const averageVotes = entries.length > 0 ? (totalVotes / entries.length).toFixed(2) : 0;
        const maxVotes = entries.length > 0 ? Math.max(...entries.map(e => e.votes)) : 0;
        const minVotes = entries.length > 0 ? Math.min(...entries.map(e => e.votes)) : 0;

        // Fechas
        const dates = entries.map(e => e.createdAt).filter(d => d);
        const firstEntry = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();

        // Participantes únicos
        const uniqueParticipants = [...new Set(entries.map(e => e.userId))].length;

        // Distribución de votos
        const voteDistribution = {
            menosDe10: entries.filter(e => e.votes < 10).length,
            entre10y50: entries.filter(e => e.votes >= 10 && e.votes < 50).length,
            masDe50: entries.filter(e => e.votes >= 50).length
        };

        return {
            totalEntries: entries.length,
            totalVotes,
            averageVotes,
            maxVotes,
            minVotes,
            uniqueParticipants,
            firstEntry,
            voteDistribution,
            date: new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    }

    async updateWinnersStatus(winners) {
        try {
            for (const winner of winners) {
                await ContestEntry.findByIdAndUpdate(winner._id, {
                    status: 'winner',
                    'metadata.winnerPosition': winners.indexOf(winner) + 1,
                    'metadata.declaredWinnerAt': new Date(),
                    'metadata.isTop3': true
                });
            }

            // También actualizar top 10
            const top10 = winners.slice(0, 10);
            for (let i = 0; i < top10.length; i++) {
                if (i >= 3) { // Solo actualizar posiciones 4-10
                    await ContestEntry.findByIdAndUpdate(top10[i]._id, {
                        'metadata.finalPosition': i + 1
                    });
                }
            }

        } catch (error) {
            console.error('Error actualizando estado de ganadores:', error);
        }
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength
            ? text.substring(0, maxLength - 3) + '...'
            : text;
    }

    async fetchEntryMessage(client, entry) {
        try {
            const channel = await client.channels.fetch(entry.channelId);
            if (!channel || !channel.isTextBased()) return null;

            const message = await channel.messages.fetch(entry.messageId);
            return message;
        } catch (err) {
            console.warn(`No se pudo obtener mensaje ${entry.messageId}`, err.message);
            return null;
        }
    }

}