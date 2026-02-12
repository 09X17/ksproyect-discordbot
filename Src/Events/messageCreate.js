export default {
    name: 'messageCreate',
    once: false,

    async execute(client, message) {
        // Ignorar bots y mensajes sin guild
        if (message.author.bot || !message.guild) return;
        if (client.levelManager) {
            await client.levelManager.handleMessage(message);

        }

        if (client.contestManager) {
            await client.contestManager.handleContestSubmission(message);
        }

        // Verificar si es comando de prefijo
        if (!message.content.startsWith(client.config.prefix)) return;

        const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Obtener comando
        const command = client.getCommand(commandName);
        if (!command) return;

        // Validaciones
        const validation = validateCommand(client, message, command);
        if (validation) {
            return message.reply(validation);
        }

        // Verificar cooldown
        const cooldown = checkCooldown(client, message.author.id, command);
        if (cooldown.onCooldown) {
            return message.reply(`⏰ Espera ${cooldown.timeLeft}s para usar este comando again.`);
        }

        // Ejecutar comando
        try {
            await command.execute(client, message, args);
            setCooldown(client, message.author.id, command);

            client.logger.command(`Comando ${command.name} usado por ${message.author.tag} en ${message.guild.name}`);

        } catch (error) {
            handleCommandError(client, message, error, command.name);
        }
    }
};

// Función para validar comandos
function validateCommand(client, message, command) {
    if (command.devOnly && !client.isDeveloper(message.author.id)) {
        return '🔒 Solo desarrolladores pueden usar este comando';
    }

    if (command.ownerOnly && !client.isOwner(message.author.id)) {
        return '🔒 Solo owners pueden usar este comando';
    }

    if (command.guildOnly && !message.guild) {
        return '❌ Este comando solo funciona en servidores';
    }

    // Validar permisos de usuario
    if (command.userPermissions && message.member) {
        const missing = command.userPermissions.filter(perm =>
            !message.member.permissions.has(perm)
        );
        if (missing.length > 0) {
            return `❌ Te faltan permisos: ${missing.join(', ')}`;
        }
    }

    // Validar permisos del bot
    if (command.botPermissions && message.guild) {
        const missing = command.botPermissions.filter(perm =>
            !message.guild.members.me.permissions.has(perm)
        );
        if (missing.length > 0) {
            return `❌ Me faltan permisos: ${missing.join(', ')}`;
        }
    }

    return null;
}

// Sistema de cooldown
function checkCooldown(client, userId, command) {
    const key = `${userId}-${command.name}`;
    const cooldownEnd = client.cooldowns.get(key);

    if (cooldownEnd && Date.now() < cooldownEnd) {
        const timeLeft = ((cooldownEnd - Date.now()) / 1000).toFixed(1);
        return { onCooldown: true, timeLeft };
    }

    return { onCooldown: false };
}

function setCooldown(client, userId, command) {
    const key = `${userId}-${command.name}`;
    const cooldownTime = (command.cooldown || 3) * 1000;

    client.cooldowns.set(key, Date.now() + cooldownTime);
    setTimeout(() => client.cooldowns.delete(key), cooldownTime);
}

// Manejo de errores
function handleCommandError(client, message, error, commandName) {
    client.logger.error(`Error en comando ${commandName}:`, error);

    const errorMessage = '❌ Ocurrió un error al ejecutar el comando';
    if (message.replied) {
        message.followUp(errorMessage).catch(() => { });
    } else {
        message.reply(errorMessage).catch(() => { });
    }
}
