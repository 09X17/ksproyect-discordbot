import { EmbedBuilder } from 'discord.js';
import settings from '../Config/Settings.js';

/**
 * Embed de éxito
 */
export const successEmbed = (description, title = '✅ Éxito') => {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(settings.colors.success)
        .setTimestamp();
};

/**
 * Embed de error
 */
export const errorEmbed = (description, title = '❌ Error') => {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(settings.colors.error)
        .setTimestamp();
};

/**
 * Embed de advertencia
 */
export const warningEmbed = (description, title = '⚠️ Advertencia') => {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(settings.colors.warning)
        .setTimestamp();
};

/**
 * Embed de información
 */
export const infoEmbed = (description, title = 'ℹ️ Información') => {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(settings.colors.info)
        .setTimestamp();
};

/**
 * Embed personalizado
 */
export const customEmbed = (options = {}) => {
    const embed = new EmbedBuilder();
    
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.color) embed.setColor(options.color);
    if (options.fields) embed.addFields(options.fields);
    if (options.footer) embed.setFooter(options.footer);
    if (options.timestamp) embed.setTimestamp();
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);
    
    return embed;
};