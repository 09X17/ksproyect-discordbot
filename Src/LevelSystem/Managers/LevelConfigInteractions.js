import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder,
    MessageFlags,
    EmbedBuilder
} from 'discord.js';

import GuildConfigLevel from '../Models/GuildConfig.js';
import {
    buildMainPanel,
    buildSecondaryPanel,
    buildSinglePanel
} from './LevelPanelBuilder.js'; // Ajusta la ruta

/* ============================================================
   🧠 HELPERS
============================================================ */


const num = v => Number(v);
const bool = v => v === 'true';
const userPanels = new Map();
const getTipoNombre = (tipo) => {
    const tipos = {
        'xp_multiplier': 'Multiplicador de XP',
        'coin_multiplier': 'Multiplicador de Monedas',
        'token_bonus': 'Bonus de Tokens',
        'sale': 'Rebajas en Tienda',
        'custom': 'Personalizado'
    };
    return tipos[tipo] || tipo;
};


const row = (...c) => new ActionRowBuilder().addComponents(...c);

const short = (id, label, value = '', required = false) =>
    new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(TextInputStyle.Short)
        .setRequired(required)
        .setValue(String(value ?? ''));

const paragraph = (id, label, value = '', required = false) =>
    new TextInputBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(required)
        .setValue(String(value ?? ''));

/* ============================================================
   🧾 MODALES
============================================================ */

// XP por mensajes
const messageXPModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_message_xp')
        .setTitle('XP por mensajes')
        .addComponents(
            row(short('min', 'XP mínimo', cfg.levelSettings.messageXP.min, true)),
            row(short('max', 'XP máximo', cfg.levelSettings.messageXP.max, true)),
            row(short('cooldown', 'Cooldown (seg)', cfg.levelSettings.messageXP.cooldown, true))
        );

// XP por voz
const voiceXPModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_voice_xp')
        .setTitle('XP por voz')
        .addComponents(
            row(short('perMinute', 'XP por minuto', cfg.levelSettings.voiceXP.perMinute, true)),
            row(short('interval', 'Intervalo (min)', cfg.levelSettings.voiceXP.interval, true)),
            row(short('maxPerSession', 'Máx sesión', cfg.levelSettings.voiceXP.maxPerSession, true))
        );

// Curva de niveles
const curveModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_curve')
        .setTitle('Curva de niveles')
        .addComponents(
            row(short('baseXP', 'XP base', cfg.levelSettings.baseXP, true)),
            row(short('growthRate', 'Growth rate', cfg.levelSettings.growthRate, true))
        );

// Límites diarios
const limitsModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_limits')
        .setTitle('Límites diarios')
        .addComponents(
            row(short('maxDailyXP', 'XP máximo diario', cfg.levelSettings.maxDailyXP, true)),
            row(short('maxMessagesPerDay', 'Mensajes diarios', cfg.levelSettings.maxMessagesPerDay, true))
        );

// Mensaje de texto para level up
const levelUpTextModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_levelup_text')
        .setTitle('Mensaje de subida (texto)')
        .addComponents(
            row(paragraph(
                'message',
                'Mensaje (usa {user}, {level}, \\n)',
                cfg.notifications.levelUpMessage,
                true
            ))
        );

// Embed para level up
const levelUpEmbedModal = cfg =>
    new ModalBuilder()
        .setCustomId('lvl_modal_levelup_embed')
        .setTitle('Embed de subida')
        .addComponents(
            row(short('title', 'Título', cfg.notifications.levelUpEmbed.title, false)),
            row(paragraph('description', 'Descripción', cfg.notifications.levelUpEmbed.description, false)),
            row(short('color', 'Color HEX', cfg.notifications.levelUpEmbed.color, false)),
            row(short('footer', 'Footer', cfg.notifications.levelUpEmbed.footer, false)),
            row(short('image', 'URL Imagen', cfg.notifications.levelUpEmbed.image || '', false))
        );

// Añadir campo al embed
const embedFieldModal = () =>
    new ModalBuilder()
        .setCustomId('lvl_modal_embed_field')
        .setTitle('Añadir campo al embed')
        .addComponents(
            row(short('name', 'Nombre', '', true)),
            row(paragraph('value', 'Valor', '', true)),
            row(short('inline', 'Inline? (true/false)', 'false', false))
        );

// Multiplicador de canal
const channelMultiplierModal = () =>
    new ModalBuilder()
        .setCustomId('lvl_modal_channel_mult')
        .setTitle('Multiplicador de canal')
        .addComponents(
            row(short('channelId', 'ID del canal', '', true)),
            row(short('multiplier', 'Multiplicador (ej: 2.0)', '', true))
        );

// Multiplicador de rol
const roleMultiplierModal = () =>
    new ModalBuilder()
        .setCustomId('lvl_modal_role_mult')
        .setTitle('Multiplicador de rol')
        .addComponents(
            row(short('roleId', 'ID del rol', '', true)),
            row(short('multiplier', 'Multiplicador (ej: 1.5)', '', true))
        );

// Penalización de rol
const penaltyRoleModal = () =>
    new ModalBuilder()
        .setCustomId('lvl_modal_penalty_role')
        .setTitle('Penalización de rol')
        .addComponents(
            row(short('roleId', 'ID del rol', '', true)),
            row(short('multiplier', 'Multiplicador (0.0-1.0)', '0.5', true))
        );

// Añadir exclusión
const exclusionModal = () =>
    new ModalBuilder()
        .setCustomId('lvl_modal_exclusion')
        .setTitle('Añadir exclusión')
        .addComponents(
            row(short('type', 'Tipo (channel/role)', '', true)),
            row(short('id', 'ID', '', true))
        );

/* ============================================================
   🎛️ MENUS
============================================================ */

