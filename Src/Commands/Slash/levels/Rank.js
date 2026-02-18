import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class RankSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('rank')
                .setDescription('Muestra tu posición en el ranking del servidor')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a verificar')
                        .setRequired(false)
                ),
            cooldown: 3,
            category: 'niveles'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const target = interaction.options.getUser('usuario') || interaction.user;

            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ Los bots no tienen rank.',
                    flags: 64
                });
            }

            const guildId = interaction.guild.id;
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);
            const rank = await client.levelManager.getUserRank(guildId, target.id);
            const progress = await userLevel.getProgress();

            const surroundingRanks = await this.getSurroundingRanks(client, guildId, rank.rank, target.id);
            const { default: RankCardGenerator } =
                await import('../../../LevelSystem/Canvas/RankCard.js');

            const avatarURL = target.displayAvatarURL({
                extension: 'png',
                size: 512
            });

            const accentColor =
                typeof userLevel.customization?.active?.accentColor === 'string' &&
                    /^#([0-9A-F]{6})$/i.test(userLevel.customization.active.accentColor)
                    ? userLevel.customization.active.accentColor
                    : null;

            const backgroundUrl =
                typeof userLevel.customization?.active?.background === 'string'
                    ? userLevel.customization.active.background
                    : null;

            const cardData = {
                username: target.username,
                discriminator: target.discriminator,
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
            const cardGenerator = new RankCardGenerator();
            const imageBuffer = await cardGenerator.generate(cardData);
            const attachmentName =
                `rankcard_${target.username.replace(/[^a-z0-9]/gi, '_')}.png`;
            const attachment = new AttachmentBuilder(imageBuffer, {
                name: attachmentName
            });


            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`\`NIVEL DE: ${target.username}\``)
                .setImage(`attachment://${attachmentName}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '\`POSICIÓN GLOBAL\`',
                        value: `<:flechaizq:1469346308455272640> **POSICIÓN:** \`#${rank.rank}/${rank.totalUsers}\`\n<:flechaizq:1469346308455272640> **PERCENTIL:** \`${rank.percentile.toFixed(1)}%\``,
                        inline: false
                    },
                    {
                        name: '\`NIVEL Y PROGRESO\`',
                        value: `<:flechaizq:1469346308455272640> **NIVEL:** \`${userLevel.level}\`\n<:flechaizq:1469346308455272640> **PROGRESO:** ${this.generateProgressBar(progress.percentage, 10)} \`${progress.percentage.toFixed(1)}%\``,
                        inline: false
                    },
                    {
                        name: '\`EXPERIENCIA\`',
                        value: `<:flechaizq:1469346308455272640> **XP:** \`${userLevel.xp.toLocaleString()}/${progress.nextLevelXP.toLocaleString()}\`\n<:flechaizq:1469346308455272640> **TOTAL:** \`${userLevel.totalXP.toLocaleString()}\``,
                        inline: false
                    },
                    {
                        name: '\`ECONOMÍA\`',
                        value: [
                            `<:flechaizq:1469346308455272640> **MONEDAS:** \`${userLevel.coins.toLocaleString()}\``,
                            `<:flechaizq:1469346308455272640> **TOKENS:** \`${userLevel.tokens.toLocaleString()}\``,
                            `<:flechaizq:1469346308455272640> **BOOST:** \`${userLevel.boostMultiplier}X ${this.getBoostStatus(userLevel)}\``,
                            `<:flechaizq:1469346308455272640> **RACHA:** \`${userLevel.stats.streakDays} DÍAS\``
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '\`ESTADÍSTICAS\`',
                        value: [
                            `<:flechaizq:1469346308455272640> **MENSAJES:** \`${userLevel.messages.toLocaleString()}\``,
                            `<:flechaizq:1469346308455272640> **VOZ:** \`${Math.floor(userLevel.voiceMinutes / 60)}H ${userLevel.voiceMinutes % 60}M\``,
                            `<:flechaizq:1469346308455272640> **XP HOY:** \`${userLevel.stats.xpToday.toLocaleString()}\``,
                            `<:flechaizq:1469346308455272640> **XP DIARIO:** \`${userLevel.stats.dailyXp.toLocaleString()}\``
                        ].join('\n'),
                        inline: true
                    }
                )

            if (surroundingRanks.length > 0) {
                let surroundingText = '';
                surroundingRanks.forEach(surrounding => {
                    const medal = this.getRankMedal(surrounding.rank);
                    const economy = this.getUserEconomyText(surrounding);
                    surroundingText += `${medal} **${surrounding.username.toUpperCase()}** - \`L${surrounding.level}\`\n`;
                });

                embed.addFields({
                    name: '\`TOP CIRCUNDANTE\`',
                    value: surroundingText || 'No hay datos disponibles',
                    inline: false
                });
            }

            // Agregar insignias de logro basadas en el rank
            const badges = this.getRankBadges(rank.rank, rank.totalUsers);
            const economyBadges = this.getEconomyBadges(userLevel);

            /*  if (badges.length > 0 || economyBadges.length > 0) {
                  embed.addFields({
                      name: '\`LOGROS\`',
                      value: `${badges.join(' ')} ${economyBadges.join(' ')}`.trim(),
                      inline: false
                  });
              }*/

            // Agregar historial reciente de transacciones si tiene
            const recentTransactions = this.getRecentTransactions(userLevel);
            if (recentTransactions) {
                embed.addFields({
                    name: '💸 Últimas Transacciones',
                    value: recentTransactions,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            client.logger.error('Error en comando rank:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al mostrar el rank.',
                flags: 64
            });
        }
    }

    async getSurroundingRanks(client, guildId, userRank, userId, range = 2) {
        try {
            const offset = Math.max(0, userRank - range - 1);
            const limit = range * 2 + 1;

            const leaderboard = await client.levelManager.getLeaderboard(
                guildId,
                'level',
                limit,
                offset
            );

            // Enriquecer con datos económicos de cada usuario
            const enrichedLeaderboard = await Promise.all(
                leaderboard
                    .filter(entry => entry.userId !== userId)
                    .slice(0, 5)
                    .map(async entry => {
                        try {
                            const userData = await client.levelManager.getUserLevel(guildId, entry.userId);
                            return {
                                ...entry,
                                coins: userData?.coins || 0,
                                tokens: userData?.tokens || 0,
                                boostMultiplier: userData?.boostMultiplier || 1
                            };
                        } catch {
                            return { ...entry, coins: 0, tokens: 0 };
                        }
                    })
            );

            return enrichedLeaderboard;

        } catch (error) {
            client.logger.error('Error obteniendo ranks circundantes:', error);
            return [];
        }
    }

    getRankBadges(rank, totalUsers) {
        const badges = [];
        const percentile = (rank / totalUsers) * 100;

        if (rank === 1) badges.push('<:corona:1472347363023655144>'); // Rey del servidor
        if (rank <= 3) badges.push('<:cinta:1453099434908061828>'); // Top 3
        if (rank <= 10) badges.push('<:fuego:1451696461413744640>'); // Top 10
        if (percentile <= 10) badges.push('<:top10:1472347466585346179>'); // Top 10%
        if (percentile <= 25) badges.push('<:recompensa:1456812362815373396>'); // Top 25%
        if (percentile <= 50) badges.push('<:recompensa:1456812362815373396>'); // Top 50%

        return badges;
    }

    getEconomyBadges(userLevel) {
        const badges = [];

        // Badges por cantidad de monedas
        if (userLevel.coins >= 1000000) badges.push('🏦');
        else if (userLevel.coins >= 100000) badges.push('💰');
        else if (userLevel.coins >= 10000) badges.push('💵');

        // Badges por tokens
        if (userLevel.tokens >= 1000) badges.push('💎💎');
        else if (userLevel.tokens >= 100) badges.push('💎');

        // Badges por boost
        if (userLevel.boostMultiplier >= 3) badges.push('🚀');
        else if (userLevel.boostMultiplier >= 2) badges.push('⚡');

        // Badges por racha
        if (userLevel.stats.streakDays >= 30) badges.push('🔥🔥');
        else if (userLevel.stats.streakDays >= 7) badges.push('🔥');

        return badges;
    }

    generateProgressBar(percentage, length = 15) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
    }

    getRankMedal(rank) {
        switch (rank) {
            case 1: return '<:number1:1354537214821929061>';
            case 2: return '<:number2:1354537158450348224>';
            case 3: return '<:number3:1354537216168169713>';
            case 4: return "<:number4:1354537163328327680>";
            case 5: return "<:number5:1354537164523966595>";
            default: return `${rank}.`;
        }
    }

    getBoostStatus(userLevel) {
        if (!userLevel.boostExpires) return '';

        const now = new Date();
        if (userLevel.boostExpires < now) return '';

        const hoursLeft = Math.max(0, Math.floor((userLevel.boostExpires - now) / (1000 * 60 * 60)));
        if (hoursLeft > 0) {
            return `(${hoursLeft}h)`;
        }

        const minutesLeft = Math.max(0, Math.floor((userLevel.boostExpires - now) / (1000 * 60)));
        return `(${minutesLeft}m)`;
    }

    getUserEconomyText(userData) {
        const parts = [];
        if (userData.coins > 0) parts.push(`🪙${userData.coins.toLocaleString()}`);
        if (userData.tokens > 0) parts.push(`💎${userData.tokens.toLocaleString()}`);
        return parts.join(' ');
    }

    getRecentTransactions(userLevel, limit = 3) {
        if (!userLevel.transactions || userLevel.transactions.length === 0) {
            return null;
        }

        const recent = userLevel.transactions
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);

        return recent.map(transaction => {
            const emoji = this.getTransactionEmoji(transaction);
            const sign = transaction.type === 'earn' || transaction.type === 'reward' ? '+' : '-';
            return `${emoji} ${sign}${transaction.amount} ${this.getCurrencyEmoji(transaction.currency)} ${transaction.description || ''}`;
        }).join('\n');
    }

    getTransactionEmoji(transaction) {
        switch (transaction.type) {
            case 'earn': return '🔼';
            case 'spend': return '🔽';
            case 'reward': return '🎁';
            case 'purchase': return '🛒';
            case 'transfer': return '↔️';
            default: return '📊';
        }
    }

    getCurrencyEmoji(currency) {
        switch (currency) {
            case 'coins': return '<:dinero:1451695904351457330>';
            case 'tokens': return '<:tokens:1451695903080579192>';
            case 'xp': return '<:xp:1453078768687255845>';
            default: return currency;
        }
    }
}