import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import ShopItem from '../Models/ShopItem.js';
import UserLevel from '../Models/UserLevel.js';


export default async function handleShopInteraction(client, interaction) {

    try {

        if (interaction.isButton()) {

            if (interaction.customId === 'shop_refresh')
                return handleRefresh(client, interaction);

            if (interaction.customId.startsWith('shop_buy_'))
                return handleBuyButton(interaction);

            if (interaction.customId.startsWith('shop_confirm_'))
                return handleConfirmPurchase(interaction);

            if (interaction.customId === 'shop_cancel_purchase')
                return handleCancelPurchase(interaction);
        }

        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'shop_category_select')
                return handleCategorySelect(client, interaction);

            if (interaction.customId === 'shop_select_item')
                return handleItemSelect(client, interaction);

            if (interaction.customId === 'rankcard_color_select')
                return handleRankColorSelect(interaction);
        }

        return false;

    } catch (error) {

        console.error('❌ Error en shop.interactions:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocurrió un error en la tienda.',
                ephemeral: true
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

async function handleBuyButton(interaction) {

    await safeDefer(interaction);

    const itemId = interaction.customId.replace('shop_buy_', '');
    const item = await ShopItem.findById(itemId);

    if (!item)
        return interaction.editReply({
            content: '❌ Este item ya no existe.',
            components: []
        });

    const embed = new EmbedBuilder()
        .setColor("#A6FFD6")
        .setTitle('🛒 CONFIRMAR COMPRA')
        .setDescription(
            `¿Deseas comprar **${item.name.toUpperCase()}**?\n\n` +
            `💰 **Costo:** ${formatCost(item.cost)}`
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`shop_confirm_${item.id}`)
            .setLabel('Confirmar')
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId('shop_cancel_purchase')
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    return true;
}


export async function handleConfirmPurchase(interaction) {

    await safeDefer(interaction);

    const itemId = interaction.customId.replace('shop_confirm_', '');

    const [item, user] = await Promise.all([
        ShopItem.findById(itemId),
        UserLevel.findOne({
            guildId: interaction.guild.id,
            userId: interaction.user.id
        })
    ]);

    if (!item)
        return interaction.editReply({
            content: '❌ Este item ya no existe.',
            components: []
        });

    if (!user)
        return interaction.editReply({
            content: '❌ No se encontró tu perfil.',
            components: []
        });

    try {

        if (item.type === 'permission' &&
            user.customization?.permissions?.[item.data?.permission]) {

            return interaction.editReply({
                content: '⚠️ Ya tienes este permiso desbloqueado.',
                components: []
            });
        }

        const result = await user.purchaseItem(item, 1);

        await interaction.editReply({
            content:
                `✅ Compraste **${item.name}**\n` +
                `Costo: ${formatCost(item.cost)}${formatEffects(result.effects)}`,
            components: []
        });

    } catch (err) {

        await interaction.editReply({
            content: `❌ ${err.message || 'Error al procesar la compra.'}`,
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

function formatCost(cost = {}) {

    const parts = [];

    if (cost.coins > 0)
        parts.push(`${cost.coins} 🪙 Coins`);

    if (cost.tokens > 0)
        parts.push(`${cost.tokens} 🎟 Tokens`);

    if (cost.xp > 0)
        parts.push(`${cost.xp} ⭐ XP`);

    return parts.join(' + ') || 'Gratis';
}

function formatEffects(effects = {}) {

    let text = '';

    if (effects.coinsGained)
        text += `\n🪙 Monedas obtenidas: **${effects.coinsGained}**`;

    if (effects.tokensGained)
        text += `\n🎟 Tokens obtenidos: **${effects.tokensGained}**`;

    if (effects.xpGained)
        text += `\n⭐ XP obtenida: **${effects.xpGained}**`;

    if (effects.permissionGranted)
        text += `\n🔓 Permiso desbloqueado: **${effects.permissionGranted}**`;

    if (effects.accentColorApplied)
        text += `\n🎨 Color aplicado: **${effects.accentColorApplied}**`;

    return text;
}
