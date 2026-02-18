import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { MATERIAL_RARITIES } from '../../../LevelSystem/Configs/materialConfigs.js';
import { toolsConfig } from '../../../LevelSystem/Configs/toolsConfig.js';

export default class MineSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('mine')
                .setDescription('Extrae materiales de la zona actual'),

            cooldown: 0,
            category: 'mining',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {

        await interaction.deferReply();

        try {

            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            const user = await client.levelManager.getOrCreateUserLevel(
                guildId,
                userId
            );

            const result = await client.levelManager.miningManager.mine(user);

            if (!result.success) {

                let description = "No puedes minar ahora.";

                switch (result.reason) {

                    case "cooldown":
                        const seconds = Math.floor((Date.now() + result.cooldownRemaining) / 1000);
                        description = `Debes esperar <t:${seconds}:R> para volver a minar.`;
                        break;

                    case "level_required":
                        description = `Necesitas nivel **${result.requiredLevel}** para esta zona.`;
                        break;

                    case "no_tool_equipped":
                        description = `Debes equipar una herramienta. \`/tool equip\``;
                        break;

                    case "tool_tier_required":
                        description = `Necesitas herramienta **Tier ${result.requiredTier}**.`;
                        break;

                    case "tool_broken":
                        description = `Tu herramienta está rota. Repárala.`;
                        break;

                    case "inventory_full":
                        description = `Tu inventario de materiales está lleno.`;
                        break;
                }

                return interaction.editReply({
                    flags: 64,
                    embeds: [
                        new EmbedBuilder()
                            .setColor("#EF4444")
                            .setTitle("<:espadas:1453178343112442020> `SISTEMA DE MINERÍA`")
                            .setDescription(description)
                    ]
                });
            }

            const rarityData = MATERIAL_RARITIES[result.material.rarity];

            const qualityBar = this.progressBar(result.quality / 100);
            const durabilityPercent = result.toolUsed.durability / result.toolUsed.maxDurability;
            const durabilityBar = this.progressBar(durabilityPercent);
            const toolConfig = toolsConfig[result.toolUsed.toolId];

            const embed = new EmbedBuilder()
                .setColor(rarityData?.color ?? "#8B8B8B")
                .setTitle("<:espadas:1453178343112442020> `SISTEMA DE MINERÍA`")
                .setDescription(
                `<:pico:1465516936439005359> \`ZONA:\` **${result.zone.name.toUpperCase()}**\n` +
                `<:flechaizq:1469346308455272640> \`OBTUVISTE:\` ${result.material.emoji} **${result.material.name.toUpperCase()}** x${result.quantity}\n` +
                `<:marcovacio:1465161611588403210> \`CALIDAD:\` **${result.quality}%**\n` +
                `<:paletadecolor:1462503084159664188> \`RAREZA:\` **${rarityData?.label ?? "Desconocida"}**`
                )
                .addFields(
                    {
                        name: "\`HERRAMIENTA\`",
                        value:
                            `\`PICO:\` ${toolConfig?.emoji ?? ""} **${result.toolUsed.name.toUpperCase()}**\n` +
                            `\`DURABILIDAD:\` **${result.toolUsed.durability}/${result.toolUsed.maxDurability}**`,
                        inline: false
                    },
                    {
                        name: "\`ESTADO\`",
                        value: result.toolBroken
                            ? "<:cancelar:1469343007554928641> Se rompió."
                            : "<:verificado:1453073955467563008> Sigue intacta.",
                        inline: false
                    }
                )
                .setFooter({
                    text: `Minería • Peso ${user.getUsedCraftingWeight()} / ${user.crafting.inventory.capacity}`
                });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            client.logger.error("❌ Error en /mine:", error);

            await interaction.editReply({
                flags: 64,
                embeds: [
                    new EmbedBuilder()
                        .setColor("#EF4444")
                        .setTitle("⛏️ `SISTEMA DE MINERÍA`")
                        .setDescription("Ocurrió un error al minar.")
                ]
            });
        }
    }

    progressBar(percent) {
        const total = 10;
        const filled = Math.round(percent * total);
        return "██████████".slice(0, filled) +
            "░░░░░░░░░░".slice(0, total - filled);
    }
}
