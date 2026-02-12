import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class ResetLevelSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('reset-level')
                .setDescription('Reinicia el progreso de un usuario (Solo administradores)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a reiniciar')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('opciones')
                        .setDescription('Opciones de reinicio')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Solo nivel y XP', value: 'level_only' },
                            { name: 'Todo (Nivel, XP, Perks, Items)', value: 'all' },
                            { name: 'Solo perks', value: 'perks_only' },
                            { name: 'Solo items', value: 'items_only' }
                        )
                ),
            cooldown: 5,
            category: 'administration',
            userPermissions: [
                PermissionFlagsBits.ManageGuild
            ],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });

        try {
            const target = interaction.options.getUser('usuario');
            const option = interaction.options.getString('opciones') || 'level_only';

            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ No puedes reiniciar bots.',
                    flags: 64
                });
            }

            // Crear botones de confirmación
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reset_confirm_${target.id}_${option}`)
                        .setLabel('✅ Confirmar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reset_cancel_${target.id}`)
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

            // Opciones de reinicio
            const resetOptions = this.getResetOptions(option);
            const optionDescriptions = this.getOptionDescriptions(resetOptions);

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('⚠️ Confirmar Reinicio de Progreso')
                .setDescription(`Estás a punto de reiniciar el progreso de **${target.tag}**`)
                .addFields(
                    {
                        name: '🎯 Opciones Seleccionadas',
                        value: optionDescriptions,
                        inline: false
                    },
                    {
                        name: '📝 Información',
                        value: [
                            `**Usuario:** ${target.tag} (${target.id})`,
                            `**Administrador:** ${interaction.user.tag}`,
                            `**Servidor:** ${interaction.guild.name}`
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ text: 'Esta acción no se puede deshacer' })
                .setTimestamp();

            await interaction.editReply({
                content: '**⚠️ ATENCIÓN: Esta acción es permanente y no se puede deshacer**',
                embeds: [embed],
                components: [row],
                flags: 64
            });

            // Crear collector para los botones
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 30000
            });

            collector.on('collect', async (i) => {
                try {
                    await i.deferUpdate();

                    if (i.customId.startsWith('reset_confirm')) {
                        // Ejecutar reinicio
                        const guildId = interaction.guild.id;
                        const result = await client.levelManager.resetUser(target.id, guildId, resetOptions);

                        // Embed de confirmación
                        const confirmEmbed = new EmbedBuilder()
                            .setColor('#2ECC71')
                            .setTitle('✅ Progreso Reiniciado Exitosamente')
                            .setDescription(`Progreso de **${target.tag}** ha sido reiniciado`)
                            .addFields(
                                {
                                    name: '📊 Resultado',
                                    value: [
                                        `**Nivel:** ${result.resetOptions.level ? 'Reiniciado a 1' : 'Mantenido'}`,
                                        `**XP:** ${result.resetOptions.xp ? 'Reiniciado a 0' : 'Mantenido'}`,
                                        `**Perks:** ${result.resetOptions.perks ? 'Eliminados' : 'Mantenidos'}`,
                                        `**Items:** ${result.resetOptions.items ? 'Eliminados' : 'Mantenidos'}`
                                    ].join('\n'),
                                    inline: false
                                }
                            )
                            .setTimestamp();

                        await i.editReply({
                            content: null,
                            embeds: [confirmEmbed],
                            components: []
                        });

                    } else if (i.customId.startsWith('reset_cancel')) {
                        // Cancelar
                        const cancelEmbed = new EmbedBuilder()
                            .setColor('#95A5A6')
                            .setTitle('❌ Reinicio Cancelado')
                            .setDescription('El reinicio ha sido cancelado.')
                            .setTimestamp();

                        await i.editReply({
                            content: null,
                            embeds: [cancelEmbed],
                            components: []
                        });
                    }

                    collector.stop();

                } catch (error) {
                    client.logger.error('Error en collector de reset-level:', error);
                    await i.editReply({
                        content: '❌ Ocurrió un error durante la confirmación.',
                        embeds: [],
                        components: []
                    });
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor('#95A5A6')
                        .setTitle('⏰ Tiempo Agotado')
                        .setDescription('El tiempo para confirmar ha expirado.')
                        .setTimestamp();

                    await interaction.editReply({
                        content: null,
                        embeds: [timeoutEmbed],
                        components: []
                    });
                }
            });

        } catch (error) {
            client.logger.error('Error en comando reset-level:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al procesar el reinicio.',
                flags: 64
            });
        }
    }

    getResetOptions(option) {
        const options = {
            level_only: { xp: true, level: true, perks: false, items: false },
            all: { xp: true, level: true, perks: true, items: true },
            perks_only: { xp: false, level: false, perks: true, items: false },
            items_only: { xp: false, level: false, perks: false, items: true }
        };

        return options[option] || options.level_only;
    }

    getOptionDescriptions(options) {
        const descriptions = [];

        if (options.xp) descriptions.push('• Reiniciar XP a 0');
        if (options.level) descriptions.push('• Reiniciar nivel a 1');
        if (options.perks) descriptions.push('• Eliminar todos los perks');
        if (options.items) descriptions.push('• Eliminar todos los items comprados');

        return descriptions.join('\n') || 'No se realizarán cambios';
    }
}