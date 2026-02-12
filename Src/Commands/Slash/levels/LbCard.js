import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import LeaderboardCanvasGenerator from '../../../LevelSystem/Canvas/LeaderboardCard.js';

export default class LeaderboardSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('leaderboard-card')
                .setDescription('Muestra el ranking de niveles del servidor')
                .addStringOption(option =>
                    option
                        .setName('tipo')
                        .setDescription('Tipo de leaderboard a mostrar')
                        .setRequired(false)
                        .addChoices(
                            { name: '🏆 Nivel', value: 'level' },
                            { name: '⚡ XP Actual', value: 'xp' },
                            { name: '💎 XP Total', value: 'totalxp' },
                            { name: '💬 Mensajes', value: 'messages' },
                            { name: '🎤 Voz', value: 'voice' },
                            { name: '🔥 Diario', value: 'daily' },
                            { name: '📅 Semanal', value: 'weekly' },
                            { name: '📊 Mensual', value: 'monthly' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('tema')
                        .setDescription('Tema visual del leaderboard')
                        .setRequired(false)
                        .addChoices(
                            { name: '🌌 Neon', value: 'neon' },
                            { name: '🤖 Cyberpunk', value: 'cyberpunk' },
                            { name: '🌈 Aurora', value: 'aurora' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('pagina')
                        .setDescription('Página a mostrar')
                        .setRequired(false)
                        .setMinValue(1)
                ),
            cooldown: 10,
            category: 'niveles'
        });

        this.currentPage = new Map();
        this.canvasGenerator = new LeaderboardCanvasGenerator();
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const type = interaction.options.getString('tipo') || 'level';
            const theme = interaction.options.getString('tema') || 'neon';
            let page = interaction.options.getInteger('pagina') || 1;
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const limit = 10;
            const offset = (page - 1) * limit;

            // Obtener leaderboard
            const leaderboard = await client.levelManager.getLeaderboard(guildId, type, limit, offset);

            if (!leaderboard || leaderboard.length === 0) {
                return interaction.editReply({
                    content: '📭 No hay datos para mostrar en el leaderboard.',
                    flags: 64
                });
            }

            // Obtener estadísticas
            const stats = await client.levelManager.getStats(guildId);
            const totalPages = Math.max(1, Math.ceil(stats.totalUsers / limit));

            if (page > totalPages) page = totalPages;

            // Obtener rank del usuario actual
            const userRank = await client.levelManager.getUserRank(guildId, userId);

            // Generar canvas
            const canvasGenerator = new LeaderboardCanvasGenerator({ theme });
            const imageBuffer = await canvasGenerator.generate({
                leaderboard,
                type,
                page,
                totalPages,
                stats,
                guildName: interaction.guild.name,
                guildIcon: interaction.guild.iconURL({ size: 256 }),
                userRank
            });

            // Crear botones de navegación
            const buttons = this.createNavigationButtons(page, totalPages, type, theme);

            // Guardar estado
            const key = `${userId}:${guildId}:${type}:${theme}`;
            this.currentPage.set(key, { page, type, theme });

            // Enviar imagen
            await interaction.editReply({
                files: [{
                    attachment: imageBuffer,
                    name: `leaderboard_${type}_${page}.png`
                }],
                components: totalPages > 1 ? [buttons] : []
            });

        } catch (error) {
            client.logger.error('Error en comando leaderboard:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al mostrar el leaderboard.',
                flags: 64
            });
        }
    }

    createNavigationButtons(currentPage, totalPages, type) {
        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_prev_${type}`)
                .setLabel('◀️ Anterior')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage <= 1),

            new ButtonBuilder()
                .setCustomId(`leaderboard_refresh_${type}`)
                .setLabel('🔄 Actualizar')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`leaderboard_next_${type}`)
                .setLabel('Siguiente ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(currentPage >= totalPages)
        );

        return row;
    }

    getRankMedal(rank) {
        switch (rank) {
            case 1: return '<:32632level8:1452459286289584272>';
            case 2: return '<:8266level6:1452459285014380554>';
            case 3: return '<:90891level7:1452459294766137405>';
            case 4: return '<:63614faceit4lvl:1452459338202611814>';
            case 5: return '<:95787faceit5lvl:1452459343512469668>';
            case 6: return '<:68460faceit6lvl:1452459340782108996>';
            case 7: return '<:67489faceit7lvl:1452459339486072905>';
            case 8: return '<:58585faceit8lvl:1452459335274991727>';
            case 9: return '<:60848faceit9level:1452459336487010374>';
            case 10: return '<:84242faceit10lvl:1452459342036078813>';
            default: return `${rank}.`;
        }
    }
}