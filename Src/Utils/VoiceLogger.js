export default class VoiceLogger {
    constructor(client) {
        this.client = client;
        this.enabled = true;
        this.logLevel = 'info';
    }

    sessionRestored(member, channel) {
        this.info(`SESSION_RESTORED`, `${member.user.tag} en ${channel.name}`, {
            userId: member.id,
            channelId: channel.id,
            guildId: channel.guild.id
        });
    }

    sessionCreated(member, channel) {
        this.info(`SESSION_CREATED`, `${member.user.tag} se unió a ${channel.name}`, {
            userId: member.id,
            channelId: channel.id
        });
    }

    sessionEnded(member, session) {
        this.info(`SESSION_ENDED`, `${member.user.tag} finalizó sesión`, {
            userId: member.id,
            duration: session.totalMinutes || 0,
            xpEarned: session.xpEarned || 0,
            coinsEarned: session.coinsEarned || 0
        });
    }

    rewardsGiven(userId, guildId, amount, source, details = {}) {
        this.info(`REWARDS_GIVEN`, `${amount} XP por ${source}`, {
            userId,
            guildId,
            source,
            ...details
        });
    }

    voiceRewards(userId, guildId, xp, coins, minutes) {
        this.info(`VOICE_REWARDS`, `${minutes} min → ${xp} XP + ${coins} coins`, {
            userId,
            guildId,
            xp,
            coins,
            minutes
        });
    }

    intervalExecuted(name, sessionsProcessed) {
        this.debug(`INTERVAL_${name.toUpperCase()}`, `Procesadas ${sessionsProcessed} sesiones`);
    }

    checkpointSaved(userId, guildId, minutes) {
        this.debug(`CHECKPOINT_SAVED`, `${minutes} min guardados`, {
            userId,
            guildId,
            minutes
        });
    }

    debug(tag, message, data = {}) {
        if (this.logLevel === 'debug') {
            this._log('DEBUG', tag, message, data, '🔍');
        }
    }

    info(tag, message, data = {}) {
        this._log('INFO', tag, message, data, '📝');
    }

    warn(tag, message, data = {}) {
        this._log('WARN', tag, message, data, '⚠️');
    }

    error(tag, message, error = null) {
        this._log('ERROR', tag, message, { error: error?.message, stack: error?.stack }, '❌');
    }

    _log(level, tag, message, data, emoji) {
        if (!this.enabled) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            tag,
            message,
            ...data
        };

        const timeStr = new Date(timestamp).toLocaleTimeString();
        const dataStr = Object.keys(data).length > 0 
            ? ` | ${JSON.stringify(data)}` 
            : '';

        console.log(`${emoji} [${timeStr}] ${tag}: ${message}${dataStr}`);

        if (this.client.logger) {
            const logMethod = level.toLowerCase();
            if (this.client.logger[logMethod]) {
                this.client.logger[logMethod](`[VOICE] ${tag}: ${message}`, data);
            }
        }
    }

    generateReport(sessions) {
        const totalSessions = sessions.size;
        let totalMinutes = 0;
        let totalXP = 0;
        let totalCoins = 0;

        sessions.forEach(session => {
            totalMinutes += session.totalMinutes || 0;
            totalXP += session.xpEarned || 0;
            totalCoins += session.coinsEarned || 0;
        });

        this.info(`SYSTEM_REPORT`, `Estado del sistema de voz`, {
            activeSessions: totalSessions,
            totalMinutes,
            totalXP,
            totalCoins,
            timestamp: new Date().toISOString()
        });
    }
}