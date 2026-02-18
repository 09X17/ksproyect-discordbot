import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { toolsConfig, TOOL_RARITIES } from '../../../LevelSystem/Configs/toolsConfig.js';

export default class ToolsSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('tools')
                .setDescription('Gestiona tus herramientas')
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Ver tus herramientas')
                )
                .addSubcommand(sub =>
                    sub.setName('equip')
                        .setDescription('Equipar herramienta')
                        .addStringOption(opt =>
                            opt.setName('tool')
                                .setDescription('Selecciona herramienta')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('repair')
                        .setDescription('Reparar herramienta')
                        .addStringOption(opt =>
                            opt.setName('tool')
                                .setDescription('Selecciona herramienta')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('upgrade')
                        .setDescription('Mejorar herramienta')
                        .addStringOption(opt =>
                            opt.setName('tool')
                                .setDescription('Selecciona herramienta')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('inventory')
                        .setDescription('Ver inventario detallado de herramientas')
                ),
            cooldown: 0,
            category: 'mining',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }


    async autocomplete(client, interaction) {

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const user = await client.levelManager.getOrCreateUserLevel(
            guildId,
            userId
        );

        const focused = interaction.options.getFocused();

        const tools = user.crafting?.tools ?? [];

        const filtered = tools
            .filter(t => t.name.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25)
            .map(t => ({
                name: `${t.name} (Dur: ${t.durability}/${t.maxDurability})`,
                value: t.toolId
            }));

        await interaction.respond(filtered);
    }


    async execute(client, interaction) {

        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const user = await client.levelManager.getOrCreateUserLevel(
            guildId,
            userId
        );

        switch (sub) {


            case "list": {

                if (!user.crafting?.tools?.length)
                    return interaction.editReply("No tienes herramientas.");

                const embeds = user.crafting.tools.map(tool => {

                    const rarityData = TOOL_RARITIES[tool.rarity];

                    return new EmbedBuilder()
                        .setColor(rarityData?.color ?? '#AAAAAA')
                        .setTitle(`${tool.name} ${user.crafting.equippedToolId === tool.toolId ? "<:verificado:1453073955467563008>" : ""}`)
                        .setDescription(
                            `\`TIER:\` ${tool.tier}\n` +
                            `\`DURABILIDAD:\` ${this.bar(tool.durability, tool.maxDurability)}\n` +
                            `\`UPGRADE:\` +${tool.upgradeLevel}`
                        );
                });

                return interaction.editReply({ embeds });
            }

            case "equip": {

                const toolId = interaction.options.getString("tool");

                try {
                    const tool = await user.equipTool(toolId);
                    await user.save();

                    return interaction.editReply(
                        `<:verificado:1453073955467563008> Equipaste **${tool.name}**`
                    );

                } catch (err) {
                    return interaction.editReply(`❌ ${err.message}`);
                }
            }

            case "repair": {

                const toolId = interaction.options.getString("tool");

                try {
                    const result = await user.repairTool(toolId);
                    await user.save();
                    return interaction.editReply(
                        `<:verificado:1453073955467563008> Reparada por **${result.cost} monedas**`
                    );

                } catch (err) {
                    return interaction.editReply(`❌ ${err.message}`);
                }
            }

            case "upgrade": {

                const toolId = interaction.options.getString("tool");
                const tool = user.crafting.tools.find(
                    t => t.toolId === toolId
                );

                if (!tool)
                    return interaction.editReply("Herramienta no encontrada.");

                const cost = 200 * (tool.upgradeLevel + 1);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle("\`CONFIRMAR MEJORA DE HERRAMIENTA\`")
                    .setDescription(
                        `\`HERRAMIENTA:\` **${tool.name}**\n` +
                        `\`COSTO:\` **${cost} Monedas**\n\n` +
                        `\`ANTES:\`\n` +
                        `\`Durabilidad Máx:\` ${tool.maxDurability}\n` +
                        `\`Cantidad\` x${tool.bonus.quantityMultiplier}\n\n` +
                        `\`DESPUÉS:\`\n` +
                        `\`Durabilidad Máx:\` ${tool.maxDurability + 20}\n` +
                        `\`Cantidad\` x${(tool.bonus.quantityMultiplier + 0.02).toFixed(2)}`
                    );

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`upgrade|${toolId}|${Date.now()}`)
                        .setEmoji("<:verificado:1453073955467563008>")
                        .setStyle(ButtonStyle.Success),

                    new ButtonBuilder()
                        .setCustomId("upgrade_cancel")
                        .setLabel("Cancelar")
                        .setStyle(ButtonStyle.Danger)
                );

                return interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

            case "inventory": {

                if (!user.crafting?.tools?.length)
                    return interaction.editReply("No tienes herramientas.");

                const equippedId = user.crafting.equippedToolId;

                const embed = new EmbedBuilder()
                    .setTitle("\`INVENTARIO DE HERRAMIENTAS\`")
                    .setColor("#5865F2");

                let description = "";

                user.crafting.tools.forEach(tool => {

                    const rarityData = TOOL_RARITIES[tool.rarity];
                    const equipped = equippedId === tool.toolId ? "`EQUIPADO`" : "`NO EQUIPADO`";
                    const config = toolsConfig[tool.toolId];

                    description +=
                        `${equipped} **${tool.name}** ${config?.emoji} \`|\` +${tool.upgradeLevel}\n` +
                        `\`TIER:\` ${tool.tier}\n` +
                        `\`DURABILIDAD:\` ${tool.durability}/${tool.maxDurability}\n` +
                        `\`CANTIDAD:\` x${tool.bonus.quantityMultiplier.toFixed(2)}\n\n`;
                });

                embed.setDescription(description);

                return interaction.editReply({ embeds: [embed] });
            }


        }
    }

    /* =========================================
       📊 Barra Durabilidad
    ========================================= */

    bar(current, max) {
        const total = 10;
        const filled = Math.round((current / max) * total);
        return "🟩".repeat(filled) +
            "⬛".repeat(total - filled) +
            ` (${current}/${max})`;
    }
}
