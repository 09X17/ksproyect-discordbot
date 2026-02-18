import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from "discord.js";
import SlashCommand from "../../../Structures/SlashCommand.js";
import GuildConfig from "../../../Tickets/Models/GuildConfig.js";

export default class TicketMessageCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName("ticket-message")
                .setDescription("Configura mensajes personalizados")

                .addSubcommand(sub =>
                    sub.setName("ticket")
                        .setDescription("Configura el mensaje que se envía al crear un ticket")
                        .addStringOption(opt =>
                            opt.setName("panel")
                                .setDescription("ID del canal del panel (dejar vacío para usar el actual)")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("titulo")
                                .setDescription("Título (usa {ticketId}, {user}, {reason}, {category}, {date})")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Escribe 'modal' para editar con saltos de línea")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("color")
                                .setDescription("Color HEX (#0099ff)")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("footer")
                                .setDescription("Footer (usa {ticketId}, {user}, {reason}, {category}, {date})")
                                .setRequired(false))
                )

                // Subcomando para mensaje de categoría específica
                .addSubcommand(sub =>
                    sub.setName("categoria")
                        .setDescription("Configura el mensaje para una categoría específica")
                        .addStringOption(opt =>
                            opt.setName("categoria")
                                .setDescription("Valor de la categoría (ej: general, sorteos)")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("titulo")
                                .setDescription("Título (usa {ticketId}, {user}, {reason}, {category}, {date})")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Escribe 'modal' para editar con saltos de línea")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("color")
                                .setDescription("Color HEX (#0099ff)")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("footer")
                                .setDescription("Footer (usa {ticketId}, {user}, {reason}, {category}, {date})")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("imagen")
                                .setDescription("URL de la imagen para el ticket")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("thumbnail")
                                .setDescription("URL del thumbnail para el ticket")
                                .setRequired(false))
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            cooldown: 5,
            category: "moderación"
        });
    }

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "ticket") {
            await this.handleTicketMessage(client, interaction);
        } else if (subcommand === "categoria") {
            await this.handleCategoryMessage(client, interaction);
        }
    }

    async handleTicketMessage(client, interaction) {
        const panelChannelId = interaction.options.getString("panel") || interaction.channel.id;
        let description = interaction.options.getString("descripcion");

        // Buscar config
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.panels || config.panels.length === 0) {
            return interaction.reply({
                content: "❌ No hay paneles configurados. Primero crea uno con `/ticket-panel`.",
                flags: 64
            });
        }

        // Buscar panel por channelId
        let panel = config.panels.find(p => p.channelId === panelChannelId);
        if (!panel) {
            return interaction.reply({
                content: "❌ No se encontró un panel en este canal. Primero crea uno con `/ticket-panel`.",
                flags: 64
            });
        }

        // Si el usuario quiere usar un modal para la descripción
        if (description && description.toLowerCase() === "modal") {
            const modal = new ModalBuilder()
                .setCustomId(`ticket_msg_modal_${Date.now()}`)
                .setTitle("Descripción del Mensaje de Ticket");

            const descriptionInput = new TextInputBuilder()
                .setCustomId("ticket_description")
                .setLabel("Descripción (soporta saltos de línea)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue(panel.ticketMessage?.description || "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}");

            const firstActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

            // Esperar la respuesta del modal
            try {
                const modalResponse = await interaction.awaitModalSubmit({
                    time: 300000,
                    filter: i => i.customId === modal.data.custom_id
                });

                description = modalResponse.fields.getTextInputValue("ticket_description");
                await modalResponse.deferReply({ flags: 64 });
                await this.updateTicketMessage(modalResponse, panel, config, description);
            } catch (error) {
                console.error("Error con el modal:", error);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: "Tiempo de espera agotado o error al procesar el modal.",
                        flags: 64
                    });
                }
            }
        } else {
            await interaction.deferReply({ flags: 64 });
            await this.updateTicketMessage(interaction, panel, config, description);
        }
    }

    async updateTicketMessage(interaction, panel, config, description) {
        // Inicializar ticketMessage si no existe
        if (!panel.ticketMessage) {
            panel.ticketMessage = {
                title: "Ticket {ticketId}",
                description: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}",
                color: "#0099ff",
                footer: "Creado el {date}"
            };
        }

        // Actualizar con los nuevos valores
        const title = interaction.options.getString("titulo");
        const color = interaction.options.getString("color");
        const footer = interaction.options.getString("footer");

        if (title !== null) panel.ticketMessage.title = title;
        if (description !== null) panel.ticketMessage.description = description;
        if (color !== null) panel.ticketMessage.color = color;
        if (footer !== null) panel.ticketMessage.footer = footer;

        await config.save();

        // Mostrar vista previa
        const previewEmbed = new EmbedBuilder()
            .setTitle(panel.ticketMessage.title.replace(/{[^}]+}/g, "EJEMPLO"))
            .setDescription(panel.ticketMessage.description.replace(/{[^}]+}/g, "EJEMPLO"))
            .setColor(panel.ticketMessage.color)
            .setFooter({ text: panel.ticketMessage.footer.replace(/{[^}]+}/g, "EJEMPLO") });

        await interaction.editReply({
            content: "✅ Mensaje de ticket actualizado correctamente. Vista previa:",
            embeds: [previewEmbed]
        });
    }

    async handleCategoryMessage(client, interaction) {
        const categoryValue = interaction.options.getString("categoria");
        let description = interaction.options.getString("descripcion");

        // Buscar config
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.panels || config.panels.length === 0) {
            return interaction.reply({
                content: "❌ No hay paneles configurados. Primero crea uno con `/ticket-panel`.",
                flags: 64
            });
        }

        // Buscar la categoría en TODOS los paneles
        let targetCategory = null;
        let targetPanel = null;

        for (const panel of config.panels) {
            if (panel.categories) {
                const category = panel.categories.find(c => c.value === categoryValue);
                if (category) {
                    targetCategory = category;
                    targetPanel = panel;
                    break;
                }
            }
        }

        if (!targetCategory) {
            return interaction.reply({
                content: `❌ No se encontró la categoría con valor \`${categoryValue}\`.`,
                flags: 64
            });
        }

        // Si el usuario quiere usar un modal para la descripción
        if (description && description.toLowerCase() === "modal") {
            const modal = new ModalBuilder()
                .setCustomId(`category_msg_modal_${Date.now()}_${categoryValue}`)
                .setTitle(`Descripción para categoría ${targetCategory.name}`);

            const descriptionInput = new TextInputBuilder()
                .setCustomId("category_description")
                .setLabel("Descripción (soporta saltos de línea)")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setValue(targetCategory.ticketMessage?.description || "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}");

            const firstActionRow = new ActionRowBuilder().addComponents(descriptionInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

            // Esperar la respuesta del modal
            try {
                const modalResponse = await interaction.awaitModalSubmit({
                    time: 300000,
                    filter: i => i.customId === modal.data.custom_id
                });

                description = modalResponse.fields.getTextInputValue("category_description");
                await modalResponse.deferReply({ flags: 64 });
                await this.updateCategoryMessage(modalResponse, targetCategory, config, description);
            } catch (error) {
                console.error("Error con el modal:", error);
                if (!interaction.replied) {
                    await interaction.reply({
                        content: "Tiempo de espera agotado o error al procesar el modal.",
                        flags: 64
                    });
                }
            }
        } else {
            await interaction.deferReply({ flags: 64 });
            await this.updateCategoryMessage(interaction, targetCategory, config, description);
        }
    }

    async updateCategoryMessage(interaction, targetCategory, config, description) {
        // Inicializar ticketMessage si no existe
        if (!targetCategory.ticketMessage) {
            targetCategory.ticketMessage = {
                title: "Ticket {ticketId}",
                description: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}",
                color: "#0099ff",
                footer: "Creado el {date}",
                image: null,
                thumbnail: null
            };
        }

        // Preservar valores actuales de image y thumbnail
        let title, color, footer, image, thumbnail;

        if ("options" in interaction && interaction.options) {
            // Slash command normal
            title = interaction.options.getString("titulo");
            color = interaction.options.getString("color");
            footer = interaction.options.getString("footer");
            image = interaction.options.getString("imagen");
            thumbnail = interaction.options.getString("thumbnail");
        } else {
            // Modal - preservar los valores actuales de image y thumbnail
            title = targetCategory.ticketMessage.title;
            color = targetCategory.ticketMessage.color;
            footer = targetCategory.ticketMessage.footer;
            image = targetCategory.ticketMessage.image; // ← PRESERVAR valor actual
            thumbnail = targetCategory.ticketMessage.thumbnail; // ← PRESERVAR valor actual
        }

        // Actualizar solo los campos que tienen nuevos valores
        if (title !== null) targetCategory.ticketMessage.title = title;
        if (description !== null) targetCategory.ticketMessage.description = description;
        if (color !== null) targetCategory.ticketMessage.color = color;
        if (footer !== null) targetCategory.ticketMessage.footer = footer;

        // Manejar image y thumbnail - solo actualizar si se proporciona un nuevo valor
        if (image !== null && image !== undefined) {
            if (image === "") {
                // Si se pasa string vacío, establecer como null
                targetCategory.ticketMessage.image = null;
            } else if (this.isValidImageUrl(image)) {
                targetCategory.ticketMessage.image = image;
            } else {
                // Si no es una URL válida, mantener el valor actual
                console.log(`URL de imagen no válida: ${image}`);
            }
        }
        // Si image es null/undefined, NO actualizar (preservar valor actual)

        if (thumbnail !== null && thumbnail !== undefined) {
            if (thumbnail === "") {
                // Si se pasa string vacío, establecer como null
                targetCategory.ticketMessage.thumbnail = null;
            } else if (this.isValidImageUrl(thumbnail)) {
                targetCategory.ticketMessage.thumbnail = thumbnail;
            } else {
                // Si no es una URL válida, mantener el valor actual
                console.log(`URL de thumbnail no válida: ${thumbnail}`);
            }
        }
        // Si thumbnail es null/undefined, NO actualizar (preservar valor actual)

        await config.save();

        // Construir vista previa
        const previewEmbed = new EmbedBuilder()
            .setTitle(targetCategory.ticketMessage.title.replace(/{[^}]+}/g, "EJEMPLO"))
            .setDescription(targetCategory.ticketMessage.description.replace(/{[^}]+}/g, "EJEMPLO"))
            .setColor(targetCategory.ticketMessage.color)
            .setFooter({
                text: targetCategory.ticketMessage.footer.replace(/{[^}]+}/g, "EJEMPLO")
            });

        if (targetCategory.ticketMessage.image) {
            previewEmbed.setImage(targetCategory.ticketMessage.image);
        }
        if (targetCategory.ticketMessage.thumbnail) {
            previewEmbed.setThumbnail(targetCategory.ticketMessage.thumbnail);
        }

        await interaction.editReply({
            content: `✅ Mensaje para categoría **${targetCategory.name}** actualizado correctamente. Vista previa:`,
            embeds: [previewEmbed]
        });
    }

    // ✅ Añadir método de validación de URLs de imagen
    isValidImageUrl(url) {
        if (typeof url !== 'string') return false;

        try {
            new URL(url);
        } catch {
            return false;
        }

        // Extensiones de imagen comunes
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)(\?.*)?$/i;

        // Dominios comunes de imágenes
        const imageDomains = [
            'cdn.discordapp.com',
            'media.discordapp.net',
            'images-ext-1.discordapp.net',
            'images-ext-2.discordapp.net',
            'i.imgur.com',
            'imgur.com',
            'i.redd.it',
            'redd.it'
        ];

        const urlObj = new URL(url);

        return imageExtensions.test(urlObj.pathname) ||
            imageDomains.some(domain => urlObj.hostname.includes(domain));
    }

}