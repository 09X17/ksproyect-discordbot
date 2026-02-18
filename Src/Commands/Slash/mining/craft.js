import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { blueprintsConfig } from '../../../LevelSystem/Configs/blueprintsConfig.js';
import { materialsConfig, MATERIAL_RARITIES } from '../../../LevelSystem/Configs/materialConfigs.js';

export default class CraftSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('craft')
                .setDescription('Sistema de crafteo')

                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('Ver blueprints disponibles')
                )
                .addSubcommand(sub =>
                    sub.setName('info')
                        .setDescription('Ver detalles de un blueprint')
                        .addStringOption(opt =>
                            opt.setName('blueprint')
                                .setDescription('ID del blueprint')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('make')
                        .setDescription('Craftear un blueprint')
                        .addStringOption(opt =>
                            opt.setName('blueprint')
                                .setDescription('ID del blueprint')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('recipes')
                        .setDescription('Ver todas las recetas disponibles')
                )
            ,
            cooldown: 1,
            category: 'crafting',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async autocomplete(client, interaction) {

        const user = await client.levelManager.getOrCreateUserLevel(
            interaction.guild.id,
            interaction.user.id
        );

        const focused = interaction.options.getFocused();

        const blueprints = Object.values(blueprintsConfig)
            .filter(bp =>
                user.level >= bp.requiredLevel &&
                bp.name.toLowerCase().includes(focused.toLowerCase())
            )
            .slice(0, 25)
            .map(bp => ({
                name: `${bp.name} (Lv ${bp.requiredLevel})`,
                value: bp.id
            }));

        await interaction.respond(blueprints);
    }

    async execute(client, interaction) {

        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const user = await client.levelManager.getOrCreateUserLevel(guildId, userId);


        if (sub === "list") {

            const available = Object.values(blueprintsConfig)
                .filter(bp => user.level >= bp.requiredLevel);

            if (!available.length)
                return interaction.editReply({
                    flags: 64,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#EF4444")
                            .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN`")
                            .setDescription("<:flechaizq:1469346308455272640> *No tienes blueprints disponibles.*")
                    ]
                });

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN`")
                .setDescription(
                    available.map(bp =>
                        `${bp.emoji} **${bp.name.toUpperCase()}** (Lv ${bp.requiredLevel})`
                    ).join('\n')
                );

            return interaction.editReply({ embeds: [embed] });
        }

        /* =============================
           📖 INFO
        ============================= */

        if (sub === "info") {

            const blueprintId = interaction.options.getString("blueprint");
            const blueprint = blueprintsConfig[blueprintId];

            if (!blueprint)
                return interaction.editReply({
                    flags: 64,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#EF4444")
                            .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN | BLUEPRINT INVÁLIDO`")
                    ]
                });

            const materials = blueprint.requires.map(r => {
                const mat = materialsConfig[r.materialId];
                return `${mat?.emoji ?? "📦"} ${mat?.name ?? r.materialId} x${r.quantity}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#00C2FF')
                .setTitle(`${blueprint.emoji} \`BLUEPRINT DE: ${blueprint.name.toUpperCase()}\``)
                .setDescription(blueprint.description)
                .addFields(
                    { name: "\`REQUIERE\`", value: materials },
                    {
                        name: "\`COSTE\`",
                        value: `Monedas: ${blueprint.craftingCostCoins}\nTokens: ${blueprint.craftingCostTokens}`,
                        inline: false
                    },
                    {
                        name: "\`PROB. ÉXITO\`",
                        value: `${Math.floor(blueprint.successRate * 100)}%`,
                        inline: false
                    }
                );

            return interaction.editReply({ embeds: [embed] });
        }


        if (sub === "make") {

            const blueprintId = interaction.options.getString("blueprint");
            const blueprint = blueprintsConfig[blueprintId];

            if (!blueprint)
                return interaction.editReply({
                    flags: 64,
                    embeds: [new EmbedBuilder().setColor("#EF4444").setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN | BLUEPRINT INVÁLIDO`")]
                });

            if (user.level < blueprint.requiredLevel)
                return interaction.editReply({
                    flags: 64,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#EF4444")
                            .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN | NIVEL INSUFICIENTE`")
                            .setDescription(`Necesitas nivel ${blueprint.requiredLevel}.`)
                    ]
                });

            const status = user.getCraftingStatus(blueprint.requires);

            const materialsVisual = blueprint.requires.map(req => {

                const mat = materialsConfig[req.materialId];
                const owned = user.getMaterial(req.materialId)?.quantity ?? 0;

                const percent = Math.min(owned / req.quantity, 1);
                const bar = this.progressBar(percent);

                const enough = owned >= req.quantity;

                return `${mat?.emoji ?? "📦"} **${mat?.name.toUpperCase() ?? req.materialId} ${enough ? "<:verificado:1453073955467563008>" : "<:cancelar:1469343007554928641>"}**\n\`TIENES:\` ${owned}\n\`DE:\`${req.quantity}`;}).join("\n");

            if (!status.canCraft) {

                const missingText = status.missing.map(m => {
                    const mat = materialsConfig[m.materialId];
                    return `${mat?.emoji ?? "📦"} **${mat?.name.toUpperCase()}** \`FALTAN\` **${m.missing}**`;
                }).join("\n");

                const embed = new EmbedBuilder()
                    .setColor("#EF4444")
                    .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN | FALTAN RECURSOS`")
                    .setDescription(materialsVisual)
                    .addFields({
                        name: "`TE FALTAN`",
                        value: missingText
                    });

                return interaction.editReply({ embeds: [embed], flags: 64 });
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle("<:blocdedibujo:1473098432658014283> `MENÚ DE CREACIÓN | CONFIRMAR CREACIÓN`")
                .setDescription(
                    `${blueprint.emoji} **${blueprint.name.toUpperCase()}**\n\n` +
                    materialsVisual +
                    `\n<:flechaizq:1469346308455272640> \`PROBABILIDAD:\` ${Math.floor(blueprint.successRate * 100)}%`
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`craft_confirm_${blueprintId}`)
                    .setEmoji("<:verificado:1453073955467563008>")
                    .setStyle(ButtonStyle.Success),

                new ButtonBuilder()
                    .setCustomId("craft_cancel")
                    .setEmoji("<:cancelar:1469343007554928641>")
                    .setStyle(ButtonStyle.Danger)
            );

            return interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        }


        if (sub === "recipes") {

            const recipes = Object.values(blueprintsConfig)
                .filter(bp => user.level >= bp.requiredLevel);

            if (!recipes.length) {
                return interaction.editReply({
                    flags: 64,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#EF4444")
                            .setTitle("<:blocdedibujo:1473098432658014283> `RECETAS`")
                            .setDescription("<:flechaizq:1469346308455272640> *No tienes recetas desbloqueadas.*")
                    ]
                });
            }

            const perPage = 4;
            let page = 0;
            const totalPages = Math.ceil(recipes.length / perPage);

            const generateEmbed = (pageIndex) => {

                const slice = recipes.slice(
                    pageIndex * perPage,
                    pageIndex * perPage + perPage
                );

                const description = slice.map(bp => {

                    const materials = bp.requires.map(req => {
                        const mat = materialsConfig[req.materialId];
                        return `${mat?.emoji ?? "📦"} ${req.quantity}`;
                    }).join(" ");

                    let resultText = "";

                    switch (bp.result.type) {

                        case "material": {
                            const mat = materialsConfig[bp.result.materialId];
                            resultText =
                                `${mat?.emoji ?? "📦"} x${bp.result.quantity}`;
                            break;
                        }

                        case "lootbox":
                            resultText =
                                `${bp.emoji ?? "🎁"} x${bp.result.quantity}`;
                            break;

                        case "coins":
                            resultText =
                                `<:dinero:1451695904351457330> x${bp.result.quantity}`;
                            break;

                        case "tokens":
                            resultText =
                                `<:tokens:1451695903080579192> x${bp.result.quantity}`;
                            break;
                    }

                    return `${bp.emoji} **${bp.name.toUpperCase()}**
<:flechaizq:1469346308455272640> \`REQ:\` ${materials}
<:flechaizq:1469346308455272640> \`RESULT:\` ${resultText}
<:flechaizq:1469346308455272640> \`LV:\` ${bp.requiredLevel}`;
                }).join("\n\n");

                return new EmbedBuilder()
                    .setColor("#5865F2")
                    .setTitle("<:blocdedibujo:1473098432658014283> `LIBRO DE RECETAS`")
                    .setDescription(description)
                    .setFooter({
                        text: `Página ${pageIndex + 1} / ${totalPages}`
                    });
            };

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("recipes_prev")
                    .setEmoji("<:flechaizquierda:1456491998335865075>")
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId("recipes_next")
                    .setEmoji("<:flechaderecha:1455684486938362010>")
                    .setStyle(ButtonStyle.Secondary)
            );

            const message = await interaction.editReply({
                embeds: [generateEmbed(page)],
                components: totalPages > 1 ? [row] : []
            });

            if (totalPages <= 1) return;

            const collector = message.createMessageComponentCollector({
                time: 60000
            });

            collector.on("collect", async i => {

                if (i.user.id !== interaction.user.id)
                    return i.reply({ content: "No puedes usar estos botones.", flags: 64 });

                if (i.customId === "recipes_prev") {
                    page = page > 0 ? page - 1 : totalPages - 1;
                }

                if (i.customId === "recipes_next") {
                    page = page < totalPages - 1 ? page + 1 : 0;
                }

                await i.update({
                    embeds: [generateEmbed(page)],
                    components: [row]
                });
            });

            collector.on("end", async () => {
                await message.edit({ components: [] });
            });

            return;
        }

    }

    progressBar(percent) {
        const total = 10;
        const filled = Math.round(percent * total);
        return "██████████".slice(0, filled) +
            "░░░░░░░░░░".slice(0, total - filled);
    }
}
