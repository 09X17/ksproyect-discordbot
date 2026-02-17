import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle, PermissionFlagsBits,
    UserContextMenuCommandInteraction
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import ShopItem from '../../../LevelSystem/Models/ShopItem.js';
import UserLevel from '../../../LevelSystem/Models/UserLevel.js';

const SHOP_CATEGORIES = [
    { id: 'all', name: 'Todos', emoji: '<:categorias:1453081710357905551>' },
    { id: "permission", name: "Desbloquea permisos", emoji: "<:debilidad:1465843214358679694>", description: "Desbloquea pemisos como: Colores, Fondos" },
    { id: 'cosmetic', name: 'Compra relacionado a juegos', emoji: '<:diamante:1453080344810229921>', description: "Compra pases, Suscipciones, Juegos" },
    { id: 'xp', name: 'Compra por experiencia', emoji: '<:xp:1453078768687255845>', description: "Compra items usando tu experiencia" },
    { id: 'economy', name: 'Compra por monedas/tokens', emoji: '<:bolsadedinero:1453079730579570931>', description: "Compra items usando monedas o tokens" },
    { id: 'boosts_user', name: 'Comprar Boosts de Usuario', emoji: '<:destello:1453080731516403773>', description: "Compra boosts para tu usuario" },
    { id: 'boosts_server', name: 'Comprar Boosts de Servidor', emoji: '<:cinta:1453099434908061828>', description: "Compra boosts para el servidor" },
    { id: 'roles', name: 'Desbloquear roles', emoji: '<:roles:1453080831609536573>', description: "Desbloquea roles especiales del servidor" }
];

