import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export default class SlashCommand {
    constructor(options = {}) {
        // Datos básicos del comando
        this.data = options.data || new SlashCommandBuilder();

        // Configuración
        this.cooldown = options.cooldown || 3;
        this.devOnly = options.devOnly || false;
        this.ownerOnly = options.ownerOnly || false;
        this.guildOnly = options.guildOnly || true;
        this.nsfw = options.nsfw || false;
        this.disabled = options.disabled || false;

        // Permisos
        this.userPermissions = options.userPermissions || [];
        this.botPermissions = options.botPermissions || [];

        // Categoría para organización
        this.category = options.category || 'general';

        // Cooldowns por usuario
        this.cooldowns = new Map();
    }

    /**
     * Método principal de ejecución
     * @param {BotClient} client - Cliente del bot
     * @param {CommandInteraction} interaction - Interacción
     */
    async execute(client, interaction) {
        throw new Error('Método execute() no implementado');
    }

    /**
     * Validar permisos y configuraciones
     * @param {BotClient} client - Cliente del bot
     * @param {CommandInteraction} interaction - Interacción
     * @returns {Object|null} Error object or null if valid
     */
    validate(client, interaction) {
        if (this.disabled) {
            return { content: '❌ Este comando está deshabilitado temporalmente', flags: MessageFlags.Ephemeral };
        }

        if (this.ownerOnly && !client.isOwner(interaction.user.id)) {
            return { content: '🔒 Solo los owners pueden usar este comando', flags: MessageFlags.Ephemeral };
        }

        if (this.devOnly && !client.isDeveloper(interaction.user.id)) {
            return { content: '🔒 Solo los developers pueden usar este comando', flags: MessageFlags.Ephemeral };
        }

        if (this.guildOnly && !interaction.guild) {
            return { content: '❌ Este comando solo funciona en servidores', flags: MessageFlags.Ephemeral };
        }

        if (this.nsfw && interaction.channel && !interaction.channel.nsfw) {
            return { content: '🔞 Este comando solo funciona en canales NSFW', flags: MessageFlags.Ephemeral };
        }

        if (this.userPermissions.length > 0) {
            if (!interaction.inGuild() || !interaction.memberPermissions) {
                return {
                    content: '❌ No se pudieron verificar tus permisos.',
                    flags: MessageFlags.Ephemeral
                };
            }

            const missingPerms = this.userPermissions.filter(
                perm => !interaction.memberPermissions.has(perm)
            );

            if (missingPerms.length > 0) {
                return {
                    content: `❌ Te faltan permisos: ${missingPerms
                        .map(p => `\`${p}\``)
                        .join(', ')}`,
                    flags: MessageFlags.Ephemeral
                };
            }
        }

        // Validar permisos del bot
        if (this.botPermissions.length > 0 && interaction.guild) {
            const missingPerms = this.botPermissions.filter(perm =>
                !interaction.guild.members.me.permissions.has(perm)
            );
            if (missingPerms.length > 0) {
                return {
                    content: `❌ Me faltan permisos: ${missingPerms
                        .map(p => `\`${p}\``)
                        .join(', ')}`,
                    flags: MessageFlags.Ephemeral
                };
            }
        }

        return null;
    }

    /**
     * Verificar cooldown
     * @param {string} userId - ID del usuario
     * @returns {Object} Cooldown information
     */
    checkCooldown(userId) {
        const cooldownEnd = this.cooldowns.get(userId);

        if (cooldownEnd && Date.now() < cooldownEnd) {
            const timeLeft = ((cooldownEnd - Date.now()) / 1000).toFixed(1);
            return { onCooldown: true, timeLeft };
        }

        return { onCooldown: false };
    }

    /**
     * Establecer cooldown
     * @param {string} userId - ID del usuario
     */
    setCooldown(userId) {
        const cooldownTime = this.cooldown * 1000;
        this.cooldowns.set(userId, Date.now() + cooldownTime);

        // Limpiar cooldown después del tiempo
        setTimeout(() => {
            this.cooldowns.delete(userId);
        }, cooldownTime);
    }

    /**
     * Resetear cooldown de un usuario
     * @param {string} userId - ID del usuario
     * @returns {boolean} True si se eliminó
     */
    resetCooldown(userId) {
        return this.cooldowns.delete(userId);
    }

    /**
     * Obtener usuarios en cooldown
     * @returns {Array} Lista de usuarios con cooldown activo
     */
    getUsersOnCooldown() {
        const now = Date.now();
        const users = [];

        for (const [userId, cooldownEnd] of this.cooldowns.entries()) {
            if (cooldownEnd > now) {
                users.push({
                    userId,
                    timeLeft: ((cooldownEnd - now) / 1000).toFixed(1)
                });
            }
        }

        return users;
    }

    /**
     * Ejecutar el comando con todas las validaciones
     * @param {BotClient} client - Cliente del bot
     * @param {CommandInteraction} interaction - Interacción
     */
    async run(client, interaction) {
        // Validar permisos
        const validationError = this.validate(client, interaction);
        if (validationError) {
            return interaction.reply(validationError);
        }

        // Verificar cooldown
        const cooldownInfo = this.checkCooldown(interaction.user.id);
        if (cooldownInfo.onCooldown) {
            return interaction.reply({
                content: `<:limitedetiempo:1455683247588774110> \`|\` Espera **${cooldownInfo.timeLeft} SEGUNDOS** para usar este comando de nuevo.`,
                flags: MessageFlags.Ephemeral
            });
        }

        // Establecer cooldown
        this.setCooldown(interaction.user.id);

        try {
            // Ejecutar el comando
            await this.execute(client, interaction);

            // Log de ejecución exitosa
            client.logger.debug(`✅ Slash command ejecutado: ${this.data.name} por ${interaction.user.tag}`);

        } catch (error) {
            client.logger.error(`❌ Error en slash command ${this.data.name}:`, error.stack);

            const errorResponse = {
                content: '❌ Ocurrió un error al ejecutar el comando',
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorResponse).catch(() => { });
            } else {
                await interaction.reply(errorResponse).catch(() => { });
            }
        }
    }

    /**
     * Convertir a JSON para registro en Discord
     * @returns {Object} JSON representation
     */
    toJSON() {
        return this.data.toJSON();
    }

    /**
     * Obtener información del comando para ayuda
     * @returns {String} Información formateada
     */
    getHelp() {
        return `
           **/${this.data.name}** - ${this.data.description}
           - **Categoría:** ${this.category}
           - **Cooldown:** ${this.cooldown}s
           - **Solo servidor:** ${this.guildOnly ? 'Sí' : 'No'}
           ${this.devOnly ? '• 🔒 Solo desarrolladores\n' : ''}
           ${this.ownerOnly ? '• 🔒 Solo propietarios\n' : ''}
           ${this.userPermissions.length > 0 ? `• **Permisos usuario:** ${this.userPermissions.join(', ')}\n` : ''}
           ${this.botPermissions.length > 0 ? `• **Permisos bot:** ${this.botPermissions.join(', ')}\n` : ''}
        `.trim();
        }
}