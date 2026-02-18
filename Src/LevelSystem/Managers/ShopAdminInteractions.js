import {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    EmbedBuilder
} from 'discord.js';

import crypto from 'crypto';
import ShopItem from '../Models/ShopItem.js';
import ShopConfig from '../Models/ShopConfig.js';

const USER_SESSIONS = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [userId, session] of USER_SESSIONS.entries()) {
        if (now - session.timestamp > 1000 * 60 * 10) {
            USER_SESSIONS.delete(userId);
        }
    }
}, 1000 * 60 * 5);

const shortId = () => crypto.randomBytes(5).toString('hex');
const safe = (v, max) => String(v ?? '').slice(0, max);

async function sendLog(interaction, embed) {
    const config = await ShopConfig.findOne({ guildId: interaction.guild.id });
    if (!config?.logChannelId) return;

    const channel = interaction.guild.channels.cache.get(config.logChannelId);
    if (!channel) return;

    channel.send({ embeds: [embed] }).catch(() => { });
}

function saveUserSession(userId, sid, itemId = null, action = 'edit') {
    USER_SESSIONS.set(userId, {
        sid,
        itemId,
        action,
        timestamp: Date.now()
    });
}

function getUserSession(userId) {
    return USER_SESSIONS.get(userId);
}

function formatCost(cost = {}) {
    const parts = [];
    if (cost.coins > 0) parts.push(`${cost.coins} Coins`);
    if (cost.tokens > 0) parts.push(`${cost.tokens} Tokens`);
    if (cost.xp > 0) parts.push(`${cost.xp} XP`);
    return parts.join(' + ') || 'Gratis';
}

// ===================================================
// MODAL BUILDERS
// ===================================================
function buildBasicModal(customId, title, item = {}) {

    const cost = item.cost || {};

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(String(title).slice(0, 45))
        .addComponents(

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Nombre')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(safe(item.name, 100))
            ),

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('description')
                    .setLabel('Descripción')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(false)
                    .setValue(safe(item.description, 200))
            ),

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('cost_coins')
                    .setLabel('Costo en Coins')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(cost.coins ? String(cost.coins) : '0')
            ),

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('cost_tokens')
                    .setLabel('Costo en Tokens')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(cost.tokens ? String(cost.tokens) : '0')
            ),

            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('type')
                    .setLabel('Tipo de item')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(safe(item.type, 30) || 'custom')
                    .setMaxLength(30)
            )
        );
}

function buildBoostModal(customId, item = {}) {
    const itemName = item.name ? String(item.name).slice(0, 30) : 'Boost';
    const modalTitle = `Editar Boost: ${itemName}`.slice(0, 45);

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(modalTitle)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('duration')
                    .setLabel('Duración (segundos)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(item.data?.duration ? String(item.data.duration) : '3600')
                    .setMaxLength(10)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('multiplier')
                    .setLabel('Multiplicador')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(item.data?.multiplier ? String(item.data.multiplier) : '1.0')
                    .setMaxLength(5)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('stackable')
                    .setLabel('Stackable (true/false)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(item.data?.stackable ? 'true' : 'false')
                    .setMaxLength(5)
            )
        );
}

function buildStockModal(customId, item = {}) {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Editar Stock')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('stock')
                    .setLabel('Stock (-1 = infinito)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(
                        item.stock !== undefined ? String(item.stock) : '-1'
                    )
                    .setMaxLength(10)
            )
        );
}

function buildEconomyModal(customId, item = {}) {
    const itemName = item.name ? String(item.name).slice(0, 30) : 'Monedas';
    const modalTitle = `Editar Economía: ${itemName}`.slice(0, 45);

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(modalTitle)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('coinsAmount')
                    .setLabel('Cantidad de monedas')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(item.data?.coinsAmount ? String(item.data.coinsAmount) : '0')
                    .setMaxLength(10)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('tokensAmount')
                    .setLabel('Cantidad de tokens')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(item.data?.tokensAmount ? String(item.data.tokensAmount) : '0')
                    .setMaxLength(10)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('xpAmount')
                    .setLabel('Cantidad de XP')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setValue(item.data?.xpAmount ? String(item.data.xpAmount) : '0')
                    .setMaxLength(10)
            )
        );
}

function buildPermissionModal(customId, item = {}) {
    const modalTitle = `Permiso del Item`.slice(0, 45);

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(modalTitle)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('permission')
                    .setLabel('Permiso (ej: rank_color_red)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(item.data?.permission ?? '')
                    .setMaxLength(50)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('color')
                    .setLabel('🎨 Color HEX')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setPlaceholder('#ff0000')
                    .setValue(item.data?.color ?? '')
                    .setMaxLength(7)
            )
        );
}