export default class ShopSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('shop-items')
                .setDescription('Compra items de la tienda del servidor.'),
            cooldown: 5,
            category: 'economy',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }
    async execute(client, interaction) {
        await interaction.deferReply();

        let user = await UserLevel.findOne({
            guildId: interaction.guild.id,
            userId: interaction.user.id
        });

        if (!user) {
            user = await UserLevel.create({
                guildId: interaction.guild.id,
                userId: interaction.user.id
            });
        }

        await this.renderShop(interaction, user, 'all');
    }

    async renderShop(interaction, user, category) {
        const query = {
            guildId: interaction.guild.id,
            active: true,
            $or: [{ stock: { $gt: 0 } }, { stock: -1 }]
        };

        if (category !== 'all') {
            if (category === 'boosts_user') {
                query.$or = [
                    { category: 'boosts_user' },
                    { type: 'boost_user' }
                ];
            } else if (category === 'boosts_server') {
                query.$or = [
                    { category: 'boosts_server' },
                    { type: 'boost_server' }
                ];
            } else {
                query.category = category;
            }
        }

        const items = await ShopItem.find(query)
            .sort({ 'cost.coins': 1, 'cost.tokens': 1, 'cost.xp': 1 })
            .limit(15);

        const embed = this.buildShopEmbed(interaction, user, items, category);
        let components = [];
        if (category !== 'all') {
            components = this.buildShopComponents(items, category, user);
        } else {
            components = [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('shop_category_select')
                        .setPlaceholder('Selecciona categoría')
                        .addOptions(
                            SHOP_CATEGORIES.map(cat => ({
                                label: cat.name,
                                value: cat.id,
                                emoji: cat.emoji,
                                default: cat.id === category,
                                description: cat.description || 'Ver items de esta categoría'
                            }))
                        )
                )
            ];
        }

        await interaction.editReply({
            embeds: [embed],
            components
        });
    }

    buildShopEmbed(interaction, user, items, category) {
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`\`\`\`TIENDA DE ${interaction.guild.name.toUpperCase()}\`\`\``)
            .setDescription(`<:categorias:1453081710357905551> \`CATEGORÍA:\` **${this.getCategoryName(category)}**\n<:dinero:1451695904351457330> __${user.coins} MONEDAS__ | <:tokens:1451695903080579192> __${user.tokens} TOKENS__ | <:xp:1453078768687255845> __${user.xp} XP__`)

        if (!items.length) {
            embed.setDescription(`<:no_comprobado:1453073957388419216> Esta Tienda se encuentra vacía.\n\n<:categorias:1453081710357905551> \`CATEGORÍA:\` **${this.getCategoryName(category)}**\n<:dinero:1451695904351457330> __${user.coins} MONEDAS__ | <:tokens:1451695903080579192> __${user.tokens} TOKENS__ | <:xp:1453078768687255845> __${user.xp} XP__`);
            return embed;
        }

        for (const item of items) {

            const canAfford = this.canUserAfford(user, item.cost);

            const statusIcon = canAfford ? '<:founds:1471959862052257864>' : '<:no_founds:1471959819354116287>';
            const badge = canAfford ? '' : '**INSUFICIENTE**';

            const itemInfo =
                `${statusIcon} ${this.getItemEmoji(item.type)} **${item.name.toUpperCase()}**${badge}\n` +
                `\`COSTO:\` ${this.formatCost(item.cost)} **|** ${item.stock === -1
                    ? '`INFINITO` ♾️'
                    : `\`STOCK: ${item.stock}\``
                }\n` +
                `\`DESCRIPCIÓN:\` ${item.description || 'Sin descripción'}`;

            embed.addFields({
                name: '‎',
                value: itemInfo,
                inline: true
            });
        }



        return embed;
    }

    getCategoryName(categoryId) {
        const category = SHOP_CATEGORIES.find(cat => cat.id === categoryId);
        return category ? category.name : 'Todos';
    }

    buildShopComponents(items, category, user) {
        const components = [];
        components.push(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('shop_category_select')
                    .setPlaceholder('Selecciona categoría')
                    .addOptions(
                        SHOP_CATEGORIES.map(cat => ({
                            label: cat.name,
                            value: cat.id,
                            emoji: cat.emoji,
                            default: cat.id === category
                        }))
                    )
            )
        );

        for (let i = 0; i < items.length; i += 5) {
            const rowItems = items.slice(i, i + 5);
            const row = new ActionRowBuilder();

            for (const item of rowItems) {

                const canAfford = this.canUserAfford(user, item.cost);

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`shop_buy_${item._id}`)
                        .setLabel(item.name.slice(0, 10).toUpperCase())
                        .setEmoji(this.getItemEmoji(item.type))
                        .setStyle(canAfford ? ButtonStyle.Secondary : ButtonStyle.Danger)
                        .setDisabled(!canAfford)
                );
            }


            components.push(row);
        }

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('shop_refresh')
                    .setLabel('Refrescar')
                    .setEmoji('<:recargar:1453081355054219486>')
                    .setStyle(ButtonStyle.Secondary)
            )
        );

        return components;
    }

    buildBuyMenu(items) {
        return {
            embeds: [
                new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('<:mercado:1453081092289462353> **Selecciona un Item**')
            ],
            components: [
                new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('shop_select_item')
                        .setPlaceholder('Selecciona un Item')
                        .addOptions(
                            items.map(item => ({
                                label: item.name.slice(0, 25),
                                value: item._id.toString(),
                                emoji: this.getItemEmoji(item.type),
                                description: this.formatCost(item.cost)
                            }))
                        )
                )
            ]
        };
    }

    async processPurchase(interaction, itemId) {

        const user = await UserLevel.findOne({
            guildId: interaction.guild.id,
            userId: interaction.user.id
        });

        const item = await ShopItem.findById(itemId);
        if (!item) return { error: 'El item no existe.' };

        if (item.stock === 0)
            return { error: 'Item agotado.' };

        try {
            await user.purchaseItem(item, 1);
            return { success: item.name };
        } catch (err) {
            return { error: err.message };
        }
    }


    formatCost(cost = {}) {
        const parts = [];
        if (cost.coins > 0) parts.push(`${cost.coins} Coins`);
        if (cost.tokens > 0) parts.push(`${cost.tokens} Tokens`);
        if (cost.xp > 0) parts.push(`${cost.xp} XP`);
        return parts.join(' + ') || 'Gratis';
    }


    getItemEmoji(type) {
        const map = {
            boost_user: '<:destello:1453080731516403773>',
            boost_server: '<:cinta:1453099434908061828>',
            xp: '<:xp:1453078768687255845>',
            role: '<:roles:1453080831609536573>',
            economy: '<:bolsadedinero:1453079730579570931>',
            badge: '<:cajadeentrega:1453099645063532555>',
            title: '<:etiqueta:1453099849355493396>',
            cosmetic: '<:diamante:1453080344810229921>',
            consumable: '<:pocionmagica:1453100161508053052>',
            utility: '<:flujodefondos:1453080009919959112>',
            custom: '<:cajaregistradora:1453079878143574116>',
            permission: "<:debilidad:1465843214358679694>"
        };

        return map[type] ?? '<:cajaregistradora:1453079878143574116>';
    }

    canUserAfford(user, cost = {}) {

        const coinsNeeded = cost.coins || 0;
        const tokensNeeded = cost.tokens || 0;
        const xpNeeded = cost.xp || 0;

        if (user.coins < coinsNeeded) return false;
        if (user.tokens < tokensNeeded) return false;
        if (user.xp < xpNeeded) return false;

        return true;
    }



}
