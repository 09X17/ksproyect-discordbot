import { MessageFlags, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import ShopItem from '../Models/ShopItem.js';
import UserLevel from '../Models/UserLevel.js';


export default async function handleShopInteraction(client, interaction) {
    try {
        if (interaction.isButton()) {

            if (interaction.customId === 'shop_refresh') {
                return await handleRefresh(client, interaction);
            }

            if (interaction.customId.startsWith('shop_buy_')) {
                return await handleBuyButton(client, interaction);
            }

            if (interaction.customId.startsWith('shop_confirm_')) {
                return await handleConfirmPurchase(client, interaction);
            }

            if (interaction.customId === 'shop_cancel_purchase') {
                return await handleCancelPurchase(interaction);
            }
        }
        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'shop_category_select') {
                return await handleCategorySelect(client, interaction);
            }

            if (interaction.customId === 'shop_select_item') {
                return await handleItemSelect(client, interaction);
            }

            if (interaction.customId === 'rankcard_color_select') {
                await interaction.deferUpdate();

                const permissionKey = interaction.values[0];

                const [user, item] = await Promise.all([
                    UserLevel.findOne({
                        guildId: interaction.guild.id,
                        userId: interaction.user.id
                    }),
                    ShopItem.findOne({
                        guildId: interaction.guild.id,
                        'data.permission': permissionKey
                    })
                ]);

                if (!user || !item || !item.data?.hexColor) {
                    await interaction.editReply({
                        content: '❌ Error aplicando el color.',
                        components: []
                    });
                    return true;
                }

                // 🔥 SETEAR COLOR REAL
                user.customization ??= {};
                user.customization.active ??= {};

                user.customization.active.accentColor = item.data.hexColor;

                await user.save();

                await interaction.editReply({
                    content:
                        `🎨 Color aplicado correctamente: **${item.name}**\n` +
                        `HEX: \`${item.data.hexColor}\``,
                    components: []
                });


                return true;
            }
        }

        return false;

    } catch (error) {
        console.error('<:rechazado:1453073959842091008> Error en shop.interactions:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '<:rechazado:1453073959842091008> Ocurrió un error en la tienda.',
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
        }

        return true;
    }
}

async function handleCategorySelect(client, interaction) {
    await safeDefer(interaction);

    const category = interaction.values[0];
    const shopCommand = client.slashCommands.get('shop-items');
    if (!shopCommand) return true;

    const user = await getUser(interaction);
    await shopCommand.renderShop(interaction, user, category);

    return true;
}

async function handleRefresh(client, interaction) {
    await safeDefer(interaction);

    const shopCommand = client.slashCommands.get('shop-items');
    if (!shopCommand) return true;

    const user = await getUser(interaction);
    await shopCommand.renderShop(interaction, user, 'all');

    return true;
}

