import {
    SlashCommandBuilder,
    AttachmentBuilder,
    PermissionFlagsBits
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import path from 'path';

export default class RankCardSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('rankcard')
                .setDescription('Muestra la tarjeta de nivel del usuario.')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a mostrar')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('avatar')
                        .setDescription('Tipo de avatar a usar')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Avatar del servidor', value: 'server' },
                            { name: 'Avatar global', value: 'global' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('estilo')
                        .setDescription('Estilo de la tarjeta de rango')
                        .setRequired(false)
                        .addChoices(
                            { name: '🎨 Clásico (horizontal)', value: 'default' },
                            { name: '🎮 Perfil de arena (vertical)', value: 'game' }
                        )
                ),
            cooldown: 5,
            category: 'levels',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        await interaction.reply({ content: '✨ Generando tu RankCard... Esto puede llevar unos segundos!' });

        try {
            const targetUser =
                interaction.options.getUser('usuario') || interaction.user;

            const avatarType =
                interaction.options.getString('avatar') || 'server';

            const layout =
                interaction.options.getString('estilo') || 'default'; // por defecto clásico

            const targetMember =
                await interaction.guild.members
                    .fetch(targetUser.id)
                    .catch(() => null);

            if (!targetMember) {
                return interaction.editReply({
                    content: '❌ No se pudo encontrar al usuario en este servidor.',
                    flags: 64
                });
            }

            if (targetUser.bot) {
                return interaction.editReply({
                    content: '✨ Los bots tienen su propio sistema de niveles secreto.',
                    flags: 64
                });
            }

            const { default: RankCardGenerator } =
                await import('../../../LevelSystem/Canvas/RankCard.js');

            const guildId = interaction.guild.id;

            const userLevel =
                await client.levelManager.getOrCreateUserLevel(
                    guildId,
                    targetUser.id
                );

            const rank =
                await client.levelManager.getUserRank(
                    guildId,
                    targetUser.id
                );

            // =========================
            // Avatar y nombre
            // =========================
            let avatarURL;
            let displayName;

            if (avatarType === 'server') {
                avatarURL =
                    targetMember.displayAvatarURL({
                        extension: 'png',
                        size: 512,
                        forceStatic: false
                    }) ||
                    targetUser.displayAvatarURL({
                        extension: 'png',
                        size: 512
                    });

                displayName =
                    targetMember.displayName || targetUser.username;
            } else {
                avatarURL = targetUser.displayAvatarURL({
                    extension: 'png',
                    size: 512
                });
                displayName = targetUser.username;
            }

            const accentColor =
                typeof userLevel.customization?.active?.accentColor === 'string' &&
                    /^#([0-9A-F]{6})$/i.test(userLevel.customization.active.accentColor)
                    ? userLevel.customization.active.accentColor
                    : null;

            const backgroundUrl =
                typeof userLevel.customization?.active?.background === 'string'
                    ? userLevel.customization.active.background
                    : null;

            // =========================
            // Card data (CLAVE)
            // =========================
            const cardData = {
                username: displayName,
                discriminator: targetUser.discriminator,
                avatarURL,

                level: userLevel.level,
                xp: userLevel.xp,
                rank: rank?.rank || 999,
                totalUsers: rank?.totalUsers || 1,

                messages: userLevel.messages,
                voiceMinutes: userLevel.voiceMinutes,
                streakDays: userLevel.stats.streakDays,
                totalXP: userLevel.totalXP,

                coins: userLevel.coins || 0,
                tokens: userLevel.tokens || 0,
                boostMultiplier: userLevel.boostMultiplier,

                prestige: Math.floor(userLevel.level / 100),

                backgroundUrl,
                accentColor,

                guildId
            };

            // =========================
            // Generar RankCard con el estilo elegido
            // =========================
            const cardGenerator = new RankCardGenerator({ layout }); // 👈 aquí pasamos el layout
            const imageBuffer = await cardGenerator.generate(cardData);

            const attachmentName =
                `rankcard_${targetUser.username.replace(/[^a-z0-9]/gi, '_')}.png`;

            const attachment = new AttachmentBuilder(imageBuffer, {
                name: attachmentName
            });

            await interaction.editReply({
                content: "",
                files: [attachment]
            });

        } catch (error) {
            client.logger.error('Error generando rank card:', error);

            await interaction.editReply({
                content: `❌ Error al generar la tarjeta: ${error.message}`,
                flags: 64
            });
        }
    }

    // =========================
    // BADGES (opcional, se pueden eliminar si no se usan)
    // =========================
    getUserBadges(userLevel, rank) {
        const badges = [];

        if (rank === 1) badges.push('👑 Rey del Servidor');
        if (rank <= 3) badges.push('🏆 Top 3');
        if (rank <= 10) badges.push('⭐ Elite');

        if (userLevel.level >= 100) badges.push('💎 Leyenda');
        else if (userLevel.level >= 50) badges.push('🔥 Experto');
        else if (userLevel.level >= 25) badges.push('🎯 Veterano');

        if (userLevel.messages >= 10000)
            badges.push('💬 Maestro del Chat');

        if (userLevel.voiceMinutes >= 10000)
            badges.push('🎤 Voz Activa');

        if (userLevel.stats.streakDays >= 30)
            badges.push('🔥 Racha 30 días');

        if (userLevel.boostMultiplier >= 2.0)
            badges.push('⚡ Boost Máximo');

        if ((userLevel.coins || 0) >= 50000)
            badges.push('💰 Millonario');

        if ((userLevel.tokens || 0) >= 100)
            badges.push('💎 Coleccionista');

        return badges.slice(0, 5);
    }

    // =========================
    // TITULOS
    // =========================
    getUserTitle(level, rank) {
        if (rank === 1) return '👑 Emperador del Servidor';
        if (rank <= 3) return '🏆 Gran Maestro';
        if (rank <= 10) return '⭐ Maestro Élite';
        if (level >= 100) return '💎 Leyenda Suprema';
        if (level >= 75) return '🔥 Gran Guerrero';
        if (level >= 50) return '🎯 Héroe Experto';
        if (level >= 25) return '⚔️ Guerrero';
        if (level >= 10) return '🛡️ Aprendiz Avanzado';
        return '🌱 Principiante';
    }
}