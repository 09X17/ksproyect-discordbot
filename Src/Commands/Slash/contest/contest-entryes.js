import {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder, PermissionFlagsBits
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ContestMyEntriesCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-my-entries')
                .setDescription('Muestra tus entradas en los concursos')
                .addStringOption(option =>
                    option
                        .setName('estado')
                        .setDescription('Filtrar por estado')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Activas', value: 'active' },
                            { name: 'Ganadoras', value: 'winner' },
                            { name: 'Todas', value: 'all' }
                        )
                ),

            cooldown: 10,
            category: 'contest',
            botPermissions: [PermissionFlagsBits.SendMessages]
        });
    }

    async execute(client, interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const estado = interaction.options.getString('estado') || 'active';
            const contestManager = client.contestManager;
            const ContestEntry = require('../../../Models/ContestEntry.js');

            // Buscar entradas del usuario
            const query = {
                guildId: interaction.guild.id,
                userId: interaction.user.id
            };

            if (estado !== 'all') {
                query.status = estado;
            }

            const entries = await ContestEntry.find(query)
                .sort({ votes: -1, createdAt: -1 })
                .limit(10);

            if (entries.length === 0) {
                return interaction.editReply({
                    content: `📭 No tienes entradas ${estado !== 'all' ? estado : ''} en los concursos.`,
                    flags: 64
                });
            }

            // Calcular estadísticas
            const totalVotes = entries.reduce((sum, entry) => sum + entry.votes, 0);
            const bestEntry = entries.reduce((best, current) => 
                current.votes > best.votes ? current : best
            );

            // Crear contenedor de entradas con Components V2
            const entriesContainer = new ContainerBuilder()
                .setAccentColor(0x9B59B6)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        `# 📷 Tus Entradas en Concursos\n\n` +
                        `**Total de entradas:** ${entries.length}\n` +
                        `**Votos totales:** ${totalVotes}\n` +
                        `**Mejor entrada:** ${bestEntry.votes} votos\n\n` +
                        `## Lista de Entradas\n\n` +
                        entries.map((entry, index) => 
                            `### Entrada ${index + 1}\n` +
                            `**Estado:** ${this.getStatusEmoji(entry.status)} ${entry.status}\n` +
                            `**Votos:** ${entry.votes}\n` +
                            `**Fecha:** ${new Date(entry.createdAt).toLocaleDateString('es-ES')}\n` +
                            `**Canal:** <#${entry.channelId}>\n` +
                            `**Descripción:** ${entry.description?.slice(0, 100) || 'Sin descripción'}${entry.description?.length > 100 ? '...' : ''}\n` +
                            `────────────────`
                        ).join('\n\n')
                    )
                );

            // Botones de navegación
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('contest_view_best_entry')
                        .setLabel('Ver Mejor Entrada')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏆'),
                    new ButtonBuilder()
                        .setCustomId('contest_view_all_stats')
                        .setLabel('Estadísticas Detalladas')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setCustomId('contest_refresh_entries')
                        .setLabel('Actualizar')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔄')
                );

            await interaction.editReply({
                components: [entriesContainer, actionRow],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en contest-my-entries:', error);
            return interaction.editReply({
                content: '❌ Ocurrió un error al obtener tus entradas.',
                flags: 64
            });
        }
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'active': return '✅';
            case 'winner': return '🏆';
            case 'disqualified': return '❌';
            case 'removed': return '🗑️';
            default: return '❓';
        }
    }
}