const notificationTypeMenu = cfg =>
    row(
        new StringSelectMenuBuilder()
            .setCustomId('lvl_notify_type_menu')
            .setPlaceholder('Tipo de notificación')
            .addOptions([
                {
                    label: 'Mensaje texto',
                    value: 'text',
                    default: cfg.notifications.levelUpType === 'text'
                },
                {
                    label: 'Mensaje embed',
                    value: 'embed',
                    default: cfg.notifications.levelUpType === 'embed'
                }
            ])
    );

/* ============================================================
   🎯 MAIN HANDLER
============================================================ */

export default async function LevelConfigInteractions(client, interaction) {
    if (!interaction.guild) return false;

    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const config = await GuildConfigLevel.findOneAndUpdate(
        { guildId },
        {},
        { upsert: true, new: true }
    );

    const clearCache = () => {
        if (client.levelManager && client.levelManager.clearCache) {
            client.levelManager.clearCache(guildId);
            console.log(`✅ Caché limpiada para ${guildId}`);
        }
    };

    if (interaction.isCommand() && interaction.commandName === 'levels-admin-config') {
        const subcommand = interaction.options.getSubcommand();

        // Si el subcomando es "panel", muestra el panel
        if (subcommand === 'panel') {
            await interaction.reply({
                content: '🛠️ **Panel del sistema de niveles**\n' +
                    `Estado: **${config.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}**\n` +
                    '`Configuración completa del sistema`',
                components: buildSinglePanel(config),
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
        // Si no es "panel", deja que el comando normal lo maneje
        return false;
    }


    // 🎯 HANDLERS DE PAGINACIÓN (si usas paginación)
    if (interaction.isButton() && interaction.customId === 'page_next') {
        setUserPanel(userId, { page: 2, guildId });

        await interaction.update({
            content: '🛠️ **Panel del sistema de niveles**\n' +
                `Estado: **${config.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}**\n` +
                '`Página 2/2 - Configuración avanzada`',
            components: buildSecondaryPanel(config)
        });
        return true;
    }

    if (interaction.isButton() && interaction.customId === 'page_prev') {
        setUserPanel(userId, { page: 1, guildId });

        await interaction.update({
            content: '🛠️ **Panel del sistema de niveles**\n' +
                `Estado: **${config.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}**\n` +
                '`Página 1/2 - Configuración principal`',
            components: buildMainPanel(config)
        });
        return true;
    }

    /* ===============================
       🔘 TOGGLE SISTEMA
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_toggle') {
        config.enabled = !config.enabled;
        await config.save();
        clearCache();

        await interaction.reply({
            content: `Sistema ${config.enabled ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       💬 XP MENSAJES
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_xp_messages') {
        await interaction.showModal(messageXPModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_message_xp') {
        config.levelSettings.messageXP.min = num(interaction.fields.getTextInputValue('min'));
        config.levelSettings.messageXP.max = num(interaction.fields.getTextInputValue('max'));
        config.levelSettings.messageXP.cooldown = num(interaction.fields.getTextInputValue('cooldown'));
        await config.save();
        clearCache();

        await interaction.reply({ content: '✅ XP por mensajes actualizado', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       🎤 XP VOZ
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_xp_voice') {
        await interaction.showModal(voiceXPModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_voice_xp') {
        config.levelSettings.voiceXP.perMinute = num(interaction.fields.getTextInputValue('perMinute'));
        config.levelSettings.voiceXP.interval = num(interaction.fields.getTextInputValue('interval'));
        config.levelSettings.voiceXP.maxPerSession = num(interaction.fields.getTextInputValue('maxPerSession'));
        await config.save();
        clearCache();

        await interaction.reply({ content: '🎙️ Voice XP actualizado', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       📈 CURVA
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_curve') {
        await interaction.showModal(curveModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_curve') {
        config.levelSettings.baseXP = num(interaction.fields.getTextInputValue('baseXP'));
        config.levelSettings.growthRate = num(interaction.fields.getTextInputValue('growthRate'));
        await config.save();
        clearCache();

        await interaction.reply({ content: '📈 Curva actualizada', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       📩 LÍMITES DIARIOS
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_limits_daily') {
        await interaction.showModal(limitsModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_limits') {
        config.levelSettings.maxDailyXP = num(interaction.fields.getTextInputValue('maxDailyXP'));
        config.levelSettings.maxMessagesPerDay = num(interaction.fields.getTextInputValue('maxMessagesPerDay'));
        await config.save();
        clearCache();

        await interaction.reply({ content: '📩 Límites actualizados', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       🔔 TOGGLE NOTIFICACIONES
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notify_toggle') {
        config.notifications.levelUpDM = !config.notifications.levelUpDM;
        await config.save();
        clearCache();

        await interaction.reply({
            content: `Notificaciones DM ${config.notifications.levelUpDM ? '🟢 ACTIVADAS' : '🔴 DESACTIVADAS'}`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       📝 TIPO DE NOTIFICACIÓN
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notify_type') {
        await interaction.reply({
            content: 'Selecciona el tipo de notificación:',
            components: [notificationTypeMenu(config)],
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'lvl_notify_type_menu') {
        config.notifications.levelUpType = interaction.values[0];
        await config.save();
        clearCache();

        await interaction.update({
            content: `Tipo cambiado a **${interaction.values[0]}**`,
            components: [],
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       ✏️ MENSAJE TEXTO
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notify_text') {
        await interaction.showModal(levelUpTextModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_levelup_text') {
        config.notifications.levelUpMessage = interaction.fields.getTextInputValue('message');
        await config.save();
        clearCache();

        await interaction.reply({ content: '📝 Mensaje actualizado', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       🎨 CONFIG EMBED
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notify_embed') {
        await interaction.showModal(levelUpEmbedModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_levelup_embed') {
        config.notifications.levelUpEmbed.title = interaction.fields.getTextInputValue('title') || config.notifications.levelUpEmbed.title;
        config.notifications.levelUpEmbed.description = interaction.fields.getTextInputValue('description') || config.notifications.levelUpEmbed.description;
        config.notifications.levelUpEmbed.color = interaction.fields.getTextInputValue('color') || config.notifications.levelUpEmbed.color;
        config.notifications.levelUpEmbed.footer = interaction.fields.getTextInputValue('footer') || config.notifications.levelUpEmbed.footer;
        config.notifications.levelUpEmbed.image = interaction.fields.getTextInputValue('image') || null;
        await config.save();
        clearCache();

        await interaction.reply({ content: '🖼️ Embed actualizado', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       ➕ AÑADIR CAMPO EMBED
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_embed_add_field') {
        await interaction.showModal(embedFieldModal());
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_embed_field') {
        if (!config.notifications.levelUpEmbed.fields) {
            config.notifications.levelUpEmbed.fields = [];
        }

        config.notifications.levelUpEmbed.fields.push({
            name: interaction.fields.getTextInputValue('name'),
            value: interaction.fields.getTextInputValue('value'),
            inline: interaction.fields.getTextInputValue('inline') === 'true'
        });
        await config.save();
        clearCache();

        await interaction.reply({ content: '➕ Campo añadido', flags: MessageFlags.Ephemeral });
        return true;
    }

    /* ===============================
       🗑️ ELIMINAR CAMPO EMBED
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_embed_remove_field') {
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_remove_field')
            .setTitle('Eliminar campo del embed')
            .addComponents(
                row(short('index', 'Índice del campo (0, 1, 2...)', '0', true))
            );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_remove_field') {
        const index = parseInt(interaction.fields.getTextInputValue('index'));

        if (!config.notifications.levelUpEmbed.fields ||
            index < 0 ||
            index >= config.notifications.levelUpEmbed.fields.length) {
            await interaction.reply({
                content: '❌ Índice inválido',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        config.notifications.levelUpEmbed.fields.splice(index, 1);
        await config.save();
        clearCache();

        await interaction.reply({
            content: `🗑️ Campo ${index} eliminado`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       📍 CANAL DE NOTIFICACIONES
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notif_channel') {
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_notif_channel')
            .setTitle('Canal de notificaciones')
            .addComponents(
                row(short('channelId', 'ID del canal', config.notifications.levelUpChannel || '', false))
            );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_notif_channel') {
        const channelId = interaction.fields.getTextInputValue('channelId');

        config.notifications.levelUpChannel = channelId || null;
        await config.save();
        clearCache();

        await interaction.reply({
            content: channelId
                ? `📍 Canal establecido: <#${channelId}>`
                : '📍 Canal de notificaciones removido',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       ⚡ MULTIPLICADORES DE CANAL
    =============================== */

    /* ===============================
   ⚡ MULTIPLICADORES DE CANAL Y ROL
=============================== */

    // MENÚ PRINCIPAL DE MULTIPLICADORES
    if (interaction.isButton() && interaction.customId === 'level_multipliers') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('lvl_mult_select')
            .setPlaceholder('Selecciona tipo de multiplicador')
            .addOptions([
                { label: '➕ Añadir canal', value: 'add_channel' },
                { label: '➖ Quitar canal', value: 'remove_channel' },
                { label: '➕ Añadir rol', value: 'add_role' },
                { label: '➖ Quitar rol', value: 'remove_role' }
            ]);

        await interaction.reply({
            content: '⚡ **Gestión de Multiplicadores**',
            components: [row(selectMenu)],
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    // HANDLER DEL SELECT MENU
    if (interaction.isStringSelectMenu() && interaction.customId === 'lvl_mult_select') {
        const action = interaction.values[0];

        if (action === 'add_channel' || action === 'add_role') {
            const modal = new ModalBuilder()
                .setCustomId(`lvl_modal_mult_${action}`)
                .setTitle(action.includes('channel') ? 'Añadir multiplicador de canal' : 'Añadir multiplicador de rol')
                .addComponents(
                    row(short(
                        'id',
                        action.includes('channel') ? 'ID del canal' : 'ID del rol',
                        '123456789012345678',
                        true
                    )),
                    row(short('multiplier', 'Multiplicador (ej: 2.0)', '1.5', true))
                );

            await interaction.showModal(modal);
        } else {
            const modal = new ModalBuilder()
                .setCustomId(`lvl_modal_mult_${action}`)
                .setTitle(action.includes('channel') ? 'Quitar multiplicador de canal' : 'Quitar multiplicador de rol')
                .addComponents(
                    row(short(
                        'id',
                        action.includes('channel') ? 'ID del canal' : 'ID del rol',
                        '123456789012345678',
                        true
                    ))
                );

            await interaction.showModal(modal);
        }
        return true;
    }

    // HANDLERS DE MODALES
    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_mult_add_channel') {
        const channelId = interaction.fields.getTextInputValue('id');
        const multiplier = parseFloat(interaction.fields.getTextInputValue('multiplier'));

        await config.addChannelMultiplier(channelId, multiplier);

        await interaction.reply({
            content: `⚡ Multiplicador del canal <#${channelId}> establecido a ${multiplier}x`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_mult_remove_channel') {
        const channelId = interaction.fields.getTextInputValue('id');

        await config.removeChannelMultiplier(channelId);

        await interaction.reply({
            content: `✅ Multiplicador del canal <#${channelId}> eliminado`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_mult_add_role') {
        const roleId = interaction.fields.getTextInputValue('id');
        const multiplier = parseFloat(interaction.fields.getTextInputValue('multiplier'));

        await config.addBoostRole(roleId, multiplier);

        await interaction.reply({
            content: `⚡ Multiplicador del rol <@&${roleId}> establecido a ${multiplier}x`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_mult_remove_role') {
        const roleId = interaction.fields.getTextInputValue('id');

        await config.removeBoostRole(roleId);

        await interaction.reply({
            content: `✅ Multiplicador del rol <@&${roleId}> eliminado`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }


    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_channel_mult') {
        const channelId = interaction.fields.getTextInputValue('channelId');
        const multiplier = num(interaction.fields.getTextInputValue('multiplier'));

        await config.addChannelMultiplier(channelId, multiplier);

        await interaction.reply({
            content: `⚡ Multiplicador de canal <#${channelId}> establecido a ${multiplier}x`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_role_mult') {
        const roleId = interaction.fields.getTextInputValue('roleId');
        const multiplier = num(interaction.fields.getTextInputValue('multiplier'));

        await config.addBoostRole(roleId, multiplier);

        await interaction.reply({
            content: `⚡ Multiplicador de rol <@&${roleId}> establecido a ${multiplier}x`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🚫 EXCLUSIONES XP
    =============================== */

    /* ========= BOTÓN → SELECT ========= */
    if (interaction.isButton() && interaction.customId === 'level_exclusions') {

        const menu = new StringSelectMenuBuilder()
            .setCustomId('lvl_exclusions_select')
            .setPlaceholder('Selecciona una acción')
            .addOptions(
                { label: '➕ Añadir canal', value: 'add_channel' },
                { label: '➖ Quitar canal', value: 'remove_channel' },
                { label: '➕ Añadir rol', value: 'add_role' },
                { label: '➖ Quitar rol', value: 'remove_role' }
            );

        await interaction.reply({
            content: '🚫 **Gestión de exclusiones de XP**',
            components: [row(menu)],
            flags: MessageFlags.Ephemeral
        });

        return true;
    }

    /* ========= SELECT → MODAL ========= */
    if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'lvl_exclusions_select'
    ) {
        const action = interaction.values[0];

        const modal = new ModalBuilder()
            .setCustomId(`lvl_modal_exclusion:${action}`)
            .setTitle('Gestión de Exclusiones')
            .addComponents(
                row(
                    short(
                        'id',
                        action.includes('channel')
                            ? 'ID del canal'
                            : 'ID del rol',
                        '123456789012345678',
                        true
                    )
                )
            );

        await interaction.showModal(modal);
        return true;
    }

    /* ========= MODAL SUBMIT ========= */
    if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith('lvl_modal_exclusion:')
    ) {
        const action = interaction.customId.split(':')[1];
        const id = interaction.fields.getTextInputValue('id');

        /* === AÑADIR CANAL === */
        if (action === 'add_channel') {
            await config.addIgnoredChannel(id);
            await interaction.reply({
                content: `🚫 Canal <#${id}> excluido de XP`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        /* === QUITAR CANAL === */
        if (action === 'remove_channel') {
            await config.removeIgnoredChannel(id);
            await interaction.reply({
                content: `✅ Canal <#${id}> quitado de exclusiones`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        /* === AÑADIR ROL === */
        if (action === 'add_role') {
            if (!config.levelSettings.ignoredRoles.includes(id)) {
                config.levelSettings.ignoredRoles.push(id);
                await config.save();
                clearCache();
            }

            await interaction.reply({
                content: `🚫 Rol <@&${id}> excluido de XP`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        /* === QUITAR ROL === */
        if (action === 'remove_role') {
            config.levelSettings.ignoredRoles =
                config.levelSettings.ignoredRoles.filter(r => r !== id);

            await config.save();
            clearCache();

            await interaction.reply({
                content: `✅ Rol <@&${id}> quitado de exclusiones`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    /* ===============================
       🏆 GESTIÓN DE ROLES (simplificada - solo opciones)
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_roles_manage') {
        await interaction.reply({
            content: '⚠️ La gestión de roles por nivel se maneja a través del comando `/role-level` separado.',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🧪 PREVIEW LEVEL UP
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_preview') {
        const fakeData = {
            userMention: interaction.user.toString(),
            userTag: interaction.user.tag,
            userId: interaction.user.id,
            userAvatar: interaction.user.displayAvatarURL(),
            level: 10,
            oldLevel: 9,
            guildName: interaction.guild.name,
            guildId: interaction.guild.id,
            xp: 1500,
            xpNeeded: 2000,
            xpProgress: '75%',
            rank: 5,
            totalUsers: 100,
            coins: 5000,
            tokens: 10
        };

        if (config.notifications.levelUpType === 'text') {
            const msg = config.formatMessage(config.notifications.levelUpMessage, fakeData);

            await interaction.reply({
                content: msg,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        // Para embeds
        const embedData = config.createLevelUpEmbed(fakeData);
        const embed = new EmbedBuilder();

        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.color) {
            try {
                embed.setColor(embedData.color);
            } catch {
                embed.setColor('#00FF00');
            }
        }
        if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
        if (embedData.fields && embedData.fields.length > 0) embed.addFields(embedData.fields);
        if (embedData.footer) embed.setFooter(embedData.footer);
        if (embedData.image) embed.setImage(embedData.image);
        if (embedData.timestamp) embed.setTimestamp();

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });

        return true;
    }

    /* ===============================
       📦 EXPORT CONFIG
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_export') {
        const clean = config.toObject();
        delete clean._id;
        delete clean.__v;

        await interaction.reply({
            content:
                '```json\n' +
                JSON.stringify(clean, null, 2) +
                '\n```',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       📥 IMPORT CONFIG
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_import') {
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_import')
            .setTitle('Importar configuración')
            .addComponents(
                row(
                    paragraph(
                        'json',
                        'Pega aquí el JSON exportado',
                        '',
                        true
                    )
                )
            );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_import') {
        try {
            const json = JSON.parse(
                interaction.fields.getTextInputValue('json')
            );

            await GuildConfigLevel.updateOne(
                { guildId },
                { $set: json },
                { upsert: true }
            );

            await interaction.reply({
                content: '📥 Configuración importada correctamente',
                flags: MessageFlags.Ephemeral
            });
            return true;

        } catch (err) {
            await interaction.reply({
                content: '❌ JSON inválido',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    /* ===============================
       ♻️ RESET CONFIG
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_reset') {
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_reset')
            .setTitle('⚠️ Resetear configuración')
            .addComponents(
                row(
                    short(
                        'confirm',
                        'Escribe CONFIRMAR para resetear',
                        '',
                        true
                    )
                )
            );

        await interaction.showModal(modal);
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_reset') {
        const confirm = interaction.fields.getTextInputValue('confirm');

        if (confirm !== 'CONFIRMAR') {
            await interaction.reply({
                content: '❌ Confirmación incorrecta',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        await GuildConfigLevel.deleteOne({ guildId });

        await interaction.reply({
            content: '♻️ Configuración reseteada completamente',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       📊 PANEL DE EXCLUSIONES
    =============================== */

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_exclusions_menu') {
        const action = interaction.fields.getTextInputValue('action');

        if (action === 'add_channel') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_add_exclusion_channel')
                .setTitle('Excluir canal de XP')
                .addComponents(
                    row(short('channelId', 'ID del canal', '', true))
                );

            await interaction.showModal(modal);
        } else if (action === 'remove_channel') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_remove_exclusion_channel')
                .setTitle('Remover exclusión de canal')
                .addComponents(
                    row(short('channelId', 'ID del canal', '', true))
                );

            await interaction.showModal(modal);
        } else if (action === 'add_role') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_add_exclusion_role')
                .setTitle('Excluir rol de XP')
                .addComponents(
                    row(short('roleId', 'ID del rol', '', true))
                );

            await interaction.showModal(modal);
        } else if (action === 'remove_role') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_remove_exclusion_role')
                .setTitle('Remover exclusión de rol')
                .addComponents(
                    row(short('roleId', 'ID del rol', '', true))
                );

            await interaction.showModal(modal);
        }

        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_add_exclusion_channel') {
        const channelId = interaction.fields.getTextInputValue('channelId');
        await config.addIgnoredChannel(channelId);

        await interaction.reply({
            content: `🚫 Canal <#${channelId}> excluido de XP`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_remove_exclusion_channel') {
        const channelId = interaction.fields.getTextInputValue('channelId');
        await config.removeIgnoredChannel(channelId);

        await interaction.reply({
            content: `✅ Canal <#${channelId}> removido de exclusiones`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       ⚡ PANEL DE MULTIPLICADORES
    =============================== */

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_multipliers_menu') {
        const action = interaction.fields.getTextInputValue('action');

        if (action === 'add_channel') {
            await interaction.showModal(channelMultiplierModal());
        } else if (action === 'remove_channel') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_remove_channel_mult')
                .setTitle('Remover multiplicador de canal')
                .addComponents(
                    row(short('channelId', 'ID del canal', '', true))
                );

            await interaction.showModal(modal);
        } else if (action === 'add_role') {
            await interaction.showModal(roleMultiplierModal());
        } else if (action === 'remove_role') {
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_remove_role_mult')
                .setTitle('Remover multiplicador de rol')
                .addComponents(
                    row(short('roleId', 'ID del rol', '', true))
                );

            await interaction.showModal(modal);
        }

        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_remove_channel_mult') {
        const channelId = interaction.fields.getTextInputValue('channelId');
        await config.removeChannelMultiplier(channelId);

        await interaction.reply({
            content: `✅ Multiplicador del canal <#${channelId}> removido`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_remove_role_mult') {
        const roleId = interaction.fields.getTextInputValue('roleId');
        await config.removeBoostRole(roleId);

        await interaction.reply({
            content: `✅ Multiplicador del rol <@&${roleId}> removido`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🎯 GESTIÓN DE PENALIZACIONES
    =============================== */

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_add_penalty_role') {
        const roleId = interaction.fields.getTextInputValue('roleId');
        const multiplier = num(interaction.fields.getTextInputValue('multiplier'));

        await config.addPenaltyRole(roleId, multiplier);

        await interaction.reply({
            content: `⚠️ Penalización del rol <@&${roleId}> establecida a ${multiplier}x`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_remove_penalty_role') {
        const roleId = interaction.fields.getTextInputValue('roleId');
        await config.removePenaltyRole(roleId);

        await interaction.reply({
            content: `✅ Penalización del rol <@&${roleId}> removida`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ============================================================
   🧾 NUEVOS MODALES - CONFIGURACIONES AVANZADAS
============================================================ */

    // Configuración de monedas/economía
    const economyModal = cfg =>
        new ModalBuilder()
            .setCustomId('lvl_modal_economy')
            .setTitle('Configuración de Economía')
            .addComponents(
                row(short('coinsPerXP', 'Monedas por XP', cfg.levelSettings.coinsPerXP, true)),
                row(short('voiceCoinsPerMinute', 'Monedas/min voz', cfg.levelSettings.voiceCoinsPerMinute, true)),
                row(short('currencyName', 'Nombre moneda', cfg.shop.currencyName || 'Monedas', true)),
                row(short('currencyEmoji', 'Emoji moneda', cfg.shop.currencyEmoji || '💰', false))
            );

    // Configuración del shop
    const shopModal = cfg =>
        new ModalBuilder()
            .setCustomId('lvl_modal_shop')
            .setTitle('Configuración de Tienda')
            .addComponents(
                row(short('shopEnabled', 'Tienda activa (true/false)', cfg.shop.enabled.toString(), true)),
                row(short('logChannelId', 'ID canal logs', cfg.shop.logChannelId || '', false))
            );

    // Configuración del leaderboard
    const leaderboardModal = cfg =>
        new ModalBuilder()
            .setCustomId('lvl_modal_leaderboard')
            .setTitle('Configuración de Leaderboard')
            .addComponents(
                row(short('updateInterval', 'Intervalo actualización (seg)', cfg.leaderboard.updateInterval, true)),
                row(short('topCount', 'Usuarios en top', cfg.leaderboard.topCount, true)),
                row(short('showInChannel', 'ID canal automático', cfg.leaderboard.showInChannel || '', false))
            );

    // Configuración de notificaciones avanzada
    const notificationsAdvancedModal = cfg =>
        new ModalBuilder()
            .setCustomId('lvl_modal_notifications_adv')
            .setTitle('Notificaciones Avanzadas')
            .addComponents(
                row(short('mentionUser', 'Mencionar usuario (true/false)',
                    cfg.notifications.levelUpEmbed.mentionUser.toString(), false)),
                row(short('timestamp', 'Mostrar hora (true/false)',
                    cfg.notifications.levelUpEmbed.timestamp.toString(), false)),
                row(short('thumbnail', 'Miniatura avatar (true/false)',
                    cfg.notifications.levelUpEmbed.thumbnail.toString(), false))
            );

    /* ===============================
💰 CONFIGURACIÓN DE ECONOMÍA
=============================== */

    if (interaction.isButton() && interaction.customId === 'level_economy') {
        await interaction.showModal(economyModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_economy') {
        config.levelSettings.coinsPerXP = num(interaction.fields.getTextInputValue('coinsPerXP'));
        config.levelSettings.voiceCoinsPerMinute = num(interaction.fields.getTextInputValue('voiceCoinsPerMinute'));
        config.shop.currencyName = interaction.fields.getTextInputValue('currencyName');
        config.shop.currencyEmoji = interaction.fields.getTextInputValue('currencyEmoji');

        await config.save();
        clearCache();

        await interaction.reply({
            content: '💰 Configuración de economía actualizada',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🛍️ CONFIGURACIÓN DE TIENDA
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_shop') {
        await interaction.showModal(shopModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_shop') {
        config.shop.enabled = interaction.fields.getTextInputValue('shopEnabled') === 'true';
        const logChannelId = interaction.fields.getTextInputValue('logChannelId');
        config.shop.logChannelId = logChannelId || null;

        await config.save();
        clearCache();

        await interaction.reply({
            content: `🛍️ Tienda ${config.shop.enabled ? 'activada' : 'desactivada'}${config.shop.logChannelId ? ` (Logs: <#${config.shop.logChannelId}>)` : ''}`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🏆 CONFIGURACIÓN DE LEADERBOARD
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_leaderboard') {
        await interaction.showModal(leaderboardModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_leaderboard') {
        config.leaderboard.updateInterval = num(interaction.fields.getTextInputValue('updateInterval'));
        config.leaderboard.topCount = num(interaction.fields.getTextInputValue('topCount'));
        const showInChannel = interaction.fields.getTextInputValue('showInChannel');
        config.leaderboard.showInChannel = showInChannel || null;

        await config.save();
        clearCache();

        await interaction.reply({
            content: `🏆 Leaderboard configurado (Top ${config.leaderboard.topCount}, actualización cada ${config.leaderboard.updateInterval}s)`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ===============================
       🔔 NOTIFICACIONES AVANZADAS
    =============================== */

    if (interaction.isButton() && interaction.customId === 'level_notifications_adv') {
        await interaction.showModal(notificationsAdvancedModal(config));
        return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_notifications_adv') {
        config.notifications.levelUpEmbed.mentionUser =
            interaction.fields.getTextInputValue('mentionUser') === 'true';
        config.notifications.levelUpEmbed.timestamp =
            interaction.fields.getTextInputValue('timestamp') === 'true';
        config.notifications.levelUpEmbed.thumbnail =
            interaction.fields.getTextInputValue('thumbnail') === 'true';

        await config.save();
        clearCache();

        await interaction.reply({
            content: '🔔 Configuración de notificaciones avanzada actualizada',
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    /* ============================================================
   🎪 HANDLERS PARA EVENTOS (Nuevos)
============================================================ */

    // Handler para el botón "🎪 Iniciar Evento" del comando /levels-admin eventos
    if (interaction.isButton() && interaction.customId === 'level_admin_start_event_menu') {
        if (!client.levelManager?.eventManager) {
            return interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const eventManager = client.levelManager.eventManager;
            const defaultEvents = eventManager.getDefaultEvents();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('lvl_select_start_event')
                .setPlaceholder('Selecciona un evento para iniciar')
                .addOptions([
                    ...defaultEvents.slice(0, 20).map(event => ({
                        label: event.name.length > 100 ? event.name.substring(0, 97) + '...' : event.name,
                        description: event.description.length > 100 ? event.description.substring(0, 97) + '...' : event.description,
                        value: event.id
                    })),
                    {
                        label: '✨ Evento Personalizado',
                        description: 'Iniciar un evento personalizado existente',
                        value: 'custom_event'
                    }
                ]);

            await interaction.reply({
                content: '🎪 **Selecciona un evento para iniciar:**',
                components: [row(selectMenu)],
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            console.error('Error mostrando menú de eventos:', error);
            await interaction.reply({
                content: '❌ Error al mostrar eventos disponibles.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Handler para seleccionar evento a iniciar
    if (interaction.isStringSelectMenu() && interaction.customId === 'lvl_select_start_event') {
        const selectedEventId = interaction.values[0];

        if (selectedEventId === 'custom_event') {
            // Mostrar modal para ingresar ID de evento personalizado
            const modal = new ModalBuilder()
                .setCustomId('lvl_modal_start_custom_event')
                .setTitle('Iniciar Evento Personalizado')
                .addComponents(
                    row(short('event_id', 'ID del evento personalizado', '', true)),
                    row(short('duration', 'Duración en horas', '24', true))
                );

            await interaction.showModal(modal);
            return true;
        }

        // Para eventos predefinidos, mostrar modal de duración
        const modal = new ModalBuilder()
            .setCustomId(`lvl_modal_start_event:${selectedEventId}`)
            .setTitle('Duración del Evento')
            .addComponents(
                row(short('duration', 'Duración en horas (1-168)', '24', true))
            );

        await interaction.showModal(modal);
        return true;
    }

    // Handler para modal de evento personalizado
    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_start_custom_event') {
        const eventId = interaction.fields.getTextInputValue('event_id');
        const duration = parseInt(interaction.fields.getTextInputValue('duration'));
        const guildId = interaction.guild.id;

        if (!client.levelManager?.eventManager) {
            await interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        try {
            const eventManager = client.levelManager.eventManager;
            const event = await eventManager.startEvent(guildId, eventId, duration);

            await interaction.reply({
                content: `✅ Evento **${event.name}** iniciado por **${duration} horas**.\n\n${event.description}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            await interaction.reply({
                content: `❌ Error iniciando evento: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Handler para modal de eventos predefinidos
    if (interaction.isModalSubmit() && interaction.customId.startsWith('lvl_modal_start_event:')) {
        const eventId = interaction.customId.split(':')[1];
        const duration = parseInt(interaction.fields.getTextInputValue('duration'));
        const guildId = interaction.guild.id;

        if (!client.levelManager?.eventManager) {
            await interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        try {
            const eventManager = client.levelManager.eventManager;
            const event = await eventManager.startEvent(guildId, eventId, duration);

            await interaction.reply({
                content: `✅ Evento **${event.name}** iniciado por **${duration} horas**.\n\n${event.description}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            await interaction.reply({
                content: `❌ Error iniciando evento: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Handler para el botón "⏹️ Detener Evento"
    if (interaction.isButton() && interaction.customId === 'level_admin_stop_event_menu') {
        if (!client.levelManager?.eventManager) {
            return interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            const guildId = interaction.guild.id;
            const eventManager = client.levelManager.eventManager;
            const activeEvents = await eventManager.getActiveEvents(guildId);

            if (activeEvents.length === 0) {
                return interaction.reply({
                    content: '📭 No hay eventos activos para detener.',
                    flags: MessageFlags.Ephemeral
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('lvl_select_stop_event')
                .setPlaceholder('Selecciona un evento para detener')
                .addOptions(
                    activeEvents.slice(0, 20).map(event => ({
                        label: event.name.length > 100 ? event.name.substring(0, 97) + '...' : event.name,
                        description: `Termina: ${event.timeRemaining}h restantes`,
                        value: event.id
                    }))
                );

            await interaction.reply({
                content: '⏹️ **Selecciona un evento para detener:**',
                components: [row(selectMenu)],
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            console.error('Error mostrando menú de eventos activos:', error);
            await interaction.reply({
                content: '❌ Error al mostrar eventos activos.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Handler para seleccionar evento a detener
    if (interaction.isStringSelectMenu() && interaction.customId === 'lvl_select_stop_event') {
        const eventId = interaction.values[0];
        const guildId = interaction.guild.id;

        if (!client.levelManager?.eventManager) {
            await interaction.update({
                content: '❌ El sistema de eventos no está disponible.',
                components: []
            });
            return true;
        }

        try {
            const eventManager = client.levelManager.eventManager;
            const event = await eventManager.stopEvent(guildId, eventId);

            await interaction.update({
                content: `✅ Evento **${event.name}** detenido exitosamente.`,
                components: []
            });
            return true;
        } catch (error) {
            await interaction.update({
                content: `❌ Error deteniendo evento: ${error.message}`,
                components: []
            });
            return true;
        }
    }

    // Handler para el botón "⚙️ Configurar"
    if (interaction.isButton() && interaction.customId === 'level_admin_config_events') {
        const guildId = interaction.guild.id;

        // Crear modal para configurar eventos
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_config_events')
            .setTitle('Configuración de Eventos')
            .addComponents(
                row(short('announcementChannel', 'ID Canal anuncios (opcional)', '', false)),
                row(short('autoStartEvents', 'Inicio automático (true/false)', 'true', false)),
                row(short('eventNotifications', 'Notificaciones (true/false)', 'true', false))
            );

        await interaction.showModal(modal);
        return true;
    }

    // Handler para modal de configuración de eventos
    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_config_events') {
        const guildId = interaction.guild.id;
        const announcementChannel = interaction.fields.getTextInputValue('announcementChannel');
        const autoStartEvents = interaction.fields.getTextInputValue('autoStartEvents') === 'true';
        const eventNotifications = interaction.fields.getTextInputValue('eventNotifications') === 'true';

        const config = await GuildConfigLevel.findOneAndUpdate(
            { guildId },
            {},
            { upsert: true, new: true }
        );

        if (!config.eventSettings) {
            config.eventSettings = {
                enabled: true,
                announcementChannel: null,
                autoStartEvents: true,
                eventNotifications: true
            };
        }

        let updates = [];

        if (announcementChannel) {
            config.eventSettings.announcementChannel = announcementChannel;
            updates.push(`Canal de anuncios: <#${announcementChannel}>`);
        }

        config.eventSettings.autoStartEvents = autoStartEvents;
        updates.push(`Inicio automático: **${autoStartEvents ? '✅ ACTIVADO' : '❌ DESACTIVADO'}**`);

        config.eventSettings.eventNotifications = eventNotifications;
        updates.push(`Notificaciones: **${eventNotifications ? '✅ ACTIVADAS' : '❌ DESACTIVADAS'}**`);

        await config.save();

        await interaction.reply({
            content: `✅ Configuración de eventos actualizada:\n\n${updates.join('\n')}`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    // Handler para el botón "✨ Crear Evento"
    if (interaction.isButton() && interaction.customId === 'level_admin_create_event') {
        // Mostrar modal para crear evento
        const modal = new ModalBuilder()
            .setCustomId('lvl_modal_create_event_quick')
            .setTitle('Crear Evento Rápido')
            .addComponents(
                row(short('name', 'Nombre del evento', '', true)),
                row(short('description', 'Descripción breve', '', true)),
                row(short('type', 'Tipo (xp/coins/tokens/sale)', '', true)),
                row(short('value', 'Valor (ej: 2.0, +5, 0.2)', '', true)),
                row(short('duration', 'Duración (horas)', '24', true))
            );

        await interaction.showModal(modal);
        return true;
    }

    // Handler para modal de creación rápida de evento
    if (interaction.isModalSubmit() && interaction.customId === 'lvl_modal_create_event_quick') {
        if (!client.levelManager?.eventManager) {
            await interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        try {
            const guildId = interaction.guild.id;
            const name = interaction.fields.getTextInputValue('name');
            const description = interaction.fields.getTextInputValue('description');
            const type = interaction.fields.getTextInputValue('type');
            const value = interaction.fields.getTextInputValue('value');
            const duration = parseInt(interaction.fields.getTextInputValue('duration'));

            // Mapear tipo abreviado a tipo completo
            const typeMap = {
                'xp': 'xp_multiplier',
                'coins': 'coin_multiplier',
                'tokens': 'token_bonus',
                'sale': 'sale'
            };

            const fullType = typeMap[type] || type;

            // Preparar datos del evento
            const eventData = {
                name,
                description,
                type: fullType,
                durationHours: duration
            };

            // Asignar valor según tipo
            if (fullType === 'xp_multiplier' || fullType === 'coin_multiplier') {
                eventData.multiplier = parseFloat(value);
            } else if (fullType === 'token_bonus') {
                eventData.bonus = parseInt(value);
            } else if (fullType === 'sale') {
                eventData.discount = parseFloat(value);
            }

            const eventManager = client.levelManager.eventManager;
            const creator = {
                userId: interaction.user.id,
                username: interaction.user.tag
            };

            // Crear y activar el evento
            const event = await eventManager.createCustomEvent(guildId, eventData, creator);
            await eventManager.startEvent(guildId, event.eventId, duration);

            await interaction.reply({
                content: `✅ Evento **${event.name}** creado y activado por **${duration} horas**.\n\n` +
                    `Tipo: ${this.getTipoNombre(event.type)}\n` +
                    `ID: \`${event.eventId}\``,
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            console.error('Error creando evento rápido:', error);
            await interaction.reply({
                content: `❌ Error creando evento: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Handler para botones de activación de evento (de crear-evento)
    if (interaction.isButton() && interaction.customId.startsWith('activate_event_')) {
        const eventId = interaction.customId.replace('activate_event_', '');
        const guildId = interaction.guild.id;

        if (!client.levelManager?.eventManager) {
            await interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        try {
            const eventManager = client.levelManager.eventManager;
            const event = await eventManager.startEvent(guildId, eventId, 24); // 24 horas por defecto

            await interaction.update({
                content: `✅ Evento **${event.name}** activado por **24 horas**.\n\n${event.description}`,
                components: []
            });
            return true;
        } catch (error) {
            await interaction.update({
                content: `❌ Error activando evento: ${error.message}`,
                components: []
            });
            return true;
        }
    }

    // Handler para botones de edición de evento
    if (interaction.isButton() && interaction.customId.startsWith('edit_event_')) {
        const eventId = interaction.customId.replace('edit_event_', '');

        // Mostrar modal para editar evento
        const modal = new ModalBuilder()
            .setCustomId(`lvl_modal_edit_event:${eventId}`)
            .setTitle('Editar Evento')
            .addComponents(
                row(short('field', 'Campo a editar (name/desc/mult/bonus/disc)', '', true)),
                row(short('value', 'Nuevo valor', '', true))
            );

        await interaction.showModal(modal);
        return true;
    }

    // Handler para modal de edición de evento
    if (interaction.isModalSubmit() && interaction.customId.startsWith('lvl_modal_edit_event:')) {
        const eventId = interaction.customId.split(':')[1];
        const field = interaction.fields.getTextInputValue('field');
        const value = interaction.fields.getTextInputValue('value');
        const guildId = interaction.guild.id;

        if (!client.levelManager?.eventManager) {
            await interaction.reply({
                content: '❌ El sistema de eventos no está disponible.',
                flags: MessageFlags.Ephemeral
            });
            return true;
        }

        try {
            const eventManager = client.levelManager.eventManager;

            // Mapear campos abreviados
            const fieldMap = {
                'name': 'name',
                'desc': 'description',
                'mult': 'multiplier',
                'bonus': 'bonus',
                'disc': 'discount'
            };

            const actualField = fieldMap[field] || field;
            const updates = { [actualField]: value };

            // Convertir valores numéricos
            if (actualField === 'multiplier' || actualField === 'discount') {
                updates[actualField] = parseFloat(value);
            } else if (actualField === 'bonus') {
                updates[actualField] = parseInt(value);
            }

            const event = await eventManager.updateEvent(guildId, eventId, updates);

            await interaction.reply({
                content: `✅ Evento **${event.name}** actualizado.\n` +
                    `Campo **${actualField}**: ${value}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        } catch (error) {
            await interaction.reply({
                content: `❌ Error editando evento: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
            return true;
        }
    }

    // Método auxiliar para obtener nombre de tipo (agrega esto al archivo)
    function getTipoNombre(tipo) {
        const tipos = {
            'xp_multiplier': 'Multiplicador de XP',
            'coin_multiplier': 'Multiplicador de Monedas',
            'token_bonus': 'Bonus de Tokens',
            'sale': 'Rebajas en Tienda',
            'custom': 'Personalizado'
        };
        return tipos[tipo] || tipo;
    }

    /* ===============================
       🐛 DEBUG CACHE
    =============================== */

    if (interaction.isButton() && interaction.customId === 'debug_cache') {
        const configFromDB = await GuildConfigLevel.findOne({ guildId });
        const cached = client.levelManager?.cache?.get(`guildconfig:${guildId}`);

        await interaction.reply({
            content: `**🐛 DEBUG CACHE**\n` +
                `📊 Base de datos: ${configFromDB ? `enabled = ${configFromDB.enabled}` : 'No encontrado'}\n` +
                `💾 En caché: ${cached ? `enabled = ${cached.data?.enabled} (edad: ${Date.now() - cached.timestamp}ms)` : 'No en caché'}\n` +
                `🔧 Sistema: ${configFromDB?.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}`,
            flags: MessageFlags.Ephemeral
        });
        return true;
    }

    // Si ninguna interacción fue manejada
    return false;
}