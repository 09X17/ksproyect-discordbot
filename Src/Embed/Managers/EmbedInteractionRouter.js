import EmbedComponentGuard from './EmbedComponentGuard.js';
import EmbedActionExecutor from './EmbedActionExecutor.js';

export default class EmbedInteractionRouter {

    constructor(client, embedManager) {
        this.client = client;
        this.embedManager = embedManager;

        this.guard = new EmbedComponentGuard();
        this.executor = new EmbedActionExecutor(client);
    }

    async handle(interaction) {

        if (!interaction.isButton() &&
            !interaction.isStringSelectMenu())
            return false;

        const customId = interaction.customId;

        if (!customId.startsWith('embed:'))
            return false;

        const parts = customId.split(':');

        // embed:templateId:button:0
        if (parts.length !== 4)
            return false;

        const [, templateId, componentType, indexStr] = parts;
        const index = Number(indexStr);

        if (isNaN(index))
            return false;

        const template = await this.embedManager.getTemplate(
            interaction.guild.id,
            templateId
        );

        if (!template)
            return this.#safeReply(interaction, '⚠️ Este embed ya no existe.');

        const component = this.#getComponent(
            template,
            componentType,
            index
        );

        if (!component)
            return this.#safeReply(interaction, '⚠️ Componente inválido.');

        // 🚫 Los botones link no pasan por aquí
        if (component.type === 'link')
            return false;

        try {

            // 🔐 Validaciones
            this.guard.check(interaction, component);

            // 🚀 Ejecutar acción
            await this.executor.execute(
                interaction,
                component.action,
                {
                    values: interaction.isStringSelectMenu()
                        ? interaction.values
                        : null
                }
            );

            // 📊 Registrar uso
            this.#registerUsage(interaction, component);

            template.stats.clicks += 1;

            await template.save();
            this.embedManager.invalidateTemplate(
                template.guildId,
                template._id
            );

        } catch (error) {

            console.error('Error ejecutando embed:', error);

            return this.#safeReply(
                interaction,
                error.message || '❌ Error ejecutando acción.'
            );
        }

        return true;
    }

    #getComponent(template, type, index) {

        if (type === 'button')
            return template.components?.buttons?.[index];

        if (type === 'select')
            return template.components?.selects?.[index];

        return null;
    }

    #registerUsage(interaction, component) {

        if (!component.usage) {
            component.usage = {
                totalUses: 0,
                users: []
            };
        }

        const usage = component.usage;
        const userId = interaction.user.id;

        let userEntry =
            usage.users.find(u => u.userId === userId);

        if (!userEntry) {
            userEntry = {
                userId,
                uses: 0,
                lastUsed: null
            };
            usage.users.push(userEntry);
        }

        userEntry.uses += 1;
        userEntry.lastUsed = new Date();

        usage.totalUses += 1;
        usage.lastGlobalUse = new Date();
    }

    async #safeReply(interaction, message) {

        if (interaction.replied || interaction.deferred) {
            return interaction.followUp({
                content: message,
                flags: 64
            });
        }

        return interaction.reply({
            content: message,
            flags: 64
        });
    }
}