async function handleBuyButton(client, interaction) {
    await safeDefer(interaction);

    const itemId = interaction.customId.replace('shop_buy_', '');
    const item = await ShopItem.findById(itemId);

    if (!item) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Este item ya no existe.',
            components: []
        });
        return true;
    }

    const embed = new EmbedBuilder()
        .setColor("#A6FFD6")
        .setTitle('<:lascomprasenlinea:1453081533614260307> `CONFIRMAR COMPRA`')
        .setDescription(
            `<:informacion:1456828988361146490> **¿Deseas comprar** \`${item.name.toLocaleUpperCase()}\`?\n` +
            `**\`\`\`PRECIO:\`\`\`** **${item.price}** \`${item.currency.toLocaleUpperCase()}\`\n` +
            `**\`\`\`STOCK:\`\`\`** **${item.stock === -1 ? '\`INFINITO \` <:infinito:1453083165521350776>' : item.stock}**`
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_confirm_${item.id}`)
            .setLabel('Confirmar')
            .setEmoji('<:verificado:1453073955467563008>')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId('shop_cancel_purchase')
            .setLabel('Cancelar')
            .setEmoji('<:rechazado:1453073959842091008>')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    return true;
}

export async function handleConfirmPurchase(client, interaction) {
    await safeDefer(interaction);

    const itemId = interaction.customId.replace('shop_confirm_', '');

    const [item, user] = await Promise.all([
        ShopItem.findById(itemId),
        UserLevel.findOne({
            guildId: interaction.guild.id,
            userId: interaction.user.id
        })
    ]);

    if (!item) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Este item ya no existe.',
            components: []
        });
        return true;
    }

    if (!user) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> No se encontró tu perfil.',
            components: []
        });
        return true;
    }

    if (item.stock !== -1 && item.stock <= 0) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Este item está agotado.',
            components: []
        });
        return true;
    }

    try {
        if (item.type === 'permission' && user.customization?.permissions?.[item.data?.permission]) {
            await interaction.editReply({
                content: '⚠️ Ya tienes este permiso desbloqueado.',
                components: []
            });
            return true;
        }

        const result = await user.purchaseItem(item, 1);

        if (item.stock !== -1) {
            item.stock--;
            await item.save();
        }

        await user.save();

        let extra = '';

        if (result.effects?.coinsGained) {
            extra += `\n<:dinero:1451695904351457330> \`Monedas obtenidas:\` **${result.effects.coinsGained}**`;
        }

        if (result.effects?.tokensGained) {
            extra += `\n<:tokens:1451695903080579192> \`Tokens obtenidos:\` **${result.effects.tokensGained}**`;
        }

        if (result.effects?.xpGained) {
            extra += `\n<:xp:1453078768687255845> \`XP obtenida:\` **${result.effects.xpGained}**`;
        }

        if (result.effects?.permissionGranted) {
            extra += `\n<:permiso:1462284337922707791> \`Permiso desbloqueado:\` **${result.effects.permissionGranted.toUpperCase()}**`;
        }

        if (result.effects?.accentColorApplied) {
            extra += `\n<:paletadecolor:1462503084159664188> \`Color aplicado:\` **${result.effects.accentColorApplied}**`;
        }

        await interaction.editReply({
            content:
                `<:informacion:1456828988361146490> \`COMPRASTE:\` **${item.name}** ` +
                `Por **${item.price} ${item.currency}**.${extra}`,
            embeds: [],
            components: []
        });

    } catch (err) {
        console.error('❌ Error en compra:', err);

        await interaction.editReply({
            content: `<:rechazado:1453073959842091008> ${err.message || 'Error al procesar la compra.'}`,
            components: []
        });
    }

    return true;
}

async function handleCancelPurchase(interaction) {
    await safeDefer(interaction);

    await interaction.editReply({
        content: '<:rechazado:1453073959842091008> Compra cancelada.',
        embeds: [],
        components: []
    });

    return true;
}

async function handleItemSelect(client, interaction) {
    await safeDefer(interaction);

    const shopCommand = client.slashCommands.get('tienda');
    if (!shopCommand) return true;

    const user = await getUser(interaction);
    await shopCommand.renderShop(interaction, user, 'all');

    return true;
}

async function safeDefer(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => { });
    }
}

async function getUser(interaction) {
    let user = await UserLevel.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id
    });

    if (!user) {
        return await client.levelManager.getOrCreateUserLevel(
            interaction.guild.id,
            interaction.user.id
        );
    }

    return user;
}

function hasEnoughCurrency(user, currency, price) {
    switch (currency) {
        case 'coins':
            return user.coins >= price;
        case 'tokens':
            return user.tokens >= price;
        case 'xp':
            return user.totalXP >= price;
        default:
            return false;
    }
}

function subtractCurrency(user, currency, price) {
    switch (currency) {
        case 'coins':
            user.coins -= price;
            break;
        case 'tokens':
            user.tokens -= price;
            break;
        case 'xp':
            user.xp -= price;
            break;
    }
}
