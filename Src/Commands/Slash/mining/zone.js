import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,  ButtonStyle, ComponentType 
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import { miningConfig } from '../../../LevelSystem/Configs/miningConfig.js';
import { materialsConfig } from '../../../LevelSystem/Configs/materialConfigs.js';

export default class ZoneSlash extends SlashCommand {

    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('zone')
                .setDescription('Sistema de zonas de minería')

                .addSubcommand(sub =>
                    sub
                        .setName('change')
                        .setDescription('Cambiar zona')
                        .addStringOption(opt =>
                            opt.setName('zona')
                                .setDescription('Selecciona zona')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('list')
                        .setDescription('Ver todas las zonas disponibles')
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

    /* =========================================
       🔎 AUTOCOMPLETE
    ========================================= */

    async autocomplete(client, interaction) {

        const focused = interaction.options.getFocused();

        const zones = Object.values(miningConfig.zones)
            .filter(z => z.name.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25)
            .map(z => ({
                name: `${z.name} (Lvl ${z.minLevel})`,
                value: z.id
            }));

        await interaction.respond(zones);
    }

    /* =========================================
       🚀 EXECUTE
    ========================================= */

    async execute(client, interaction) {

        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();

        if (sub === "list") {
            return this.showZoneList(interaction);
        }

        if (sub === "change") {
            return this.changeZone(client, interaction);
        }
    }

    /* =========================================
       🔁 CAMBIAR ZONA
    ========================================= */

    async changeZone(client, interaction) {

        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const zoneId = interaction.options.getString("zona");

        const result = await client.levelManager.setMiningZone(
            userId,
            guildId,
            zoneId
        );

        if (!result.success) {

            switch (result.reason) {

                case "level_required":
                    return interaction.editReply(
                        `❌ Necesitas nivel **${result.requiredLevel}**`
                    );

                case "tool_tier_required":
                    return interaction.editReply(
                        `❌ Necesitas herramienta **Tier ${result.requiredTier}**`
                    );

                case "no_tool_equipped":
                    return interaction.editReply(
                        `❌ Debes equipar una herramienta`
                    );

                default:
                    return interaction.editReply("❌ Zona inválida.");
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`\`ZONA CAMBIADA\``)
            .setDescription(
                `<:flechaizq:1469346308455272640> Ahora estás minando en **${result.zone.name}**`
            )
            .addFields(
                {
                    name: "\`NIVEL MÍNIMO\`",
                    value: `**${result.zone.minLevel}**`,
                    inline: false
                },
                {
                    name: "\`TIER DE PICO REQUERIDO\`",
                    value: `**${result.zone.requiredToolTier}**`,
                    inline: false
                }
            )
            .setFooter({ text: "Usa /zone list para ver los drops disponibles." });

        return interaction.editReply({ embeds: [embed] });
    }

    /* =========================================
       📜 LISTA DE ZONAS
    ========================================= */

    async showZoneList(interaction) {

        const zones = Object.values(miningConfig.zones);
        let currentPage = 0;

        const generateEmbed = (page) => {

            const zone = zones[page];
            const totalWeight = zone.drops.reduce((sum, d) => sum + d.weight, 0);

            const dropsText = zone.drops
                .sort((a, b) => b.weight - a.weight)
                .map(drop => {

                    const mat = materialsConfig[drop.materialId];
                    if (!mat) return null;

                    const percent = ((drop.weight / totalWeight) * 100).toFixed(1);

                    return `${mat.emoji || "🔹"} **${mat.name}** \`${percent}%\``;

                })
                .filter(Boolean)
                .join("\n");

            return new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`${zone.emoji} \`${zone.name.toUpperCase()}\``)
                .setDescription(`<:flechaizq:1469346308455272640> ${zone.description || "Zona de minería."}`)
                .addFields(
                    {
                        name: "\`NIVEL MÍNIMO\`",
                        value: `**${zone.minLevel}**`,
                        inline: false
                    },
                    {
                        name: "\`TIER DE PICO REQUERIDO\`",
                        value: `**${zone.requiredToolTier}**`,
                        inline: false
                    },
                    {
                        name: "\`COSTO DE DURABILIDAD\`",
                        value: `**${zone.durabilityCost}**`,
                        inline: false
                    },
                    {
                        name: "\`CANTIDAD BASE\`",
                        value: `**${zone.baseQuantity.min} - ${zone.baseQuantity.max}**`,
                        inline: false
                    },
                    {
                        name: "\`DROPS\`",
                        value: dropsText || "Sin drops configurados.",
                        inline: false
                    }
                )
                .setFooter({
                    text: `Página ${page + 1} / ${zones.length}`
                });
        };

        const generateButtons = (page) => {

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('zone_prev')
                    .setEmoji('<:flechaizquierda:1456491998335865075>')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),

                new ButtonBuilder()
                    .setCustomId('zone_next')
                    .setEmoji("<:flechaderecha:1455684486938362010>")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === zones.length - 1)
            );
        };

        const message = await interaction.editReply({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
        });

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000
        });

        collector.on('collect', async i => {

            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ No puedes usar estos botones.",
                    ephemeral: true
                });
            }

            if (i.customId === "zone_prev") currentPage--;
            if (i.customId === "zone_next") currentPage++;

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateButtons(currentPage)]
            });
        });

        collector.on('end', async () => {
            await message.edit({
                components: []
            }).catch(() => { });
        });
    }

}
