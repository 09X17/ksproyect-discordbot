// Commands/Quests/DailyQuestsCommand.js
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class DailyQuestsCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('daily-quests')
                .setDescription('Sistema de misiones diarias')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('view')
                        .setDescription('Ver tus misiones diarias activas')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('progress')
                        .setDescription('Ver tu progreso en todas las misiones')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('claim')
                        .setDescription('Reclamar recompensa de misión completada')
                        .addStringOption(option =>
                            option.setName('quest-id')
                                .setDescription('ID de la misión')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reroll')
                        .setDescription('Cambiar una misión (costo: 100 monedas)')
                        .addStringOption(option =>
                            option.setName('quest-id')
                                .setDescription('ID de la misión a cambiar')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('weekly')
                        .setDescription('Ver misiones semanales')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('leaderboard')
                        .setDescription('Top completadores de misiones')
                        .addStringOption(option =>
                            option.setName('timeframe')
                                .setDescription('Período de tiempo')
                                .addChoices(
                                    { name: 'Diario', value: 'daily' },
                                    { name: 'Semanal', value: 'weekly' },
                                    { name: 'Mensual', value: 'monthly' },
                                    { name: 'Total', value: 'alltime' }
                                )
                        )
                ),
            cooldown: 5,
            category: 'quests',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.UseExternalEmojis
            ]
        });
    }

    async execute(client, interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            
            switch (subcommand) {
                case 'view':
                    await this.viewQuests(client, interaction);
                    break;
                case 'progress':
                    await this.viewProgress(client, interaction);
                    break;
                case 'claim':
                    await this.claimQuest(client, interaction);
                    break;
                case 'reroll':
                    await this.rerollQuest(client, interaction);
                    break;
                case 'weekly':
                    await this.viewWeeklyQuests(client, interaction);
                    break;
                case 'leaderboard':
                    await this.questLeaderboard(client, interaction);
                    break;
            }
        } catch (error) {
            console.error('Error en daily-quests:', error);
            await interaction.reply({
                content: '❌ Ocurrió un error al procesar el comando.',
                flags: 64
            });
        }
    }

    async viewQuests(client, interaction) {
        const questManager = client.levelManager?.questManager;
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const dailyQuests = await questManager.getUserDailyQuests(userId, guildId);
        const weeklyQuests = await questManager.getUserWeeklyQuests(userId, guildId);

        const embed = new EmbedBuilder()
            .setTitle('<:quest:1456812819105321144> `TUS MISIONES ACTIVAS`')
            .setColor("#FFD700")
            .setDescription('<:informacion:1456828988361146490> **¡Completa misiones para ganar recompensas!**\n');

        // Misiones diarias
        if (dailyQuests.length > 0) {
            let dailyText = '';
            dailyQuests.forEach((quest, index) => {
                const progress = questManager.calculateProgress(quest);
                dailyText += `${index + 1}. **${quest.title}** - ${progress}%\n`;
            });
            
            embed.addFields({
                name: '<:daily:1457064155067449364> **MISIONES DIARIAS**',
                value: dailyText || 'No hay misiones diarias activas',
                inline: false
            });
        }

        // Misiones semanales
        if (weeklyQuests.length > 0) {
            let weeklyText = '';
            weeklyQuests.forEach((quest, index) => {
                const progress = questManager.calculateProgress(quest);
                weeklyText += `${index + 1}. **${quest.title}** - ${progress}%\n`;
            });
            
            embed.addFields({
                name: '<:weekly:1457064155067449365> **MISIONES SEMANALES**',
                value: weeklyText || 'No hay misiones semanales activas',
                inline: false
            });
        }

        embed.setFooter({ 
            text: `Usa /daily-quests claim [ID] para reclamar recompensas` 
        });

        await interaction.reply({ embeds: [embed] });
    }

    async viewProgress(client, interaction) {
        const questManager = client.levelManager?.questManager;
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        const stats = await questManager.getUserQuestStats(userId, guildId);

        const embed = new EmbedBuilder()
            .setTitle('<:stats:1456812819105321146> `ESTADÍSTICAS DE MISIONES`')
            .setColor("#00FF7F")
            .setDescription(`<:usuario:1457064155067449366> **Usuario:** ${interaction.user.tag}`)
            .addFields(
                {
                    name: '📊 **General**',
                    value: `• Total Completadas: **${stats.totalCompleted}**\n• Tasa de Éxito: **${stats.successRate}%**\n• Recompensas Totales: **${stats.totalRewards}**`,
                    inline: true
                },
                {
                    name: '⏱️ **Tiempos**',
                    value: `• Promedio Completación: **${stats.avgCompletionTime}m**\n• Racha Actual: **${stats.currentStreak} días**\n• Mejor Racha: **${stats.bestStreak} días**`,
                    inline: true
                },
                {
                    name: '🎯 **Específicas**',
                    value: `• Diarias Completadas: **${stats.dailyCompleted}**\n• Semanales Completadas: **${stats.weeklyCompleted}**\n• Épicas Completadas: **${stats.epicCompleted}**`,
                    inline: false
                }
            );

        await interaction.reply({ embeds: [embed] });
    }

    async claimQuest(client, interaction) {
        const questId = interaction.options.getString('quest-id');
        const questManager = client.levelManager?.questManager;
        
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const result = await questManager.claimQuestReward(
            interaction.user.id,
            interaction.guild.id,
            questId
        );

        if (!result.success) {
            return interaction.reply({
                content: `❌ ${result.message}`,
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('<:reward:1456812819105321147> `¡RECOMPENSA RECLAMADA!`')
            .setColor("#FFA500")
            .setDescription(`**${result.questTitle}**`)
            .addFields(
                {
                    name: '🎁 **Recompensas Obtenidas**',
                    value: `• XP: **+${result.rewards.xp}**\n• Monedas: **+${result.rewards.coins}**\n• Tokens: **+${result.rewards.tokens}**`,
                    inline: true
                },
                {
                    name: '📈 **Bonus**',
                    value: `• Multiplicador: **x${result.multiplier}**\n• Bonus de Racha: **+${result.streakBonus}**`,
                    inline: true
                },
                {
                    name: '💎 **Total**',
                    value: `**${result.totalXP} XP** + **${result.totalCoins} Monedas**`,
                    inline: false
                }
            )
            .setFooter({ 
                text: `¡Sigue completando misiones para más recompensas!` 
            });

        await interaction.reply({ embeds: [embed] });
    }

    async rerollQuest(client, interaction) {
        const questId = interaction.options.getString('quest-id');
        const questManager = client.levelManager?.questManager;
        
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const cost = 100;
        const userLevel = await client.levelManager.getUserLevel(
            interaction.user.id,
            interaction.guild.id
        );

        if (userLevel.coins < cost) {
            return interaction.reply({
                content: `❌ Necesitas ${cost} monedas para cambiar una misión.`,
                flags: 64
            });
        }

        const result = await questManager.rerollQuest(
            interaction.user.id,
            interaction.guild.id,
            questId,
            cost
        );

        if (!result.success) {
            return interaction.reply({
                content: `❌ ${result.message}`,
                flags: 64
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('<:reroll:1457064155067449367> `MISIÓN CAMBIADA`')
            .setColor("#9B59B6")
            .setDescription(`Has cambiado **${result.oldQuest}** por:`)
            .addFields({
                name: '🎯 **Nueva Misión**',
                value: `**${result.newQuest.title}**\n${result.newQuest.description}\n\nRecompensa: **${result.newQuest.rewards.xp} XP + ${result.newQuest.rewards.coins} Monedas**`,
                inline: false
            })
            .setFooter({ 
                text: `Costo: ${cost} monedas | Monedas restantes: ${userLevel.coins - cost}` 
            });

        await interaction.reply({ embeds: [embed] });
    }

    async questLeaderboard(client, interaction) {
        const timeframe = interaction.options.getString('timeframe') || 'weekly';
        const questManager = client.levelManager?.questManager;
        
        if (!questManager) {
            return interaction.reply({
                content: '❌ El sistema de misiones no está disponible.',
                flags: 64
            });
        }

        const leaderboard = await questManager.getQuestLeaderboard(
            interaction.guild.id,
            timeframe
        );

        const embed = new EmbedBuilder()
            .setTitle('<:leaderboard:1457064155067449368> `TOP COMPLETADORES DE MISIONES`')
            .setColor("#3498DB")
            .setDescription(`Período: **${this.getTimeframeName(timeframe)}**`);

        if (leaderboard.length === 0) {
            embed.setDescription('📭 No hay datos disponibles para este período.');
        } else {
            let leaderboardText = '';
            
            leaderboard.forEach((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹';
                leaderboardText += `${medal} **${index + 1}.** <@${entry.userId}> - **${entry.completed} misiones**\n`;
            });

            embed.addFields({
                name: '🏆 **Ranking**',
                value: leaderboardText,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }

    getTimeframeName(timeframe) {
        const names = {
            'daily': 'Diario',
            'weekly': 'Semanal',
            'monthly': 'Mensual',
            'alltime': 'Total'
        };
        return names[timeframe] || timeframe;
    }
}