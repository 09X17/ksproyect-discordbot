import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { boxTypes } from '../../../LevelSystem/Managers/boxTypesConfig.js';

export default class BoxesSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('boxes')
                .setDescription('Ver todas las cajas disponibles'),

            cooldown: 1,
            category: 'loot',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {

        await interaction.deferReply();

        const boxes = Object.entries(boxTypes);
        const perPage = 3;
        let page = 0;
        const totalPages = Math.ceil(boxes.length / perPage);

        const generateEmbed = (pageIndex) => {

            const slice = boxes.slice(
                pageIndex * perPage,
                pageIndex * perPage + perPage
            );

            const description = slice.map(([id, box]) => {

                const rewards = box.rewards.map(r => {

                    if (r.type === "coins")
                        return `<:dinero:1451695904351457330> ${r.min}-${r.max}`;

                    if (r.type === "tokens")
                        return `<:tokens:1451695903080579192> ${r.min}-${r.max}`;

                    if (r.type === "xp")
                        return `⭐ XP`;

                    if (r.type === "random_box")
                        return `<:cajaregalomisteriosa:1473076179958497484> Caja Aleatoria`;

                    return r.type;

                }).join("\n");

                return `${box.emoji} **${box.name.toUpperCase()}**\n<:flechaizq:1469346308455272640> \`DROPS:\`\n${rewards}`; }).join("\n\n");

            return new EmbedBuilder()
                .setColor("#5865F2")
                .setTitle("<:blocdedibujo:1473098432658014283> `LIBRO DE CAJAS`")
                .setDescription(description)
                .setFooter({
                    text: `Página ${pageIndex + 1} / ${totalPages}`
                });
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("boxes_prev")
                .setEmoji("<:flechaizquierda:1456491998335865075>")
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("boxes_next")
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

            if (i.customId === "boxes_prev")
                page = page > 0 ? page - 1 : totalPages - 1;

            if (i.customId === "boxes_next")
                page = page < totalPages - 1 ? page + 1 : 0;

            await i.update({
                embeds: [generateEmbed(page)],
                components: [row]
            });
        });

        collector.on("end", async () => {
            await message.edit({ components: [] });
        });
    }
}
