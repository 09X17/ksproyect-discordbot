
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

// Variables globales para paginación (si usas paginación)
const userPanels = new Map();

// PANEL PRINCIPAL (página 1)
export function buildMainPanel(config) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_toggle')
                .setLabel(config.enabled ? '🟢 Sistema ON' : '🔴 Sistema OFF')
                .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('level_preview')
                .setLabel('🧪 Preview')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('page_next')
                .setLabel('➡️ Más opciones')
                .setStyle(ButtonStyle.Primary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_xp_messages')
                .setLabel('💬 XP Mensajes')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_xp_voice')
                .setLabel('🎤 XP Voz')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_economy')
                .setLabel('💰 Economía')
                .setStyle(ButtonStyle.Success)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_curve')
                .setLabel('📈 Curva XP')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_limits_daily')
                .setLabel('📅 Límites')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('debug_cache')
                .setLabel('🐛 Debug')
                .setStyle(ButtonStyle.Secondary)
        )
    ];
}

// PANEL SECUNDARIO (página 2)
export function buildSecondaryPanel(config) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('page_prev')
                .setLabel('⬅️ Atrás')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_shop')
                .setLabel('🛍️ Tienda')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_leaderboard')
                .setLabel('🏆 Leaderboard')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_notifications_adv')
                .setLabel('🔔 Notif Avanzadas')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_multipliers')
                .setLabel('⚡ Multiplicadores')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_exclusions')
                .setLabel('🚫 Exclusiones')
                .setStyle(ButtonStyle.Secondary)
        ),
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_roles_manage')
                .setLabel('🏆 Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_notif_channel')
                .setLabel('📍 Canal')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_import')
                .setLabel('📥 Importar')
                .setStyle(ButtonStyle.Primary)
        )
    ];
}

// PANEL ÚNICO (sin paginación - 5 filas máximo)
export function buildSinglePanel(config) {
    return [
        // 🎯 FILA 1: TOGGLE PRINCIPAL Y HERRAMIENTAS
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_toggle')
                .setLabel(config.enabled ? '🟢 Sistema ON' : '🔴 Sistema OFF')
                .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('level_preview')
                .setLabel('🧪 Preview')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('debug_cache')
                .setLabel('🐛 Debug')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_export')
                .setLabel('📦 Exportar')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_import')
                .setLabel('📥 Importar')
                .setStyle(ButtonStyle.Secondary)
        ),

        // 💰 FILA 2: ECONOMÍA Y XP
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_xp_messages')
                .setLabel('💬 XP Msgs')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_xp_voice')
                .setLabel('🎤 XP Voz')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_economy')
                .setLabel('💰 Monedas')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('level_curve')
                .setLabel('📈 Curva')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('level_limits_daily')
                .setLabel('📅 Límites')
                .setStyle(ButtonStyle.Secondary)
        ),

        // ⚙️ FILA 3: CONFIGURACIÓN AVANZADA
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_shop')
                .setLabel('🛍️ Tienda')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_leaderboard')
                .setLabel('🏆 Top')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_multipliers')
                .setLabel('⚡ Multiplicadores')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_exclusions')
                .setLabel('🚫 Exclusiones')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_roles_manage')
                .setLabel('🏆 Roles Nivel')
                .setStyle(ButtonStyle.Primary)
        ),

        // 📢 FILA 4: NOTIFICACIONES DE LEVEL UP
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_notify_toggle')
                .setLabel(config.notifications.levelUpDM ? '📱 DM ON' : '📱 DM OFF')
                .setStyle(config.notifications.levelUpDM ? ButtonStyle.Success : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_notify_type')
                .setLabel('📝 Tipo Notif')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_notify_text')
                .setLabel('✏️ Texto')
                .setStyle(config.notifications.levelUpType === 'text' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_notify_embed')
                .setLabel('🎨 Embed')
                .setStyle(config.notifications.levelUpType === 'embed' ? ButtonStyle.Primary : ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_notif_channel')
                .setLabel('📍 Canal')
                .setStyle(ButtonStyle.Secondary)
        ),

        // 🎨 FILA 5: CONFIGURACIÓN DE EMBED Y ACCIONES
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('level_embed_add_field')
                .setLabel('➕ Campo Embed')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('level_embed_remove_field')
                .setLabel('🗑️ Quitar Campo')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('level_notifications_adv')
                .setLabel('🔔 Notif Avanz')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('level_reset')
                .setLabel('♻️ Reset')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('level_admin_create_event')
                .setLabel('🎪 Eventos')
                .setStyle(ButtonStyle.Success)
        )
    ];
}

// Para manejo de paginación
export function getUserPanel(userId) {
    return userPanels.get(userId);
}

export function setUserPanel(userId, data) {
    userPanels.set(userId, data);
}

export function deleteUserPanel(userId) {
    userPanels.delete(userId);
}