import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle, AttachmentBuilder
} from 'discord.js';

import ShopItem from '../Models/ShopItem.js';
import UserLevel from '../Models/UserLevel.js';
import { createCanvas } from 'canvas';

function generateAccentColorPurchaseImage(itemName, hexColor) {
    const width = 700;
    const height = 250;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo con gradiente sutil
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#2b2d31');
    bgGradient.addColorStop(1, '#1e1f22');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Patrón de puntos sutiles para textura (opcional)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < width; i += 20) {
        for (let j = 0; j < height; j += 20) {
            ctx.fillRect(i, j, 2, 2);
        }
    }

    // Barra superior con gradiente del color de acento
    const topGradient = ctx.createLinearGradient(0, 0, width, 0);
    topGradient.addColorStop(0, hexColor);
    topGradient.addColorStop(1, adjustBrightness(hexColor, 40));
    ctx.fillStyle = topGradient;
    ctx.fillRect(0, 0, width, 6);

    // Efecto de brillo sutil bajo la barra
    const glowGradient = ctx.createLinearGradient(0, 6, 0, 30);
    glowGradient.addColorStop(0, hexColorToRGBA(hexColor, 0.3));
    glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 6, width, 24);

    // Ícono de checkmark (✓)
    ctx.fillStyle = hexColor;
    ctx.font = 'bold 32px Sans';
    ctx.textAlign = 'left';
    ctx.fillText('✓', 40, 65);

    // Título con sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Sans';
    ctx.fillText('COMPRA EXITOSA', 85, 65);

    // Reset sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Subtítulo
    ctx.fillStyle = '#b5bac1';
    ctx.font = '18px Sans';
    ctx.fillText('Has adquirido:', 40, 105);

    // Nombre del item con color de acento
    ctx.fillStyle = hexColor;
    ctx.font = 'bold 24px Sans';
    ctx.fillText(itemName.toUpperCase(), 40, 135);

    // Contenedor del color con bordes redondeados y sombra
    const boxY = 160;
    const boxHeight = 65;
    const borderRadius = 12;

    // Sombra del contenedor
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 4;

    // Dibuja rectángulo redondeado
    ctx.fillStyle = hexColor;
    roundRect(ctx, 40, boxY, width - 80, boxHeight, borderRadius);

    // Reset sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Gradiente sutil sobre el bloque de color
    const colorBlockGradient = ctx.createLinearGradient(40, boxY, 40, boxY + boxHeight);
    colorBlockGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    colorBlockGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = colorBlockGradient;
    roundRect(ctx, 40, boxY, width - 80, boxHeight, borderRadius);

    // Texto del código HEX
    ctx.fillStyle = getContrastColor(hexColor);
    ctx.font = 'bold 28px Monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hexColor.toUpperCase(), width / 2, boxY + 42);

    // Pequeño label "COLOR"
    ctx.font = '12px Sans';
    ctx.globalAlpha = 0.7;
    ctx.fillText('COLOR', width / 2, boxY + 20);
    ctx.globalAlpha = 1.0;

    return canvas.toBuffer();
}

// Función auxiliar para rectángulos redondeados
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// Ajusta el brillo de un color hex
function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Convierte hex a rgba
function hexColorToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Determina si usar texto blanco o negro según el color de fondo
function getContrastColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
}

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
            components: [],
            embeds: []
        });

    if (!user)
        return interaction.editReply({
            content: '❌ No se encontró tu perfil.',
            components: [],
            embeds: []
        });

    try {

        // Evitar recompra de permiso
        if (
            item.type === 'permission' &&
            user.customization?.permissions?.[item.data?.permission]
        ) {
            return interaction.editReply({
                content: '⚠️ Ya tienes este permiso desbloqueado.',
                components: [],
                embeds: []
            });
        }

        const result = await user.purchaseItem(item, 1);

        /* ==========================================================
           🎨 SI ES PERMISSION CON ACCENT COLOR → GENERAR CANVAS
        ========================================================== */

        if (
            item.type === 'permission' &&
            result.effects?.accentColorApplied
        ) {

            const buffer = generateAccentColorPurchaseImage(
                item.name,
                result.effects.accentColorApplied
            );

            const attachment = new AttachmentBuilder(buffer, {
                name: 'accentcolor.png'
            });

            return interaction.editReply({
                content:
                    `\`COSTO:\` ${formatCost(item.cost)}\n` +
                    `<:paletadecolor:1462503084159664188> | \`SE TE APLICÓ EL COLOR, CORRECTAMENTE\``,
                files: [attachment],
                components: [],
                embeds: []
            });
        }

        await interaction.editReply({
            content:
                `\`COMPRASTE:\` **${item.name}**\n` +
                `\`COSTO:\` ${formatCost(item.cost)}${formatEffects(result.effects)}`,
            components: [],
            embeds: []
        });

    } catch (err) {

        await interaction.editReply({
            content: `❌ ${err.message || 'Error al procesar la compra.'}`,
            components: [],
            embeds: []
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
