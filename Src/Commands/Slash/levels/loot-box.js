import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class LootBoxForceCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('lootbox')
                .setDescription('Forzar aparición de caja (Admin)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('force')
                        .setDescription('Forzar aparición de caja')
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de caja')
                                .setRequired(true)
                                .addChoices(
                                    { name: '📦 Común', value: 'common' },
                                    { name: '🟢 Poco Común', value: 'uncommon' },
                                    { name: '🎁 Rara', value: 'rare' },
                                    { name: '🟣 Épica', value: 'epic' },
                                    { name: '💎 Legendaria', value: 'legendary' },
                                    { name: '❓ Misteriosa', value: 'mystery' },
                                    { name: '🍀 Fortuna', value: 'fortune' },
                                    { name: '⚡ Experiencia', value: 'xp_boost' },
                                    { name: '🔥 Mítica', value: 'mythic' },
                                    { name: '✨ Divina', value: 'divine' },
                                    { name: "Jucio Divino", value: "divine_2" }
                                )

                        )
                        .addUserOption(option =>
                            option
                                .setName('usuario')
                                .setDescription('Usuario que recibirá la caja directamente')
                                .setRequired(false)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('cantidad')
                                .setDescription('Cantidad de cajas a entregar')
                                .setMinValue(1)
                                .setMaxValue(50)
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('razon')
                                .setDescription('Razón de envío de la caja')
                                .setRequired(false)
                        )
                ),
            cooldown: 10,
            category: 'levels',
            userPermissions: [
                PermissionFlagsBits.ManageGuild
            ],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.UseExternalEmojis
            ]
        });
    }

    async execute(client, interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            if (subcommand === 'force') {
                await this.handleForceSpawn(client, interaction);
            }
        } catch (error) {
            console.error('Error en comando cajas:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocurrió un error al procesar el comando.',
                    flags: 64
                });
            }
        }
    }

    async handleForceSpawn(client, interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Solo los administradores pueden forzar la aparición de cajas.',
                flags: 64
            });
        }

        const boxType = interaction.options.getString('tipo');
        const quantity = interaction.options.getInteger('cantidad') || 1;
        const targetUser = interaction.options.getUser('usuario');
        const reason = interaction.options.getString('razon') || 'Sin razón especificada';

        const lootBoxManager = client.levelManager.lootBoxManager;
        const guildId = interaction.guild.id;

        const boxData = lootBoxManager.boxTypes[boxType];

        if (!boxData) {
            return interaction.reply({
                content: '❌ Tipo de caja inválido.',
                flags: 64
            });
        }

        try {
            if (targetUser) {
                // ═══════════════════════════════════════════════════════
                // DAR CAJA DIRECTAMENTE AL USUARIO
                // ═══════════════════════════════════════════════════════
                const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, targetUser.id);

                // ✅ AHORA addLootBoxToInventory ES ASYNC Y GUARDA
                const result = await userLevel.addLootBoxToInventory(boxType, boxData.name, quantity);
                const totalQuantity = result.quantity || quantity;

                // Embed en canal
                const embedChannel = new EmbedBuilder()
                    .setColor(boxData.color || "#FFD700")
                    .setTitle(`${boxData.emoji} \`CAJA ENTREGADA\``)
                    .setDescription(
                        `✅ **Se han entregado ${quantity} ${boxData.name} a ${targetUser.username}!**\n` +
                        `📦 **Cantidad total ahora:** ${totalQuantity}\n` +
                        `📌 **Razón:** ${reason}`
                    )
                    .setFooter({
                        text: `Enviada por: ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL()
                    })
                    .setTimestamp();

                // DM al usuario
                try {
                    const embedDM = new EmbedBuilder()
                        .setColor(boxData.color || "#FFD700")
                        .setTitle(`${boxData.emoji} \`¡HAS RECIBIDO CAJAS!\``)
                        .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1462597373661544653/caja-de-regalo.png")
                        .setDescription(
                            `<:flechaderecha:1455684486938362010> **Has recibido** \`${quantity} ${boxData.name.toUpperCase()}\` **en ${interaction.guild.name.toUpperCase()}**\n` +
                            `<:flechaderecha:1455684486938362010> \`CANTIDAD TOTAL:\` ${totalQuantity}\n` +
                            `<:cajadeentrega:1453099645063532555> \`RAZÓN:\` ${reason}\n` +
                            `<:etiqueta:1453099849355493396> \`ENVIADA POR:\` ${interaction.user.tag}\n` +
                            `<:agregarproducto:1456491535569784922> Para abrir sus cajas use el comando \`/inventory\` en el servidor.`
                        )
                        .setFooter({
                            text: `Servidor: ${interaction.guild.name}`,
                            iconURL: interaction.guild.iconURL()
                        })
                        .setTimestamp();

                    await targetUser.send({ embeds: [embedDM] });
                } catch (err) {
                    console.warn(`No se pudo enviar DM a ${targetUser.username}: ${err.message}`);
                    embedChannel.addFields({
                        name: '⚠️ Nota',
                        value: `No se pudo enviar DM a ${targetUser.username}`
                    });
                }

                return interaction.reply({ embeds: [embedChannel], flags: 64 });
            }

            // ═══════════════════════════════════════════════════════
            // FORZAR APARICIÓN EN CANAL
            // ═══════════════════════════════════════════════════════
            await lootBoxManager.spawnBox(guildId, interaction.channel, boxType, interaction);

            const embedChannel = new EmbedBuilder()
                .setColor(boxData.color || "#FFD700")
                .setTitle(`${boxData.emoji} \`CAJA FORZADA\``)
                .setDescription(
                    `<:verificado:1453073955467563008> **¡Caja ${boxData.name} aparecida manualmente en el canal!**\n\n` +
                    `📌 **Tipo:** ${boxData.name}\n` +
                    `⏱ **Cantidad:** ${quantity}\n` +
                    `📤 **Enviada por:** ${interaction.user}`
                )
                .setFooter({
                    text: `Administrador: ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embedChannel], flags: 64 });

        } catch (error) {
            console.error('Error forzando caja:', error.stack);
            await interaction.reply({
                content: `❌ Error: ${error.message}`,
                flags: 64
            });
        }
    }
}
