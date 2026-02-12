import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ContestSetupCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('contest-setup')
                .setDescription('Configura un canal como concurso de fotografía')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addChannelOption(option =>
                    option
                        .setName('canal')
                        .setDescription('Canal donde se realizará el concurso')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addIntegerOption(option =>
                    option
                        .setName('dias-minimos')
                        .setDescription('Días mínimo en el servidor (default: 7)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(365)
                )
                .addIntegerOption(option =>
                    option
                        .setName('max-entradas')
                        .setDescription('Máximo de entradas por usuario (default: 3)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
                .addStringOption(option =>
                    option
                        .setName('emoji-votacion')
                        .setDescription('Emoji principal para votar (default: ⭐)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('votos-multiples')
                        .setDescription('¿Permitir múltiples votos por usuario? (default: false)')
                        .setRequired(false)
                ),

            cooldown: 10,
            category: 'contest',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AddReactions
            ]
        });
    }

    async execute(client, interaction) {
        try {

            const canal = interaction.options.getChannel('canal');
            const diasMinimos = interaction.options.getInteger('dias-minimos') || 7;
            const maxEntradas = interaction.options.getInteger('max-entradas') || 3;
            const emojiVotacion = interaction.options.getString('emoji-votacion') || '⭐';
            const votosMultiples = interaction.options.getBoolean('votos-multiples') || false;

            if (!canal || !canal.isTextBased()) {
                return interaction.editReply({
                    content: '❌ El canal seleccionado no es válido.',
                    flags: 64
                });
            }

            const botPermissions = canal.permissionsFor(client.user);
            if (!botPermissions.has(PermissionFlagsBits.SendMessages) ||
                !botPermissions.has(PermissionFlagsBits.ManageMessages) ||
                !botPermissions.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply({
                    content: `❌ Necesito permisos de **Enviar Mensajes**, **Gestionar Mensajes** y **Insertar Enlaces** en ${canal}.`,
                    flags: 64
                });
            }

            const contestManager = client.contestManager;
            await contestManager.setupContestWithComponents(
                interaction,
                canal.id,
                {
                    minTimeInServer: diasMinimos,
                    maxEntriesPerUser: maxEntradas,
                    voteEmoji: emojiVotacion,
                    allowMultipleVotes: votosMultiples
                }
            );

        } catch (error) {
            console.error('Error en contest-setup:', error);
            return interaction.editReply({
                content: '❌ Ocurrió un error al configurar el concurso.',
                flags: 64
            });
        }
    }
}