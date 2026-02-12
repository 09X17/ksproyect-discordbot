import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class LeaderboardSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('leaderboard')
                .setDescription('Muestra el ranking de niveles del servidor')
                .addStringOption(option =>
                    option
                        .setName('tipo')
                        .setDescription('Tipo de leaderboard a mostrar')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Nivel (Predeterminado)', value: 'level' },
                            { name: 'XP Actual', value: 'xp' },
                            { name: 'XP Total', value: 'totalxp' },
                            { name: 'Mensajes', value: 'messages' },
                            { name: 'Voz', value: 'voice' },
                            { name: 'Diario', value: 'daily' },
                            { name: 'Semanal', value: 'weekly' },
                            { name: 'Mensual', value: 'monthly' },
                            { name: 'Monedas', value: 'coins' },
                            { name: 'Tokens', value: 'tokens' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('pagina')
                        .setDescription('Página a mostrar')
                        .setRequired(false)
                        .setMinValue(1)
                ),
            cooldown: 5,
            category: 'levels',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });

        this.currentPage = new Map();
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const type = interaction.options.getString('tipo') || 'level';
            let page = interaction.options.getInteger('pagina') || 1;
            const guildId = interaction.guild.id;
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

            // Crear embed
            const embed = this.createLeaderboardEmbed(leaderboard, type, page, stats, interaction.guild);

            // Botones de navegación
            const buttons = this.createNavigationButtons(page, totalPages, type);

            // Guardar página actual
            const key = `${interaction.user.id}:${guildId}:${type}`;
            this.currentPage.set(key, { page, type });

            await interaction.editReply({
                embeds: [embed],
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

    createLeaderboardEmbed(leaderboard, type, page, stats, guild) {
        const typeNames = {
            level: 'Nivel',
            xp: 'XP Actual',
            totalxp: 'XP Total',
            messages: 'Mensajes',
            voice: 'Minutos de Voz',
            daily: 'XP Diario',
            weekly: 'XP Semanal',
            monthly: 'XP Mensual',
            coins: 'Monedas',
            tokens: 'Tokens'
        };

        const emojis = {
            level: '🏆',
            xp: '💰',
            totalxp: '💎',
            messages: '📨',
            voice: '🎤',
            daily: '🔥',
            weekly: '📅',
            monthly: '📊'
        };

        const embed = new EmbedBuilder()
            .setColor("#FF82AD")
            .setTitle(`\`${typeNames[type].toUpperCase()} LEADERBOARD\``)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ text: `Página ${page} • Total de usuarios: ${stats.totalUsers}` })
            .setTimestamp();

        // Estadísticas del servidor
        embed.addFields({
            name: '<:fuego:1451696461413744640> __Estadísticas Del Servidor__',
            value: [
                ` - <:flechaderecha:1455684486938362010> **Usuarios:** \`${stats.totalUsers}\``,
                ` - <:flechaderecha:1455684486938362010> **Nivel promedio:** \`${stats.averageLevel}\``,
                ` - <:flechaderecha:1455684486938362010> **XP total:** \`${(stats.totalXP || 0).toLocaleString()}\``,
                ` - <:flechaderecha:1455684486938362010> **Activos hoy:** \`${stats.activeToday || 0}\``
            ].join('\n'),
            inline: false
        });

        // Entradas del leaderboard
        let leaderboardText = '';
        leaderboard.forEach((entry, index) => {
            const rank = (page - 1) * 10 + index + 1;
            const medal = `**#${rank}.**`;

            let value;
            switch (type) {
                case 'level': value = `NIVEL: ${entry.level || 0}`; break;
                case 'xp': value = `${(entry.xp || 0).toLocaleString()} XP`; break;
                case 'totalxp': value = `${(entry.totalXP || 0).toLocaleString()} XP`; break;
                case 'messages': value = `${(entry.messages || 0).toLocaleString()} mensajes`; break;
                case 'voice': value = `${(entry.voiceMinutes || 0).toLocaleString()} min`; break;
                case 'daily': value = `${(entry.stats?.dailyXp || 0).toLocaleString()} XP`; break;
                case 'weekly': value = `${(entry.stats?.weeklyXp || 0).toLocaleString()} XP`; break;
                case 'monthly': value = `${(entry.stats?.monthlyXp || 0).toLocaleString()} XP`; break;
                case 'coins':
                    value = `${(entry.coins || 0).toLocaleString()} monedas`;
                    break;

                case 'tokens':
                    value = `${(entry.tokens || 0).toLocaleString()} tokens`;
                    break;

                default: value = `NIVEL: ${entry.level || 0}`;
            }

            leaderboardText += `**${rank}.** \`${entry.username?.toUpperCase() || 'Usuario desconocido'}\` - \`${value}\`\n`;
        });
        //   console.log(leaderboardText.length);


        embed.addFields({
            name: '<:fuego:1451696461413744640> __Ranking__',
            value: leaderboardText || 'No hay datos disponibles',
            inline: false
        });

        return embed;
    }

    createNavigationButtons(currentPage, totalPages, type) {
        const row = new ActionRowBuilder();

        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`leaderboard_prev_${type}`)
                .setLabel('Anterior')
                .setEmoji("<:flechaizquierda:1456491998335865075>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage <= 1),

            new ButtonBuilder()
                .setCustomId(`leaderboard_refresh_${type}`)
                .setLabel('Actualizar')
                .setEmoji("<:recargar:1453081355054219486>")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`leaderboard_next_${type}`)
                .setLabel('Siguiente')
                .setEmoji("<:flechaderecha:1455684486938362010>")
                .setStyle(ButtonStyle.Secondary)
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
