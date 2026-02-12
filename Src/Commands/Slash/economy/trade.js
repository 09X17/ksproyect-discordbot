import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class TradeCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('trade')
                .setDescription('Intercambia recursos con otro usuario de forma segura')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario con quien quieres intercambiar')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('recurso')
                        .setDescription('Recurso a ofrecer')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Monedas', value: 'coins' },
                            { name: 'Tokens', value: 'tokens' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('cantidad')
                        .setDescription('Cantidad a ofrecer')
                        .setRequired(true)
                        .setMinValue(1)
                ),
            cooldown: 60,
            category: 'economy',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory
            ]
        });
    }

    async execute(client, interaction) {
        try {
            const targetUser = interaction.options.getUser('usuario');
            const resource = interaction.options.getString('recurso');
            const amount = interaction.options.getInteger('cantidad');

            if (targetUser.bot || targetUser.id === interaction.user.id) {
                return interaction.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xEA4335)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    '<:cancelar:1469343007554928641> | Usuario inválido para intercambiar.'
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2 | flags: 64
                });
            }

            if (resource && amount) {
                return this.createQuickTrade(client, interaction, targetUser, resource, amount);
            }

            await this.startInteractiveSetup(client, interaction, targetUser);

        } catch (err) {
            console.error(err);
            if (!interaction.replied) {
                interaction.reply({
                    components: [
                        new ContainerBuilder()
                            .setAccentColor(0xEA4335)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    '<:cancelar:1469343007554928641> | Error al crear el intercambio.'
                                )
                            )
                    ],
                    flags: MessageFlags.IsComponentsV2 | flags: 64
                });
            }
        }
    }

    async createQuickTrade(client, interaction, targetUser, resourceType, amount) {
        await interaction.deferReply({ flags: 64 });

        const userLevel = await client.levelManager.getOrCreateUserLevel(
            interaction.guild.id,
            interaction.user.id
        );

        if (userLevel[resourceType] < amount) {
            return interaction.editReply({
                components: [
                    new ContainerBuilder()
                        .setAccentColor(0xEA4335)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `<:cancelar:1469343007554928641> | No tienes suficientes ${this.getResourceName(resourceType)}.`
                            )
                        )
                ],
                flags: MessageFlags.IsComponentsV2 | flags: 64
            });
        }

        await this.createTradeOffer(
            client,
            interaction,
            interaction.user,
            targetUser,
            resourceType,
            amount
        );
    }

    async startInteractiveSetup(client, interaction, targetUser) {
        const userLevel = await client.levelManager.getOrCreateUserLevel(
            interaction.guild.id,
            interaction.user.id
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`trade_resource_${interaction.user.id}`)
            .setPlaceholder('Selecciona el recurso')
            .addOptions(
                {
                    label: 'MONEDAS',
                    value: 'coins',
                    emoji: '<:dinero:1451695904351457330>',
                    description: `Disponibles: ${userLevel.coins}`
                },
                {
                    label: 'TOKENS',
                    value: 'tokens',
                    emoji: '<:tokens:1451695903080579192>',
                    description: `Disponibles: ${userLevel.tokens}`
                }
            );

        const container = new ContainerBuilder()
            .setAccentColor(0x4285F4)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `\`CONFIGURAR INTERCAMBIO\`\n\n` +
                    `<:flechaderecha:1455684486938362010> Intercambio con: <@${targetUser.id}>\n\n` +
                    `<:dinero:1451695904351457330> \`${userLevel.coins} MONEDAS\`\n` +
                    `<:tokens:1451695903080579192> \`${userLevel.tokens} TOKENS`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(selectMenu)
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | flags: 64
        });
    }

    async createTradeOffer(client, interaction, initiator, targetUser, resourceType, amount) {
        const tradeId = `${initiator.id}_${Date.now()}`;
        const expiresAt = Date.now() + 15 * 60 * 1000;
         const expiresAt1 = Math.floor((Date.now() + 15 * 60 * 1000) / 1000);


        if (!client.activeTrades) client.activeTrades = new Map();

        const tradeData = {
            id: tradeId,
            guildId: interaction.guild.id,
            channelId: interaction.channel.id,
            messageId: null, 
            createdAt: Date.now(),
            expiresAt,
            status: 'pending',
            initiatorId: initiator.id,
            targetId: targetUser.id,
            initiatorOffer: {
                type: resourceType,
                amount
            },
            targetOffer: null
        };

        const tradeContainer = new ContainerBuilder()
            .setAccentColor(0xF4B400)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `\`NOTIFICACIÓN DE INTERCAMBIO PARA:\` <@${targetUser.id}>\n\n` +
                    `<:flechaderecha:1455684486938362010> \`PROPUESTA DE INTERCAMBIO\`\n` +
                    `<:dar:1470190416841412745> <@${initiator.id}> **OFRECE:**\n` +
                    `<:dar:1470190416841412745> ${this.getResourceEmoji(resourceType)} **${amount} ${this.getResourceName(resourceType)}**\n` +
                    `<:dar:1470190416841412745> **EXPIRA EN:** <t:${expiresAt1}:R>`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trade_accept_${tradeId}`)
                        .setEmoji('<:verificado:1453073955467563008>')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`trade_decline_${tradeId}`)
                        .setEmoji('<:cancelar:1469343007554928641>')
                        .setStyle(ButtonStyle.Danger)
                )
            );

       const message = await interaction.channel.send({
            components: [tradeContainer],
            flags: MessageFlags.IsComponentsV2
        });

        tradeData.messageId = message.id;
        client.activeTrades.set(tradeId, tradeData);

        await interaction.followUp({
            components: [
                new ContainerBuilder()
                    .setAccentColor(0x34A853)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            '<:verificado:1453073955467563008> | Trade enviado correctamente.'
                        )
                    )
            ],
            flags: MessageFlags.IsComponentsV2 | flags: 64
        });
    }

    getResourceEmoji(type) {
        return type === 'coins' ? '<:dinero:1451695904351457330>' : '<:tokens:1451695903080579192>';
    }

    getResourceName(type) {
        return type === 'coins' ? 'MONEDAS' : 'TOKENS';
    }
}
