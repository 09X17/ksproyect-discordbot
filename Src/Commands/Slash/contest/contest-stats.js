import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ContestStatsCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-stats')
                .setDescription('Muestra estadísticas de los concursos')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal específico (opcional)')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                ),

            cooldown: 5,
            category: 'contest',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [PermissionFlagsBits.SendMessages]
        });
    }

    async execute(client, interaction) {
        try {
            await interaction.deferReply({ flags: 64 });

            const canal = interaction.options.getChannel('canal');
            const contestManager = client.contestManager;

            const stats = await contestManager.getContestStats(
                interaction.guild.id,
                canal?.id
            );

            if (!stats || stats.length === 0) {
                return interaction.editReply({
                    content: 'ℹ️ No hay concursos configurados en este servidor.',
                    flags: 64
                });
            }

            // Crear contenedor con Components V2
            const statsContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        `# 📊 Estadísticas de Concursos\n\n` +
                        stats.map((s, index) => 
                            `## Concurso ${index + 1}\n` +
                            `**Canal:** ${s.channel}\n` +
                            `**Entradas:** ${s.entries}\n` +
                            `**Votos totales:** ${s.totalVotes}\n` +
                            `**Participantes únicos:** ${s.activeUsers}\n` +
                            `**Tiempo mínimo:** ${s.minTimeInServer} días\n` +
                            `**Votación:** ${s.votingEnabled ? '✅ Activada' : '❌ Desactivada'}\n` +
                            `────────────────`
                        ).join('\n\n')
                    )
                );

            await interaction.editReply({
                components: [statsContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en contest-stats:', error);
            return interaction.editReply({
                content: '❌ Ocurrió un error al obtener las estadísticas.',
                flags: 64
            });
        }
    }
}