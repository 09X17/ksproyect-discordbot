import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js";
import SlashCommand from "../../../Structures/SlashCommand.js";
import GuildConfig from "../../../Tickets/Models/GuildConfig.js";


function isValidEmoji(emoji) {
    if (!emoji) return false;

    const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
    if (emojiRegex.test(emoji)) return true;
    
    const customEmojiRegex = /^<a?:[a-zA-Z0-9_]+:\d+>$/;
    if (customEmojiRegex.test(emoji)) return true;
    
    return false;
}

function isValidHexColor(color) {
    if (!color) return false;
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexRegex.test(color);
}

function isValidUrl(url) {
    if (!url) return true; 
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}


export default class TicketPanelCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName("ticket-panel")
                .setDescription("Crear o editar el panel de tickets")
                .addRoleOption(opt =>
                    opt.setName("rol")
                        .setDescription("Rol de soporte para tickets")
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName("nombre")
                        .setDescription("Nombre identificativo del panel")
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName("titulo")
                        .setDescription("Título del embed del panel")
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName("descripcion")
                        .setDescription("Escribe 'modal' para editar con saltos de línea")
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName("color")
                        .setDescription("Color HEX del embed (ejemplo: #0099ff)")
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName("imagen")
                        .setDescription("URL de la imagen principal del embed")
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName("thumbnail")
                        .setDescription("URL del thumbnail del embed")
                        .setRequired(false))
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            cooldown: 5,
            category: "ticket"
        });
    }

    async execute(client, interaction) {
        try {
            const options = this.extractOptions(interaction);
            
            const validation = this.validateOptions(options);
            if (!validation.valid) {
                return interaction.reply({
                    content: `❌ ${validation.error}`,
                    ephemeral: true
                });
            }

            if (options.description.toLowerCase() === "modal") {
                await this.handleModalInput(client, interaction, options);
            } else {
                await interaction.deferReply({ ephemeral: true });
                await this.createOrUpdatePanel(client, interaction, options);
            }
        } catch (error) {
            client.logger.error("Error en comando ticket-panel:", error);
            
            const errorMessage = "❌ Ocurrió un error al procesar el comando. Por favor, intenta nuevamente.";
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    extractOptions(interaction) {
        return {
            supportRole: interaction.options.getRole("rol"),
            panelName: interaction.options.getString("nombre") || "Panel Principal",
            title: interaction.options.getString("titulo") || "🎫 Sistema de Tickets",
            description: interaction.options.getString("descripcion") || "Selecciona una opción para abrir un ticket.",
            color: interaction.options.getString("color") || "#0099ff",
            image: interaction.options.getString("imagen"),
            thumbnail: interaction.options.getString("thumbnail")
        };
    }

    validateOptions(options) {
        // Validar color HEX
        if (options.color && !isValidHexColor(options.color)) {
            return {
                valid: false,
                error: "El color debe estar en formato HEX válido (ejemplo: #0099ff)"
            };
        }

        // Validar URL de imagen
        if (options.image && !isValidUrl(options.image)) {
            return {
                valid: false,
                error: "La URL de la imagen no es válida"
            };
        }

        // Validar URL de thumbnail
        if (options.thumbnail && !isValidUrl(options.thumbnail)) {
            return {
                valid: false,
                error: "La URL del thumbnail no es válida"
            };
        }

        // Validar longitud del título
        if (options.title.length > 256) {
            return {
                valid: false,
                error: "El título no puede exceder los 256 caracteres"
            };
        }

        // Validar longitud de la descripción (si no es "modal")
        if (options.description.toLowerCase() !== "modal" && options.description.length > 4096) {
            return {
                valid: false,
                error: "La descripción no puede exceder los 4096 caracteres"
            };
        }

        return { valid: true };
    }

    /**
     * Maneja la entrada de descripción mediante modal
     * @param {Client} client - Cliente de Discord
     * @param {CommandInteraction} interaction - Interacción del comando
     * @param {Object} options - Opciones del comando
     */
    async handleModalInput(client, interaction, options) {
        const modalId = `panel_desc_modal_${Date.now()}`;
        const modal = new ModalBuilder()
            .setCustomId(modalId)
            .setTitle("Descripción del Panel");

        const descriptionInput = new TextInputBuilder()
            .setCustomId("panel_description")
            .setLabel("Descripción (soporta saltos de línea)")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4096)
            .setPlaceholder("Escribe la descripción del panel aquí...")
            .setValue("Selecciona una opción para abrir un ticket.");

        modal.addComponents(
            new ActionRowBuilder().addComponents(descriptionInput)
        );

        await interaction.showModal(modal);

        try {
            // Esperar respuesta del modal (5 minutos)
            const modalResponse = await interaction.awaitModalSubmit({
                time: 300000,
                filter: i => i.customId === modalId && i.user.id === interaction.user.id
            });

            options.description = modalResponse.fields.getTextInputValue("panel_description");
            await modalResponse.deferReply({ ephemeral: true });
            await this.createOrUpdatePanel(client, modalResponse, options);
            
        } catch (error) {
            client.logger.error("Error procesando modal:", error);
            
            // Solo responder si la interacción no ha sido respondida
            if (!interaction.replied && !interaction.deferred) {
                await interaction.followUp({
                    content: "⏱️ Tiempo de espera agotado. Por favor, intenta nuevamente.",
                    ephemeral: true
                }).catch(() => {});
            }
        }
    }

    /**
     * Crea o actualiza un panel de tickets
     * @param {Client} client - Cliente de Discord
     * @param {CommandInteraction} interaction - Interacción del comando
     * @param {Object} options - Opciones del panel
     */
    async createOrUpdatePanel(client, interaction, options) {
        try {
            // Obtener o crear configuración del servidor
            let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (!config) {
                config = new GuildConfig({ guildId: interaction.guild.id });
            }

            // Configurar el servidor si es necesario
            const setupResult = await client.ticketManager.setupGuild(
                interaction.guild, 
                options.supportRole.id
            );

            if (!setupResult.success) {
                return interaction.editReply({
                    content: `❌ Error configurando el servidor: ${setupResult.error}`
                });
            }

            // Actualizar configuración con el rol de soporte
            config = await client.ticketManager.getGuildConfig(interaction.guild.id);
            config.supportRoleId = options.supportRole.id;
            await config.save();

            // Crear el embed del panel
            const embed = this.createPanelEmbed(options);

            // Obtener o crear categorías
            const categories = this.getOrCreateCategories(config);

            // Buscar panel existente en este canal
            const existingPanel = config.panels?.find(
                p => p.channelId === interaction.channel.id
            );

            if (existingPanel) {
                // Actualizar panel existente
                await this.updateExistingPanel(
                    interaction,
                    config,
                    existingPanel,
                    embed,
                    options
                );
            } else {
                // Crear nuevo panel
                await this.createNewPanel(
                    interaction,
                    config,
                    embed,
                    categories,
                    options
                );
            }

        } catch (error) {
            client.logger.error("Error en createOrUpdatePanel:", error);
            throw error;
        }
    }

    /**
     * Crea el embed del panel
     * @param {Object} options - Opciones del panel
     * @returns {EmbedBuilder} Embed creado
     */
    createPanelEmbed(options) {
        const embed = new EmbedBuilder()
            .setTitle(options.title)
            .setDescription(options.description)
            .setColor(options.color)
            .setFooter({ text: "Soporte" });

        if (options.image) {
            embed.setImage(options.image);
        }

        if (options.thumbnail) {
            embed.setThumbnail(options.thumbnail);
        }

        return embed;
    }

    /**
     * Obtiene las categorías existentes o crea las predeterminadas
     * @param {Object} config - Configuración del servidor
     * @returns {Array} Array de categorías
     */
    getOrCreateCategories(config) {
        let categories = [];

        if (config.panels && config.panels.length > 0) {
            categories = config.panels.flatMap(p => p.categories || []);
        }

        // Si no hay categorías, crear las predeterminadas
        if (categories.length === 0) {
            categories = [
                {
                    name: "Soporte General",
                    value: "general",
                    description: "Ayuda y consultas generales",
                    emoji: "❓",
                    limit: 1
                }
            ];
        }

        return categories;
    }

    /**
     * Crea el menú de selección de categorías
     * @param {string} panelId - ID del panel
     * @param {Array} categories - Categorías disponibles
     * @returns {StringSelectMenuBuilder} Menú creado
     */
    createCategoryMenu(panelId, categories) {
        return new StringSelectMenuBuilder()
            .setCustomId(`open_ticket_${panelId}`)
            .setPlaceholder("Selecciona una categoría")
            .addOptions(
                categories.map(cat => ({
                    label: cat.name.substring(0, 100),
                    value: cat.value,
                    description: cat.description?.substring(0, 100) || "Sin descripción",
                    emoji: isValidEmoji(cat.emoji) ? cat.emoji : "📋"
                }))
            );
    }

    /**
     * Actualiza un panel existente
     * @param {CommandInteraction} interaction - Interacción del comando
     * @param {Object} config - Configuración del servidor
     * @param {Object} panel - Panel existente
     * @param {EmbedBuilder} embed - Embed del panel
     * @param {Object} options - Opciones del panel
     */
    async updateExistingPanel(interaction, config, panel, embed, options) {
        try {
            // Generar panelId si no existe
            if (!panel.panelId) {
                panel.panelId = this.generatePanelId();
            }

            // Crear menú con las categorías del panel
            const menu = this.createCategoryMenu(panel.panelId, panel.categories);

            // Intentar actualizar el mensaje existente
            const message = await interaction.channel.messages.fetch(panel.messageId);
            await message.edit({
                embeds: [embed],
                components: [new ActionRowBuilder().addComponents(menu)]
            });

            // Actualizar información del panel
            panel.name = options.panelName;
            panel.embed = {
                title: options.title,
                description: options.description,
                color: options.color,
                image: options.image,
                thumbnail: options.thumbnail,
                footer: "Soporte"
            };

            await config.save();

            return interaction.editReply({
                content: "✅ Panel actualizado correctamente."
            });

        } catch (error) {
            // Si el mensaje fue eliminado, crear uno nuevo
            if (error.code === 10008) { // Unknown Message
                // Remover el panel antiguo
                config.panels = config.panels.filter(p => p.panelId !== panel.panelId);
                await config.save();

                // Crear nuevo panel
                const categories = this.getOrCreateCategories(config);
                await this.createNewPanel(interaction, config, embed, categories, options);
            } else {
                throw error;
            }
        }
    }

    /**
     * Crea un nuevo panel
     * @param {CommandInteraction} interaction - Interacción del comando
     * @param {Object} config - Configuración del servidor
     * @param {EmbedBuilder} embed - Embed del panel
     * @param {Array} categories - Categorías del panel
     * @param {Object} options - Opciones del panel
     */
    async createNewPanel(interaction, config, embed, categories, options) {
        const panelId = this.generatePanelId();

        // Crear menú de selección
        const menu = this.createCategoryMenu(panelId, categories);

        // Enviar mensaje del panel
        const panelMessage = await interaction.channel.send({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(menu)]
        });

        // Asegurar que el array de paneles existe
        if (!config.panels) {
            config.panels = [];
        }

        // Agregar nuevo panel a la configuración
        config.panels.push({
            panelId: panelId,
            name: options.panelName,
            channelId: interaction.channel.id,
            messageId: panelMessage.id,
            embed: {
                title: options.title,
                description: options.description,
                color: options.color,
                image: options.image,
                thumbnail: options.thumbnail,
                footer: "Soporte"
            },
            categories: categories,
            ticketMessage: {
                title: "Ticket {ticketId}",
                description: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}",
                color: "#0099ff",
                footer: "Creado el {date}",
                image: null,
                thumbnail: null
            }
        });

        await config.save();

        return interaction.editReply({
            content: "✅ Panel creado correctamente."
        });
    }

    /**
     * Genera un ID único para el panel
     * @returns {string} ID del panel
     */
    generatePanelId() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }
}