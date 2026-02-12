import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder
} from 'discord.js';
import EmbedMessage from '../../../Embed/Models/EmbedMessage.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class EmbedCommand extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('embed')
                .setDescription('Sistema avanzado de embeds')

                // CREATE
                .addSubcommand(sub =>
                    sub
                        .setName('create')
                        .setDescription('Crear un nuevo template')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre del template')
                                .setRequired(true)
                        )
                )

                // LIST
                .addSubcommand(sub =>
                    sub
                        .setName('list')
                        .setDescription('Listar templates del servidor')
                )

                // DELETE
                .addSubcommand(sub =>
                    sub
                        .setName('delete')
                        .setDescription('Eliminar un template')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre del template')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                // SEND
                .addSubcommand(sub =>
                    sub
                        .setName('send')
                        .setDescription('Enviar un template')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre del template')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addChannelOption(opt =>
                            opt
                                .setName('canal')
                                .setDescription('Canal destino')
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement
                                )
                                .setRequired(true)
                        )
                )

                // EDIT
                .addSubcommand(sub =>
                    sub
                        .setName('edit')
                        .setDescription('Abrir editor del template')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre del template')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('update')
                        .setDescription('Actualizar todos los embeds enviados de esta plantilla')
                        .addStringOption(opt =>
                            opt
                                .setName('nombre')
                                .setDescription('Nombre del template')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                ),

            cooldown: 5,
            category: 'embed',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    // =====================================================
    // AUTOCOMPLETE
    // =====================================================

    async autocomplete(client, interaction) {

        const focused = interaction.options.getFocused();
        const guildId = interaction.guild.id;

        const templates =
            await client.embedManager.getGuildTemplates(guildId);

        const filtered = templates
            .filter(t =>
                t.name.toLowerCase().includes(focused.toLowerCase())
            )
            .slice(0, 25);

        await interaction.respond(
            filtered.map(t => ({
                name: t.name,
                value: t.name
            }))
        );
    }

    // =====================================================
    // EXECUTE
    // =====================================================

    async execute(client, interaction) {

        await interaction.deferReply({ flags: 64 });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const embedManager = client.embedManager;

        try {

            // =============================
            // CREATE
            // =============================

            if (sub === 'create') {

                const name = interaction.options.getString('nombre');

                const exists =
                    (await embedManager.getGuildTemplates(guildId))
                        .find(t => t.name === name);

                if (exists)
                    return interaction.editReply(
                        '⚠️ Ya existe un template con ese nombre.'
                    );

                await embedManager.createTemplate(
                    guildId,
                    name,
                    interaction.user.id
                );

                return interaction.editReply(
                    `✅ Template **${name}** creado correctamente.`
                );
            }

            // =============================
            // LIST
            // =============================

            if (sub === 'list') {

                const templates =
                    await embedManager.getGuildTemplates(guildId);

                if (!templates.length)
                    return interaction.editReply(
                        '⚠️ No hay templates creados.'
                    );

                const embed = new EmbedBuilder()
                    .setTitle('📦 Templates del Servidor')
                    .setColor(0x5865F2)
                    .setDescription(
                        templates
                            .map(t =>
                                `• **${t.name}**\nEnvíos: ${t.stats?.sends || 0} | Clicks: ${t.stats?.clicks || 0}`
                            )
                            .join('\n\n')
                    );

                return interaction.editReply({
                    embeds: [embed]
                });
            }

            // =============================
            // DELETE
            // =============================

            if (sub === 'delete') {

                const name = interaction.options.getString('nombre');

                const templates =
                    await embedManager.getGuildTemplates(guildId);

                const template =
                    templates.find(t => t.name === name);

                if (!template)
                    return interaction.editReply(
                        '⚠️ Template no encontrado.'
                    );

                await embedManager.deleteTemplate(
                    guildId,
                    template._id
                );

                return interaction.editReply(
                    `🗑 Template **${name}** eliminado.`
                );
            }

            // =============================
            // SEND
            // =============================

            if (sub === 'send') {

                const name =
                    interaction.options.getString('nombre');

                const canal =
                    interaction.options.getChannel('canal');

                const templates =
                    await embedManager.getGuildTemplates(guildId);

                const template =
                    templates.find(t => t.name === name);

                if (!template)
                    return interaction.editReply(
                        '⚠️ Template no encontrado.'
                    );

                await embedManager.sendById(
                    guildId,
                    template._id,
                    canal,
                    {
                        interaction,
                        user: interaction.user,
                        member: interaction.member,
                        guild: interaction.guild
                    }
                );

                return interaction.editReply(
                    `✅ Template enviado en ${canal}.`
                );
            }

            // =============================
            // EDIT
            // =============================

            if (sub === 'edit') {

                const name =
                    interaction.options.getString('nombre');

                const templates =
                    await embedManager.getGuildTemplates(guildId);

                const template =
                    templates.find(t => t.name === name);

                if (!template)
                    return interaction.editReply(
                        '⚠️ Template no encontrado.'
                    );

                return client.embedEditorManager
                    .startSession(interaction, template);
            }


            if (sub === 'update') {

                const name = interaction.options.getString('nombre');

                const templates =
                    await embedManager.getGuildTemplates(guildId);

                const template =
                    templates.find(t => t.name === name);

                if (!template)
                    return interaction.editReply('⚠️ Template no encontrado.');

                const messages = await EmbedMessage.find({
                    guildId,
                    templateId: template._id
                });

                let updated = 0;

                for (const ref of messages) {

                    try {
                        const channel = await client.channels.fetch(ref.channelId);
                        const msg = await channel.messages.fetch(ref.messageId);

                        const { embed, components } =
                            embedManager.renderer.render(template);

                        await msg.edit({
                            embeds: [embed],
                            components
                        });

                        updated++;

                    } catch (err) {
                        // mensaje borrado o sin permisos
                    }
                }

                return interaction.editReply(
                    `✅ ${updated} mensajes actualizados.`
                );
            }


        } catch (error) {

            console.error('Error en comando embed:', error);

            return interaction.editReply(
                error.message || '❌ Error ejecutando comando.'
            );
        }
    }
}
