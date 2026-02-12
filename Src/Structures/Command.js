export default class Command {
    constructor(options = {}) {
        this.name = options.name || null;
        this.description = options.description || 'Sin descripción';
        this.usage = options.usage || '';
        this.aliases = options.aliases || [];
        this.category = options.category || 'general';
        this.cooldown = options.cooldown || 3;
        this.permissions = {
            bot: options.botPermissions || [],
            user: options.userPermissions || []
        };
        this.settings = {
            devOnly: options.devOnly || false,
            ownerOnly: options.ownerOnly || false,
            guildOnly: options.guildOnly || true,
            nsfw: options.nsfw || false,
            disabled: options.disabled || false
        };
    }
    async execute(client, message, args) {
        throw new Error('Método execute() no implementado');
    }

    validate(client, message) {
        if (this.settings.disabled) {
            return { error: 'Este comando está deshabilitado' };
        }

        if (this.settings.ownerOnly && !client.isOwner(message.author.id)) {
            return { error: 'Solo los owners pueden usar este comando' };
        }

        if (this.settings.devOnly && !client.isDeveloper(message.author.id)) {
            return { error: 'Solo los developers pueden usar este comando' };
        }

        if (this.settings.guildOnly && !message.guild) {
            return { error: 'Este comando solo funciona en servidores' };
        }

        if (this.settings.nsfw && message.channel && !message.channel.nsfw) {
            return { error: 'Este comando solo funciona en canales NSFW' };
        }

        if (this.permissions.user.length > 0 && message.member) {
            const missing = this.permissions.user.filter(perm => 
                !message.member.permissions.has(perm)
            );
            if (missing.length > 0) {
                return { error: `Te faltan permisos: ${missing.join(', ')}` };
            }
        }

        if (this.permissions.bot.length > 0 && message.guild) {
            const missing = this.permissions.bot.filter(perm => 
                !message.guild.members.me.permissions.has(perm)
            );
            if (missing.length > 0) {
                return { error: `Me faltan permisos: ${missing.join(', ')}` };
            }
        }

        return { success: true };
    }

    setCooldown(client, userId) {
        const key = `${userId}-${this.name}`;
        const cooldownTime = this.cooldown * 1000;
        
        client.cooldowns.set(key, Date.now());
        setTimeout(() => client.cooldowns.delete(key), cooldownTime);
    }

    checkCooldown(client, userId) {
        const key = `${userId}-${this.name}`;
        const cooldownEnd = client.cooldowns.get(key);
        
        if (cooldownEnd) {
            const timeLeft = (cooldownEnd - Date.now()) / 1000;
            return { onCooldown: true, timeLeft };
        }
        
        return { onCooldown: false };
    }
}