import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
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

export default class TicketCategoryCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName("ticket-category")
                .setDescription("Gestiona categorías de tickets")
            
                .addSubcommand(sub =>
                    sub.setName("add")
                        .setDescription("Añadir categoría")
                        .addStringOption(opt =>
                            opt.setName("nombre")
                                .setDescription("Nombre visible")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("valor")
                                .setDescription("Identificador interno (ej: soporte)")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Descripción corta")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("emoji")
                                .setDescription("Emoji (ej: ❓ o <:custom:123>)")
                                .setRequired(true))
                        .addIntegerOption(opt =>
                            opt.setName("limite")
                                .setDescription("Máx. tickets activos por usuario")
                                .setRequired(false))
                )
                
                // Subcomando para eliminar categoría
                .addSubcommand(sub =>
                    sub.setName("remove")
                        .setDescription("Eliminar categoría")
                        .addStringOption(opt =>
                            opt.setName("valor")
                                .setDescription("Identificador de la categoría")
                                .setRequired(true))
                )
                
                // Subcomando para listar categorías
                .addSubcommand(sub =>
                    sub.setName("list")
                        .setDescription("Lista todas las categorías"))
                
                // Subcomando para editar categoría
                .addSubcommand(sub =>
                    sub.setName("edit")
                        .setDescription("Editar categoría existente")
                        .addStringOption(opt =>
                            opt.setName("valor")
                                .setDescription("Identificador de la categoría")
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName("nombre")
                                .setDescription("Nuevo nombre")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("descripcion")
                                .setDescription("Nueva descripción")
                                .setRequired(false))
                        .addStringOption(opt =>
                            opt.setName("emoji")
                                .setDescription("Nuevo emoji")
                                .setRequired(false))
                        .addIntegerOption(opt =>
                            opt.setName("limite")
                                .setDescription("Nuevo límite de tickets")
                                .setRequired(false))
                )
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
            cooldown: 5,
            category: "moderación"
        });
    }

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config || !config.panels || config.panels.length === 0) {
            return interaction.reply({
                content: "❌ No hay paneles configurados. Primero crea uno con `/ticket-panel`.",
                flags: 64
            });
        }

        const panelIndex = 0;
        const panel = config.panels[panelIndex];

        if (!panel.categories) panel.categories = [];

        if (subcommand === "add") {
            await this.addCategory(interaction, panel, config);
        } else if (subcommand === "remove") {
            await this.removeCategory(interaction, panel, config);
        } else if (subcommand === "list") {
            await this.listCategories(interaction, panel);
        } else if (subcommand === "edit") {
            await this.editCategory(interaction, panel, config);
        }
    }

    async addCategory(interaction, panel, config) {
        await interaction.deferReply({ flags: 64 });

        const emoji = interaction.options.getString("emoji");
        if (!isValidEmoji(emoji)) {
            return interaction.editReply({
                content: "❌ El emoji proporcionado no es válido. Usa un emoji unicode o personalizado válido."
            });
        }

        const newCat = {
            name: interaction.options.getString("nombre"),
            value: interaction.options.getString("valor"),
            description: interaction.options.getString("descripcion"),
            emoji: emoji,
            limit: interaction.options.getInteger("limite") || 1
        };

        if (panel.categories.some(c => c.value === newCat.value)) {
            return interaction.editReply({
                content: "❌ Ya existe una categoría con este valor."
            });
        }

        panel.categories.push(newCat);
        await config.save();

        try {
            const channel = interaction.guild.channels.cache.get(panel.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(panel.messageId);
                const updatedMenu = new StringSelectMenuBuilder()
                    .setCustomId(`open_ticket_${panel.panelId}`)
                    .setPlaceholder("Selecciona una categoría")
                    .addOptions(panel.categories.map(cat => ({
                        label: cat.name.substring(0, 100),
                        value: cat.value,
                        description: cat.description?.substring(0, 100) || "Sin descripción",
                        emoji: cat.emoji
                    })));

                await msg.edit({
                    components: [new ActionRowBuilder().addComponents(updatedMenu)]
                });
            }
        } catch (error) {
            console.error("Error actualizando panel:", error);
        }

        return interaction.editReply({
            content: `✅ Categoría **${newCat.name}** añadida correctamente.`
        });
    }

    async removeCategory(interaction, panel, config) {
        await interaction.deferReply({ flags: 64 });

        const value = interaction.options.getString("valor");
        const categoryIndex = panel.categories.findIndex(c => c.value === value);

        if (categoryIndex === -1) {
            return interaction.editReply({
                content: `❌ No se encontró la categoría con valor \`${value}\`.`
            });
        }

        const removedCategory = panel.categories[categoryIndex];
        panel.categories.splice(categoryIndex, 1);
        await config.save();

        try {
            const channel = interaction.guild.channels.cache.get(panel.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(panel.messageId);
                const updatedMenu = new StringSelectMenuBuilder()
                    .setCustomId(`open_ticket_${panel.panelId}`)
                    .setPlaceholder("Selecciona una categoría")
                    .addOptions(panel.categories.map(cat => ({
                        label: cat.name.substring(0, 100),
                        value: cat.value,
                        description: cat.description?.substring(0, 100) || "Sin descripción",
                        emoji: cat.emoji
                    })));

                await msg.edit({
                    components: [new ActionRowBuilder().addComponents(updatedMenu)]
                });
            }
        } catch (error) {
            console.error("Error actualizando panel:", error);
        }

        return interaction.editReply({
            content: `🗑️ Categoría **${removedCategory.name}** eliminada.`
        });
    }

    async listCategories(interaction, panel) {
        if (!panel.categories || panel.categories.length === 0) {
            return interaction.reply({ content: "❌ No hay categorías configuradas en este panel.", flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle("📂 Categorías de tickets")
            .setColor("#00bfff")
            .setDescription(panel.categories.map(c =>
                `${c.emoji || "📌"} **${c.name}** (\`${c.value}\`)\n${c.description} | Límite: ${c.limit || 1}`
            ).join("\n\n"));

        return interaction.reply({ embeds: [embed], flags: 64 });
    }

    async editCategory(interaction, panel, config) {
        await interaction.deferReply({ flags: 64 });

        const value = interaction.options.getString("valor");
        const category = panel.categories.find(c => c.value === value);

        if (!category) {
            return interaction.editReply({ content: "❌ No se encontró esa categoría." });
        }

        const newEmoji = interaction.options.getString("emoji");
        if (newEmoji && !isValidEmoji(newEmoji)) {
            return interaction.editReply({
                content: "❌ El emoji proporcionado no es válido. Usa un emoji unicode o personalizado válido."
            });
        }

        category.name = interaction.options.getString("nombre") || category.name;
        category.description = interaction.options.getString("descripcion") || category.description;
        category.emoji = newEmoji || category.emoji;
        category.limit = interaction.options.getInteger("limite") || category.limit;

        await config.save();

        try {
            const channel = interaction.guild.channels.cache.get(panel.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(panel.messageId);
                const updatedMenu = new StringSelectMenuBuilder()
                    .setCustomId(`open_ticket_${panel.panelId}`)
                    .setPlaceholder("Selecciona una categoría")
                    .addOptions(panel.categories.map(cat => ({
                        label: cat.name.substring(0, 100),
                        value: cat.value,
                        description: cat.description?.substring(0, 100) || "Sin descripción",
                        emoji: cat.emoji
                    })));

                await msg.edit({
                    components: [new ActionRowBuilder().addComponents(updatedMenu)]
                });
            }
        } catch (error) {
            console.error("Error actualizando panel:", error);
        }

        return interaction.editReply({
            content: `✏️ Categoría **${category.name}** actualizada correctamente.`
        });
    }
}