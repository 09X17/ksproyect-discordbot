import {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags, PermissionFlagsBits
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ContestInfoCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-info')
                .setDescription('Muestra información sobre cómo participar en los concursos'),

            cooldown: 5,
            category: 'contest',
            botPermissions: [PermissionFlagsBits.SendMessages]
        });
    }

    async execute(client, interaction) {
        try {
            const contestManager = client.contestManager;
            const contestChannels = await contestManager.getContestChannel(interaction.guild.id);

            if (!contestChannels || contestChannels.length === 0) {
                return interaction.reply({
                    content: 'ℹ️ No hay concursos activos en este servidor.',
                    flags: 64
                });
            }

            // Filtrar canales activos
            const activeContests = Array.isArray(contestChannels) 
                ? contestChannels.filter(c => c.isActive)
                : [contestChannels].filter(c => c.isActive);

            if (activeContests.length === 0) {
                return interaction.reply({
                    content: 'ℹ️ No hay concursos activos en este momento.',
                    flags: 64
                });
            }

            // Crear contenedor informativo con Components V2
            const infoContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        '# 🎉 Concurso de Fotografía\n\n' +
                        '## Cómo Participar\n\n' +
                        '1. **Envía una imagen** en el canal del concurso\n' +
                        '2. **Añade una descripción** (opcional)\n' +
                        '3. **¡Listo!** El bot creará tu entrada interactiva\n\n' +
                        '## Canales de Concurso Activos\n\n' +
                        activeContests.map(contest => 
                            `### ${contest.channelId ? `<#${contest.channelId}>` : 'Canal desconocido'}\n` +
                            `• **Tiempo mínimo:** ${contest.minTimeInServer} días en el servidor\n` +
                            `• **Máx. entradas:** ${contest.maxEntriesPerUser} por usuario\n` +
                            `• **Votación:** ${contest.votingEnabled ? 'Activada ✅' : 'Desactivada ❌'}\n` +
                            `• **Entradas:** ${contest.stats?.totalEntries || 0}\n` +
                            `────────────────`
                        ).join('\n\n') +
                        '\n\n## 🗳️ Cómo Votar\n' +
                        '1. Ve a una entrada del concurso\n' +
                        '2. Usa los botones para seleccionar un emoji\n' +
                        '3. ¡Tu voto será registrado automáticamente!\n\n' +
                        '**Nota:** Solo usuarios con el tiempo mínimo en el servidor pueden votar.'
                    )
                );

            await interaction.reply({
                components: [infoContainer],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en contest-info:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al obtener la información.',
                flags: 64
            });
        }
    }
}