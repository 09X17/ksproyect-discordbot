import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
            
            // Obtener información del siguiente y anterior en el ranking
            const surroundingRanks = await this.getSurroundingRanks(client, guildId, rank.rank, target.id);
            
            // Crear embed
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`🏅 Rank de ${target.username}`)
                .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    {
                        name: '📊 Posición Global',
                        value: `**#${rank.rank}** de ${rank.totalUsers} usuarios\nPercentil: **${rank.percentile.toFixed(1)}%**`,
                        inline: false
                    },
                    {
                        name: '📈 Nivel y Progreso',
                        value: `Nivel **${userLevel.level}**\n${this.generateProgressBar(progress.percentage, 10)} **${progress.percentage.toFixed(1)}%**`,
                        inline: true
                    },
                    {
                        name: '💰 XP',
                        value: `${userLevel.xp.toLocaleString()} / ${progress.nextLevelXP.toLocaleString()}\nTotal: **${userLevel.totalXP.toLocaleString()}**`,
                        inline: true
                    },
                    {
                        name: '🪙 Economía',
                        value: [
                            `**Monedas:** ${userLevel.coins.toLocaleString()} 🪙`,
                            `**Tokens:** ${userLevel.tokens.toLocaleString()} 💎`,
                            `**Boost:** ${userLevel.boostMultiplier}x ${this.getBoostStatus(userLevel)}`,
                            `**Racha:** ${userLevel.stats.streakDays} días 🔥`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📊 Estadísticas',
                        value: [
                            `**Mensajes:** ${userLevel.messages.toLocaleString()}`,
                            `**Voz:** ${Math.floor(userLevel.voiceMinutes / 60)}h ${userLevel.voiceMinutes % 60}m`,
                            `**XP Hoy:** ${userLevel.stats.xpToday.toLocaleString()}`,
                            `**XP Diario:** ${userLevel.stats.dailyXp.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp();
            
            // Agregar ranking circundante si está disponible
            if (surroundingRanks.length > 0) {
                let surroundingText = '';
                surroundingRanks.forEach(surrounding => {
                    const medal = this.getRankMedal(surrounding.rank);
                    const economy = this.getUserEconomyText(surrounding);
                    surroundingText += `${medal} **${surrounding.username}** - N${surrounding.level} | 🪙${surrounding.coins?.toLocaleString() || 0}\n`;
                });
                
                embed.addFields({
                    name: '👥 Ranking Circundante',
                    value: surroundingText || 'No hay datos disponibles',
                    inline: false
                });
            }
            
            // Agregar insignias de logro basadas en el rank
            const badges = this.getRankBadges(rank.rank, rank.totalUsers);
            const economyBadges = this.getEconomyBadges(userLevel);
            
            if (badges.length > 0 || economyBadges.length > 0) {
                embed.addFields({
                    name: '🎖️ Logros',
                    value: `${badges.join(' ')} ${economyBadges.join(' ')}`.trim(),
                    inline: false
                });
            }
            
            // Agregar historial reciente de transacciones si tiene
            const recentTransactions = this.getRecentTransactions(userLevel);
            if (recentTransactions) {
                embed.addFields({
                    name: '💸 Últimas Transacciones',
                    value: recentTransactions,
                    inline: false
                });
            }
            
            await interaction.editReply({ embeds: [embed] });
            
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
        
        if (rank === 1) badges.push('👑'); // Rey del servidor
        if (rank <= 3) badges.push('🥇'); // Top 3
        if (rank <= 10) badges.push('🔥'); // Top 10
        if (percentile <= 10) badges.push('💎'); // Top 10%
        if (percentile <= 25) badges.push('✨'); // Top 25%
        if (percentile <= 50) badges.push('🌟'); // Top 50%
        
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
        return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
    }
    
    getRankMedal(rank) {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
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
            case 'coins': return '🪙';
            case 'tokens': return '💎';
            case 'xp': return '⭐';
            default: return currency;
        }
    }
}