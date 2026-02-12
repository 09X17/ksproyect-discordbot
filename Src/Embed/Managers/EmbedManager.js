import EmbedTemplate from '../Models/EmbedTemplate.js';
import EmbedMessage from '../Models/EmbedMessage.js';
import EmbedVariableResolver from './EmbedVariableResolver.js';
import EmbedRenderer from './EmbedRenderer.js';
import EmbedComponentManager from './EmbedComponentManager.js';

export default class EmbedManager {

    constructor(client) {
        this.client = client;

        this.cache = new Map();
        this.cacheTTL = 300000;

        this.variableResolver = new EmbedVariableResolver();
        this.renderer = new EmbedRenderer();
        this.componentManager = new EmbedComponentManager();
    }

    // =====================================================
    // TEMPLATE CRUD
    // =====================================================

    async createTemplate(guildId, name, ownerId) {

        const template = await EmbedTemplate.create({
            guildId,
            name,
            embed: { fields: [] },
            components: { buttons: [], selects: [] },
            settings: { ownerId },
            stats: { sends: 0, clicks: 0 }
        });

        this.clearGuildCache(guildId);
        return template;
    }

    async getTemplate(guildId, templateId) {

        const cacheKey = `${guildId}:${templateId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTTL)
            return cached.data;

        const template = await EmbedTemplate.findOne({
            guildId,
            _id: templateId
        });

        if (!template) return null;

        this.cache.set(cacheKey, {
            data: template,
            timestamp: Date.now()
        });

        return template;
    }

    async deleteTemplate(guildId, templateId) {
        await EmbedTemplate.deleteOne({ guildId, _id: templateId });
        this.clearGuildCache(guildId);
    }

    async cloneTemplate(guildId, templateId, newName) {

        const original = await this.getTemplate(guildId, templateId);
        if (!original) return null;

        const clone = original.toObject();
        delete clone._id;

        clone.name = newName;

        const newTemplate = await EmbedTemplate.create(clone);

        this.clearGuildCache(guildId);
        return newTemplate;
    }

    async getGuildTemplates(guildId) {
        return await EmbedTemplate.find({ guildId }).lean();
    }

    clearGuildCache(guildId) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${guildId}:`))
                this.cache.delete(key);
        }
    }

    invalidateTemplate(guildId, templateId) {
        this.cache.delete(`${guildId}:${templateId}`);
    }

    // =====================================================
    // BASIC PROPERTIES
    // =====================================================

    async setTitle(template, title) {
        template.embed.title = this.limit(title, 256);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async setDescription(template, description) {
        template.embed.description = this.limit(description, 4096);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async setColor(template, color) {

        if (typeof color === 'string')
            color = parseInt(color.replace('#', ''), 16);

        template.embed.color = color;

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    async setTimestamp(template, enabled = true) {
        template.embed.timestamp = enabled ? new Date() : null;
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    // =====================================================
    // IMAGES
    // =====================================================

    async setThumbnail(template, url) {

        if (!this.isValidImageUrl(url))
            throw new Error('URL inválida');

        template.embed.thumbnail = url;

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    async setImage(template, url) {

        if (!this.isValidImageUrl(url))
            throw new Error('URL inválida');

        template.embed.image = url;

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    // =====================================================
    // AUTHOR & FOOTER
    // =====================================================

    async setAuthor(template, { name, iconURL, url }) {

        if (iconURL && !this.isValidImageUrl(iconURL))
            throw new Error('Icon URL inválida');

        template.embed.author = {
            name: this.limit(name, 256),
            iconURL,
            url
        };

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    async setFooter(template, { text, iconURL }) {

        if (iconURL && !this.isValidImageUrl(iconURL))
            throw new Error('Icon URL inválida');

        template.embed.footer = {
            text: this.limit(text, 2048),
            iconURL
        };

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    // =====================================================
    // FIELDS
    // =====================================================

    async addField(template, { name, value, inline = false }) {

        if (!template.embed.fields)
            template.embed.fields = [];

        if (template.embed.fields.length >= 25)
            throw new Error('Máximo 25 fields');

        template.embed.fields.push({
            name: this.limit(name, 256),
            value: this.limit(value, 1024),
            inline
        });

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    async updateField(template, index, data) {

        if (!template.embed.fields || !template.embed.fields[index])
            throw new Error('Field no existe');

        const field = template.embed.fields[index];

        if (data.name)
            field.name = this.limit(data.name, 256);

        if (data.value)
            field.value = this.limit(data.value, 1024);

        if (typeof data.inline === 'boolean')
            field.inline = data.inline;

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    async removeField(template, index) {

        if (!template.embed.fields)
            return template;

        template.embed.fields.splice(index, 1);

        await template.save();
        this.invalidateTemplate(template.guildId, template._id);

        return template;
    }

    // =====================================================
    // COMPONENT WRAPPERS
    // =====================================================

    async addButton(template, data) {
        this.componentManager.addButton(template, data);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async updateButton(template, index, data) {
        this.componentManager.updateButton(template, index, data);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async removeButton(template, index) {
        this.componentManager.removeButton(template, index);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async addSelect(template, data) {
        this.componentManager.addSelect(template, data);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async updateSelect(template, index, data) {
        this.componentManager.updateSelect(template, index, data);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    async removeSelect(template, index) {
        this.componentManager.removeSelect(template, index);
        await template.save();
        this.invalidateTemplate(template.guildId, template._id);
        return template;
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    validateEmbed(template) {

        const e = template.embed;

        if (!e.title &&
            !e.description &&
            (!e.fields || e.fields.length === 0))
            throw new Error('Embed vacío');

        const totalLength =
            (e.title?.length || 0) +
            (e.description?.length || 0) +
            (e.fields || []).reduce(
                (acc, f) => acc + (f.name?.length || 0) + (f.value?.length || 0),
                0
            );

        if (totalLength > 6000)
            throw new Error('Embed excede 6000 caracteres');

        return true;
    }

    isValidImageUrl(url) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    }

    limit(text, max) {
        if (!text) return text;
        return text.length > max ? text.slice(0, max) : text;
    }

    // =====================================================
    // SEND SYSTEM
    // =====================================================

    async sendById(guildId, templateId, channel, context = {}) {

        const template = await EmbedTemplate.findOne({
            guildId,
            _id: templateId
        });
        if (!template)
            throw new Error('Template no encontrado');

        return this.send(channel, template, context);
    }

    async send(channel, template, context = {}) {

        if (!channel && !context.interaction)
            throw new Error('No se proporcionó canal ni interacción');

        this.validateEmbed(template);

        const resolvedTemplate =
            this.variableResolver.resolve(template, context);

        const { embed, components } =
            this.renderer.render(resolvedTemplate);

        const payload = {
            embeds: [embed],
            components
        };

        let sentMessage = null;

        // =====================================================
        // EPHEMERAL (NO SE GUARDA)
        // =====================================================

        if (template.settings?.ephemeral && context.interaction) {

            await context.interaction.reply({
                ...payload,
                flags: 64
            });

        } else {

            // =====================================================
            // MENSAJE NORMAL (SE GUARDA)
            // =====================================================

            sentMessage = await channel.send(payload);

            try {

                await EmbedMessage.create({
                    guildId: template.guildId,
                    templateId: template._id,
                    channelId: channel.id,
                    messageId: sentMessage.id
                });

            } catch (err) {
                console.error('Error guardando EmbedMessage:', err);
            }
        }

        // =====================================================
        // STATS
        // =====================================================

        await EmbedTemplate.updateOne(
            { _id: template._id },
            { $inc: { 'stats.sends': 1 } }
        );

        this.invalidateTemplate(template.guildId, template._id);

        return sentMessage;
    }

}
