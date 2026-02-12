import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ContestEndCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-end')
                .setDescription('Finaliza un concurso y muestra los ganadores')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal del concurso a finalizar')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addIntegerOption(option =>
                    option
                        .setName('ganadores')
                        .setDescription('Número de ganadores a mostrar (default: 3)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                ),

            cooldown: 30,
            category: 'contest',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const canal = interaction.options.getChannel('canal');
            const numGanadores = interaction.options.getInteger('ganadores') || 3;
            const contestManager = client.contestManager;

            // Finalizar concurso
            const result = await contestManager.endContest(
                interaction.guild.id,
                canal.id
            );

            if (!result.success) {
                return interaction.editReply({
                    content: result.message,
                    flags: 64
                });
            }

            // Obtener ganadores
            const winners = await contestManager.getWinners(
                interaction.guild.id,
                canal.id,
                numGanadores
            );

            if (winners.length === 0) {
                return interaction.editReply({
                    content: 'ℹ️ No hay entradas válidas en este concurso.',
                    flags: 64
                });
            }

            // Crear anuncio de ganadores con Components V2
            const winnersContainer = new ContainerBuilder()
                .setAccentColor(0xFFD700)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        `# 🏆 Concurso Finalizado!\n\n` +
                        `**Canal:** ${canal}\n` +
                        `**Fecha de finalización:** ${new Date().toLocaleDateString('es-ES')}\n\n` +
                        `## Ganadores del Concurso\n\n` +
                        winners.map(winner => 
                            `### 🥇 Puesto ${winner.position}\n` +
                            `**Participante:** <@${winner.userId}>\n` +
                            `**Votos:** ${winner.votes}\n` +
                            `**Descripción:** ${winner.description || 'Sin descripción'}\n` +
                            `────────────────`
                        ).join('\n\n')
                    )
                );

            // Botones de acción
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('contest_view_all_entries')
                        .setLabel('Ver Todas las Entradas')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📷'),
                    new ButtonBuilder()
                        .setCustomId('contest_view_stats')
                        .setLabel('Estadísticas Completas')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('📊'),
                    new ButtonBuilder()
                        .setLabel('Ir al Canal')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://discord.com/channels/${interaction.guild.id}/${canal.id}`)
                );

            // Enviar anuncio público en el canal del concurso
            await canal.send({
                components: [winnersContainer, actionRow],
                flags: MessageFlags.IsComponentsV2
            });

            // Respuesta al administrador
            const adminContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        '# ✅ Concurso Finalizado\n\n' +
                        `El concurso en ${canal} ha sido finalizado exitosamente.\n\n` +
                        `**Ganadores anunciados:** ${winners.length}\n` +
                        `**Total de votos:** ${result.winners?.reduce((sum, w) => sum + w.votes, 0) || 0}\n\n` +
                        'Los ganadores han sido anunciados en el canal del concurso.'
                    )
                );

            await interaction.editReply({
                components: [adminContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en contest-end:', error);
            return interaction.editReply({
                content: '❌ Ocurrió un error al finalizar el concurso.',
                flags: 64
            });
        }
    }
}