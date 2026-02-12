import { MessageFlags, SlashCommandBuilder } from 'discord.js';

export default class SlashCommand {
    constructor(options = {}) {
        this.data = options.data || new SlashCommandBuilder();
        this.cooldown = options.cooldown || 3;
        this.devOnly = options.devOnly || false;
        this.ownerOnly = options.ownerOnly || false;
        this.guildOnly = options.guildOnly || true;
        this.nsfw = options.nsfw || false;
        this.disabled = options.disabled || false;
        this.userPermissions = options.userPermissions || [];
        this.botPermissions = options.botPermissions || [];
        this.category = options.category || 'general';
        this.cooldowns = new Map();
    }

    async execute(client, interaction) {
        throw new Error('Método execute() no implementado');
    }

    validate(client, interaction) {
        if (this.disabled) {
            return { content: '❌ Este comando está deshabilitado temporalmente', flags: 64 };
        }

        if (this.ownerOnly && !client.isOwner(interaction.user.id)) {
            return { content: '🔒 Solo los owners pueden usar este comando', flags: 64 };
        }

        if (this.devOnly && !client.isDeveloper(interaction.user.id)) {
            return { content: '🔒 Solo los developers pueden usar este comando', flags: 64 };
        }

        if (this.guildOnly && !interaction.guild) {
            return { content: '❌ Este comando solo funciona en servidores', flags: 64 };
        }

        if (this.nsfw && interaction.channel && !interaction.channel.nsfw) {
            return { content: '🔞 Este comando solo funciona en canales NSFW', flags: 64 };
        }

        if (this.userPermissions.length > 0) {
            if (!interaction.inGuild() || !interaction.memberPermissions) {
                return {
                    content: '❌ No se pudieron verificar tus permisos.',
                    flags: 64
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
                    flags: 64
                };
            }
        }

        if (this.botPermissions.length > 0 && interaction.guild) {
            const missingPerms = this.botPermissions.filter(perm =>
                !interaction.guild.members.me.permissions.has(perm)
            );
            if (missingPerms.length > 0) {
                return {
                    content: `❌ Me faltan permisos: ${missingPerms
                        .map(p => `\`${p}\``)
                        .join(', ')}`,
                    flags: 64
                };
            }
        }

        return null;
    }

    checkCooldown(userId) {
        const cooldownEnd = this.cooldowns.get(userId);

        if (cooldownEnd && Date.now() < cooldownEnd) {
            const timeLeft = ((cooldownEnd - Date.now()) / 1000).toFixed(1);
            return { onCooldown: true, timeLeft };
        }

        return { onCooldown: false };
    }

    setCooldown(userId) {
        const cooldownTime = this.cooldown * 1000;
        this.cooldowns.set(userId, Date.now() + cooldownTime);
        setTimeout(() => {
            this.cooldowns.delete(userId);
        }, cooldownTime);
    }

    resetCooldown(userId) {
        return this.cooldowns.delete(userId);
    }

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

    async run(client, interaction) {
        const validationError = this.validate(client, interaction);
        if (validationError) {
            return interaction.reply(validationError);
        }
        const cooldownInfo = this.checkCooldown(interaction.user.id);
        if (cooldownInfo.onCooldown) {
            return interaction.reply({
                content: `❗ Espera **${cooldownInfo.timeLeft} SEGUNDOS** para usar este comando de nuevo.`,
                flags: 64
            });
        }
        this.setCooldown(interaction.user.id);

        try {
            await this.execute(client, interaction);
            client.logger.debug(`✅ Slash command ejecutado: ${this.data.name} por ${interaction.user.tag}`);

        } catch (error) {
            client.logger.error(`❌ Error en slash command ${this.data.name}:`, error.stack);

            const errorResponse = {
                content: '❌ Ocurrió un error al ejecutar el comando',
                flags: 64
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorResponse).catch(() => { });
            } else {
                await interaction.reply(errorResponse).catch(() => { });
            }
        }
    }

    toJSON() {
        return this.data.toJSON();
    }

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