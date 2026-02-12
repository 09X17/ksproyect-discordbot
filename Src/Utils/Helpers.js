import { EmbedBuilder } from 'discord.js';
import settings from '../Config/Settings.js';

/**
 * Formatear tiempo en milisegundos a texto legible
 */
export const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    
    return `${seconds}s`;
};

/**
 * Formatear número con separadores
 */
export const formatNumber = (number) => {
    return new Intl.NumberFormat('es-ES').format(number);
};

/**
 * Generar un ID único
 */
export const generateId = (length = 12) => {
    return Math.random().toString(36).substring(2, length + 2);
};

/**
 * Validar si es una URL válida
 */
export const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
};

/**
 * Capitalizar texto
 */
export const capitalize = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Esperar X milisegundos
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Validar permisos
 */
export const hasPermissions = (member, permissions) => {
    return permissions.every(perm => member.permissions.has(perm));
};

/**
 * Obtener mención de usuario
 */
export const getUserMention = (userId) => {
    return `<@${userId}>`;
};

/**
 * Obtener mención de rol
 */
export const getRoleMention = (roleId) => {
    return `<@&${roleId}>`;
};