function buildToolModal(customId, item = {}) {

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle('Configurar Herramienta')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('toolId')
                    .setLabel('ID de herramienta (toolsConfig)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setValue(item.data?.toolId ?? '')
                    .setPlaceholder('wooden_pickaxe')
            )
        );
}


// ===================================================
// MAIN HANDLER
// ===================================================
export default async function ShopAdminInteractions(client, interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // --------------------------
    // CREAR ITEM
    // --------------------------
    if (interaction.isButton() && interaction.customId === 'shopadmin_create_item') {
        const sid = shortId();

        // Guardar sesión para CREAR nuevo item
        saveUserSession(userId, sid, null, 'create');

        return interaction.showModal(buildBasicModal(
            `shopadmin_modal_${sid}`,
            'Crear Nuevo Item'
        ));
    }

    // --------------------------
    // EDITAR ITEM (SELECT)
    // --------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === 'shopadmin_items_menu') {
        const itemId = interaction.values[0];
        const item = await ShopItem.findById(itemId);

        if (!item) {
            return interaction.reply({
                content: '❌ Item no encontrado',
                flags: 64
            });
        }

        const sid = shortId();
        saveUserSession(userId, sid, itemId, 'edit');

        const buttons = [];

        // 📝 Info básica (todos)
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`shopadmin_basic_${sid}`)
                .setLabel('📝 Información')
                .setStyle(ButtonStyle.Secondary)
        );

        // 📦 Stock (todos)
        buttons.push(
            new ButtonBuilder()
                .setCustomId(`shopadmin_stock_${sid}`)
                .setLabel('Stock')
                .setEmoji('<:enstock:1453079336683835575>')
                .setStyle(ButtonStyle.Secondary)
        );

        // ⚡ Boost (solo boosts)
        if (item.type === 'boost_user' || item.type === 'boost_server') {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shopadmin_boost_${sid}`)
                    .setLabel('⚡ Boost')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        // 💰 Economy (solo economy)
        if (item.type === 'economy') {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shopadmin_economy_${sid}`)
                    .setLabel('💰 Economía')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        if (item.type === 'permission') {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shopadmin_permission_${sid}`)
                    .setLabel('🎨 Permiso')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        // 🛠 Tool (solo tools)
        if (item.type === 'tool') {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`shopadmin_tool_${sid}`)
                    .setLabel('🛠 Herramienta')
                    .setStyle(ButtonStyle.Primary)
            );
        }


        return interaction.reply({
            content: `🛠️ **${item.name}** seleccionado. ¿Qué deseas editar?`,
            components: [
                new ActionRowBuilder().addComponents(buttons)
            ],
            flags: 64
        });
    }

    // --------------------------
    // BOTONES DE BOOST
    // --------------------------
    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_boost_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada. Selecciona el item nuevamente.',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(buildBoostModal(
            `shopadmin_modal_${sid}`,
            item
        ));
    }

    // --------------------------
    // BOTONES DE BASIC
    // --------------------------
    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_basic_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada. Selecciona el item nuevamente.',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(buildBasicModal(
            `shopadmin_modal_${sid}`,
            `Editar: ${item.name}`,
            item
        ));
    }

    // --------------------------
    // BOTONES DE ECONOMY
    // --------------------------
    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_economy_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada. Selecciona el item nuevamente.',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(buildEconomyModal(
            `shopadmin_economy_modal_${sid}`,
            item
        ));
    }

    // --------------------------
    // SUBMIT DE MODALES
    // --------------------------
    if (interaction.isModalSubmit() &&
        interaction.customId.startsWith('shopadmin_modal_')) {

        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        // Verificar sesión válida
        if (!session || session.sid !== sid) {
            return interaction.reply({
                content: '❌ Sesión expirada. Por favor, intenta nuevamente.',
                flags: 64
            });
        }

        const { itemId, action } = session;

        let item;

        /* =========================
           CREAR O EDITAR
        ========================= */

        if (action === 'create') {

            item = new ShopItem({
                guildId,
                name: 'Nuevo Item',
                description: '',
                type: 'custom',
                category: 'general',
                cost: { coins: 0, tokens: 0, xp: 0 },
                stock: -1,
                data: {},
                active: true
            });

        } else if (action === 'edit' && itemId) {

            item = await ShopItem.findById(itemId);

            if (!item) {
                return interaction.reply({
                    content: '❌ Item no encontrado',
                    flags: 64
                });
            }

        } else {

            return interaction.reply({
                content: '❌ Error en la sesión',
                flags: 64
            });
        }

        const fields = interaction.fields.fields;

        /* =========================
           CAMPOS BÁSICOS
        ========================= */

        try {
            const name = fields.get('name')?.value;
            if (name !== undefined) item.name = name;
        } catch (e) { }

        try {
            const description = fields.get('description')?.value;
            if (description !== undefined) item.description = description;
        } catch (e) { }

        /* =========================
           COSTO MULTI-MONEDA
        ========================= */

        try {

            const costCoins = Number(fields.get('cost_coins')?.value || 0);
            const costTokens = Number(fields.get('cost_tokens')?.value || 0);
            const costXP = Number(fields.get('cost_xp')?.value || 0);

            if (costCoins < 0 || costTokens < 0 || costXP < 0) {
                return interaction.reply({
                    content: '❌ El costo no puede ser negativo.',
                    flags: 64
                });
            }

            item.cost = {
                coins: costCoins,
                tokens: costTokens,
                xp: costXP
            };

        } catch (e) { }

        /* =========================
           TIPO + CATEGORÍA
        ========================= */

        try {

            const rawType = fields.get('type')?.value;

            if (rawType !== undefined) {

                const normalizedType = rawType.toLowerCase().trim();

                const TYPE_MAP = {
                    cosmetics: 'cosmetic',
                    cosmetic: 'cosmetic',

                    consumables: 'consumable',
                    consumable: 'consumable',

                    utilities: 'utility',
                    utility: 'utility',

                    roles: 'role',
                    role: 'role',

                    boosts_user: 'boost_user',
                    boost_user: 'boost_user',

                    boosts_server: 'boost_server',
                    boost_server: 'boost_server',

                    economy: 'economy',
                    coins: 'economy',
                    tokens: 'economy',

                    xp: 'xp',
                    badge: 'badge',
                    title: 'title',

                    permission: 'permission',
                    custom: 'custom',
                    tool: 'tool',
                    tools: 'tool',

                };

                item.type = TYPE_MAP[normalizedType] ?? 'custom';

                const CATEGORY_MAP = {
                    cosmetic: 'cosmetic',
                    consumable: 'consumables',
                    utility: 'utilities',
                    role: 'roles',
                    boost_user: 'boosts_user',
                    boost_server: 'boosts_server',
                    xp: 'xp',
                    badge: 'general',
                    title: 'general',
                    economy: 'economy',
                    permission: 'permission',
                    custom: 'general',
                    tool: 'tool',

                };

                item.category = CATEGORY_MAP[item.type] ?? 'general';
            }

        } catch (e) { }

        /* =========================
           CAMPOS DE BOOST
        ========================= */

        try {
            const duration = fields.get('duration')?.value;
            if (duration !== undefined) {
                item.data ??= {};
                item.data.duration = Number(duration) || 3600;
            }
        } catch (e) { }

        try {
            const multiplier = fields.get('multiplier')?.value;
            if (multiplier !== undefined) {
                item.data ??= {};
                item.data.multiplier = Number(multiplier) || 1.0;
            }
        } catch (e) { }

        try {
            const stackable = fields.get('stackable')?.value;
            if (stackable !== undefined) {
                item.data ??= {};
                item.data.stackable = stackable === 'true';
            }
        } catch (e) { }

        /* =========================
           GUARDAR
        ========================= */

        await item.save();

        /* =========================
           LOG
        ========================= */

        const formatCost = (cost = {}) => {
            const parts = [];
            if (cost.coins > 0) parts.push(`${cost.coins} Coins`);
            if (cost.tokens > 0) parts.push(`${cost.tokens} Tokens`);
            if (cost.xp > 0) parts.push(`${cost.xp} XP`);
            return parts.join(' + ') || 'Gratis';
        };

        await sendLog(interaction,
            new EmbedBuilder()
                .setColor(action === 'create' ? '#3498db' : '#2ECC71')
                .setTitle(action === 'create'
                    ? '📦 Item creado'
                    : '✏️ Item editado')
                .addFields(
                    { name: 'Item', value: item.name, inline: true },
                    { name: 'Tipo', value: item.type, inline: true },
                    { name: 'Costo', value: formatCost(item.cost), inline: true },
                    { name: 'Admin', value: interaction.user.tag }
                )
                .setTimestamp()
        );

        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content:
                `✅ Item **${item.name}** ` +
                `${action === 'create' ? 'creado' : 'actualizado'} correctamente.`,
            flags: 64
        });
    }

    // --------------------------
    // STOCK MODAL HANDLING
    // --------------------------
    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_stock_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(
            buildStockModal(`shopadmin_stock_modal_${sid}`, item)
        );
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('shopadmin_stock_modal_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const stockValue = interaction.fields.getTextInputValue('stock');
        const stock = Number(stockValue);

        if (Number.isNaN(stock) || stock < -1) {
            return interaction.reply({
                content: '❌ Stock inválido. Usa -1 o un número ≥ 0',
                flags: 64
            });
        }

        await ShopItem.findByIdAndUpdate(session.itemId, {
            stock
        });

        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content: `📦 Stock actualizado a **${stock === -1 ? 'Infinito ♾️' : stock}**`,
            flags: 64
        });
    }

    // --------------------------
    // ECONOMY MODAL HANDLING
    // --------------------------
    if (interaction.isModalSubmit() && interaction.customId.startsWith('shopadmin_economy_modal_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) {
            return interaction.reply({
                content: '❌ Item no encontrado',
                flags: 64
            });
        }

        const fields = interaction.fields.fields;

        // Actualizar datos de economía
        try {
            const coinsAmount = fields.get('coinsAmount')?.value;
            if (coinsAmount !== undefined) {
                if (!item.data) item.data = {};
                item.data.coinsAmount = Number(coinsAmount) || 0;
            }
        } catch (e) { }

        try {
            const tokensAmount = fields.get('tokensAmount')?.value;
            if (tokensAmount !== undefined) {
                if (!item.data) item.data = {};
                item.data.tokensAmount = Number(tokensAmount) || 0;
            }
        } catch (e) { }

        try {
            const xpAmount = fields.get('xpAmount')?.value;
            if (xpAmount !== undefined) {
                if (!item.data) item.data = {};
                item.data.xpAmount = Number(xpAmount) || 0;
            }
        } catch (e) { }

        await item.save();

        // Enviar log
        await sendLog(interaction, new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('💰 Datos de economía actualizados')
            .addFields(
                { name: 'Item', value: item.name, inline: true },
                { name: 'Monedas', value: `${item.data?.coinsAmount || 0}`, inline: true },
                { name: 'Tokens', value: `${item.data?.tokensAmount || 0}`, inline: true },
                { name: 'XP', value: `${item.data?.xpAmount || 0}`, inline: true },
                { name: 'Admin', value: interaction.user.tag, inline: false }
            )
            .setTimestamp()
        );

        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content: `💰 Datos de economía actualizados para **${item.name}**`,
            flags: 64
        });
    }

    // --------------------------
    // ROLE SELECT (para items de tipo role)
    // --------------------------
    if (interaction.isRoleSelectMenu() && interaction.customId.startsWith('shopadmin_role_')) {
        const sid = interaction.customId.replace('shopadmin_role_', '');
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const roleId = interaction.values[0];
        await ShopItem.findByIdAndUpdate(session.itemId, {
            'data.roleId': roleId
        });

        // Limpiar sesión
        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content: `✅ Rol asignado correctamente al item.`,
            flags: 64
        });
    }


    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_permission_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(
            buildPermissionModal(`shopadmin_permission_modal_${sid}`, item)
        );
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('shopadmin_permission_modal_')) {
        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const permission = interaction.fields.getTextInputValue('permission')?.trim();
        const hexColor = interaction.fields.getTextInputValue('color')?.trim();  // ← Renombrado a hexColor

        // Validar HEX si existe
        if (hexColor && !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
            return interaction.reply({
                content: '❌ El color debe ser un HEX válido (ej: #ff0000)',
                flags: 64
            });
        }

        const update = {
            'data.permission': permission
        };

        // 🔥 CAMBIO CRÍTICO: usar hexColor en lugar de color
        if (hexColor) {
            update['data.hexColor'] = hexColor;  // ← CAMBIO AQUÍ
        } else {
            update['data.hexColor'] = undefined;
        }

        await ShopItem.findByIdAndUpdate(session.itemId, update);

        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content:
                `🎨 Permiso actualizado correctamente.\n` +
                `**Permiso:** \`${permission}\`\n` +
                (hexColor ? `**Color:** \`${hexColor}\`` : '⚪ Sin color asignado'),
            flags: 64
        });
    }

    if (interaction.isButton() && interaction.customId.startsWith('shopadmin_tool_')) {

        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const item = await ShopItem.findById(session.itemId);
        if (!item) return;

        return interaction.showModal(
            buildToolModal(`shopadmin_tool_modal_${sid}`, item)
        );
    }

    if (interaction.isModalSubmit() &&
        interaction.customId.startsWith('shopadmin_tool_modal_')) {

        const sid = interaction.customId.split('_').pop();
        const session = getUserSession(userId);

        if (!session || session.sid !== sid || !session.itemId) {
            return interaction.reply({
                content: '❌ Sesión expirada',
                flags: 64
            });
        }

        const toolId = interaction.fields.getTextInputValue('toolId')?.trim();

        if (!toolId) {
            return interaction.reply({
                content: '❌ Debes indicar un toolId válido',
                flags: 64
            });
        }

        await ShopItem.findByIdAndUpdate(session.itemId, {
            type: 'tool',
            category: 'utilities',
            'data.toolId': toolId
        });

        USER_SESSIONS.delete(userId);

        return interaction.reply({
            content: `🛠 Herramienta configurada correctamente.\nToolID: \`${toolId}\``,
            flags: 64
        });
    }



    return false;
}