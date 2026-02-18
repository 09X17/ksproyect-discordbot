import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { materialsConfig, MATERIAL_RARITIES } from '../../../LevelSystem/Configs/materialConfigs.js';

export default class MaterialsSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('materials')
                .setDescription('Ver tus materiales'),
            cooldown: 1,
            category: 'crafting',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {

        await interaction.deferReply();

        const user = await client.levelManager.getOrCreateUserLevel(
            interaction.guild.id,
            interaction.user.id
        );

        const materials = user.crafting?.materials ?? [];

        if (!materials.length) {
            return interaction.editReply({
                flags: 64,
                embeds: [
                    new EmbedBuilder()
                        .setColor("#EF4444")
                        .setTitle("<:caja:1473098432658014283> `INVENTARIO DE MATERIALES`")
                        .setDescription("<:flechaizq:1469346308455272640> *No tienes materiales.*")
                ]
            });
        }

        const sorted = materials.sort((a, b) => b.quantity - a.quantity);

        const perPage = 5;
        const totalPages = Math.ceil(sorted.length / perPage);

        let page = 0;

        const generateEmbed = (pageIndex) => {

            const slice = sorted.slice(
                pageIndex * perPage,
                pageIndex * perPage + perPage
            );

            const description = slice.map(mat => {

                const config = materialsConfig[mat.materialId];
                const rarityData = MATERIAL_RARITIES[mat.rarity];

                const qualityBar = this.progressBar(mat.quality / 100);

                return `${config?.emoji ?? "📦"} **${config?.name?.toUpperCase() ?? mat.materialId}**\n\`CANTIDAD:\` **${mat.quantity}**\n\`CALIDAD:\` ${mat.quality}%\n\`RAREZA:\` *${rarityData?.label ?? "?"}*`;}).join("\n");

            return new EmbedBuilder()
                .setColor("#22C55E")
                .setTitle("<:caja:1473098432658014283> `INVENTARIO DE MATERIALES`")
                .setDescription(description)
                .setFooter({
                    text: `Página ${pageIndex + 1} / ${totalPages} • Peso ${user.getUsedCraftingWeight()} / ${user.crafting.inventory.capacity}`
                });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("materials_prev")
                .setEmoji("<:flechaizquierda:1456491998335865075>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),

            new ButtonBuilder()
                .setCustomId("materials_next")
                .setEmoji("<:flechaderecha:1455684486938362010>")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(totalPages <= 1)
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

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "Este menú no es tuyo.",
                    ephemeral: true
                });
            }

            if (i.customId === "materials_next") page++;
            if (i.customId === "materials_prev") page--;

            if (page < 0) page = 0;
            if (page > totalPages - 1) page = totalPages - 1;

            row.components[0].setDisabled(page === 0);
            row.components[1].setDisabled(page === totalPages - 1);

            await i.update({
                embeds: [generateEmbed(page)],
                components: [row]
            });
        });

        collector.on("end", async () => {
            row.components.forEach(btn => btn.setDisabled(true));
            await message.edit({ components: [row] }).catch(() => {});
        });
    }

    progressBar(percent) {
        const total = 10;
        const filled = Math.round(percent * total);
        return "██████████".slice(0, filled) +
            "░░░░░░░░░░".slice(0, total - filled);
    }
}
