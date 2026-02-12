import UserLevel from '../Models/UserLevel.js';

export default class VoiceRewardManager {
    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
        this.activeVoiceSessions = new Map();
        this.voiceLogger = {
            sessionRestored: (member, channel) => {
            }
        };
    }

    async handleVoiceStateUpdate(oldState, newState) {
        try {
            const member = newState.member;
            if (!member || member.user.bot) return;

            const guildId = newState.guild.id;
            const userId = member.id;

            const config = await this.levelManager.getGuildConfig(guildId);
            if (!config || !config.enabled) {
                return;
            }

            const key = `${guildId}:${userId}`;

            if (!oldState.channelId && newState.channelId) {
                this.activeVoiceSessions.set(key, {
                    startTime: Date.now(),
                    lastUpdate: Date.now(),
                    channelId: newState.channelId,
                    muted: newState.mute || newState.deaf,
                    streaming: newState.streaming || false,
                    totalMinutes: 0,
                    coinsEarned: 0
                });
                return;
            }

            if (oldState.channelId && !newState.channelId) {
                const session = this.activeVoiceSessions.get(key);
                if (session) {
                    const now = Date.now();
                    const minutesSinceLastCheck = Math.floor((now - session.lastUpdate) / 60000);

                    if (minutesSinceLastCheck > 0) {
                        const wasActive = !session.muted &&
                            oldState.channelId === session.channelId &&
                            !(oldState.mute || oldState.deaf);

                        if (wasActive) {
                            await this.giveVoiceRewards(userId, guildId, minutesSinceLastCheck, session.channelId);
                        }
                        await this.updateVoiceMinutesInDB(userId, guildId, minutesSinceLastCheck);
                        session.totalMinutes += minutesSinceLastCheck;
                    }

                    this.activeVoiceSessions.delete(key);
                }
                return;
            }

            if (oldState.channelId === newState.channelId && newState.channelId) {
                const session = this.activeVoiceSessions.get(key);
                if (session) {
                    session.muted = newState.mute || newState.deaf;
                    session.streaming = newState.streaming || false;

                    if ((oldState.mute !== newState.mute || oldState.deaf !== newState.deaf) &&
                        (newState.mute || newState.deaf)) {

                        const minutesActive = Math.floor((Date.now() - session.lastUpdate) / 60000);

                        if (minutesActive > 0) {
                            await this.giveVoiceRewards(userId, guildId, minutesActive, session.channelId);
                            await this.updateVoiceMinutesInDB(userId, guildId, minutesActive);
                            session.lastUpdate = Date.now();
                        }
                    }
                }
            }

        } catch (error) {
            this.client.logger.error('❌ Error en handleVoiceStateUpdate:', error);
        }
    }

    async checkActiveSessions() {
        const now = Date.now();
        for (const [key, session] of this.activeVoiceSessions.entries()) {
            try {
                const [guildId, userId] = key.split(':');

                const config = await this.levelManager.getGuildConfig(guildId);
                if (!config || !config.enabled) {
                    this.activeVoiceSessions.delete(key);
                    continue;
                }

                const minutesSinceLastCheck = Math.floor((now - session.lastUpdate) / 60000);

                if (minutesSinceLastCheck >= 1) {
                    const guild = this.client.guilds.cache.get(guildId);
                    const member = guild?.members.cache.get(userId);
                    const voiceState = member?.voice;

                    const isActive = voiceState?.channelId === session.channelId &&
                        !(voiceState?.mute || voiceState?.deaf);

                    if (isActive) {
                        session.totalMinutes = (session.totalMinutes || 0) + minutesSinceLastCheck;

                        await this.giveVoiceRewards(userId, guildId, minutesSinceLastCheck, session.channelId);

                            this.levelManager.handleMissionProgress(
                                userId,
                                guildId,
                                'voice',
                                minutesSinceLastCheck
                            );

                    }

                    await this.updateVoiceMinutesInDB(userId, guildId, minutesSinceLastCheck);
                    session.lastUpdate = now;
                }
            } catch (error) {
            }
        }
    }

    async giveVoiceRewards(userId, guildId, minutes, channelId) {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);
            if (!config || !config.enabled) {
                return;
            }

            const member = this.client.guilds.cache.get(guildId)?.members.cache.get(userId);
            if (!member || !config) return;

            const baseCoins = (config.levelSettings.voiceCoinsPerMinute || 1) * minutes;
            const channelMultiplier = config.getChannelMultiplier(channelId) || 1;
            const userMultiplier = config.getUserMultiplier(member) || 1;


            const finalCoins = Math.floor(baseCoins * channelMultiplier * userMultiplier);
            if (finalCoins > 0) {
                await this.levelManager.economyManager.giveCurrency(
                    userId,
                    guildId,
                    'coins',
                    finalCoins,
                    'voice_interval'
                );

                const key = `${guildId}:${userId}`;
                const session = this.activeVoiceSessions.get(key);
                if (session) {
                    session.coinsEarned = (session.coinsEarned || 0) + finalCoins;
                }

            }
        } catch (error) {
            this.client.logger.error(`❌ Error dando recompensas a ${userId}:`, error);
        }
    }

    async updateVoiceMinutesInDB(userId, guildId, minutesToAdd) {
        try {
            const userLevel = await UserLevel.findOneAndUpdate(
                { guildId, userId },
                {
                    $inc: { voiceMinutes: minutesToAdd },
                    $set: { lastVoiceUpdate: new Date() }
                },
                { new: true, upsert: true }
            );

            return userLevel?.voiceMinutes || 0;
        } catch (error) {
            this.client.logger.error('❌ Error actualizando minutos de voz en DB:', error);
            throw error;
        }
    }

    async backupToDatabase() {
        try {
            const totalSessions = this.activeVoiceSessions.size;
            if (totalSessions === 0) return;

            for (const [key, session] of this.activeVoiceSessions.entries()) {
                const [guildId, userId] = key.split(':');
                const now = Date.now();

                const config = await this.levelManager.getGuildConfig(guildId);
                if (!config || !config.enabled) {
                    this.activeVoiceSessions.delete(key);
                    continue;
                }

                const minutesPending = Math.floor((now - session.lastUpdate) / 60000);

                if (minutesPending > 0) {
                    await this.updateVoiceMinutesInDB(userId, guildId, minutesPending);

                    const guild = this.client.guilds.cache.get(guildId);
                    const member = guild?.members.cache.get(userId);
                    const voiceState = member?.voice;

                    const isActive = !session.muted &&
                        voiceState?.channelId === session.channelId &&
                        !(voiceState?.mute || voiceState?.deaf);

                    if (isActive) {
                        await this.giveVoiceRewards(userId, guildId, minutesPending, session.channelId);
                    }

                    session.totalMinutes = (session.totalMinutes || 0) + minutesPending;
                    session.lastUpdate = now;

                }
            }
        } catch (error) {
            this.client.logger.error('❌ Error en backup:', error);
        }
    }

    async restoreActiveVoiceSessions() {
        try {
            const allGuilds = this.client.guilds.cache;
            let restoredSessions = 0;

            for (const [guildId, guild] of allGuilds) {
                const config = await this.levelManager.getGuildConfig(guildId);
                if (!config || !config.enabled) {
                    continue;
                }

                const voiceChannels = guild.channels.cache.filter(ch => ch.isVoiceBased());

                for (const [channelId, channel] of voiceChannels) {
                    const members = channel.members;

                    for (const [userId, member] of members) {
                        if (member.user.bot) continue;

                        const key = `${guildId}:${userId}`;
                        const voiceState = member.voice;

                        this.activeVoiceSessions.set(key, {
                            startTime: Date.now(),
                            lastUpdate: Date.now(),
                            channelId: channelId,
                            muted: voiceState.mute || voiceState.deaf,
                            streaming: voiceState.streaming || false,
                            totalMinutes: 0,
                            coinsEarned: 0,
                            restored: true
                        });

                        restoredSessions++;
                        this.voiceLogger.sessionRestored(member, channel);
                    }
                }
            }

            if (restoredSessions > 0) {
            }

        } catch (error) {
            this.client.logger.error('❌ Error restaurando sesiones:', error);
        }
    }

    cleanupOldSessions() {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, session] of this.activeVoiceSessions.entries()) {
            if (now - session.lastUpdate > 600000) {
                this.activeVoiceSessions.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
        }
    }

    async canEarnVoiceRewards(guildId, userId, channelId) {
        try {
            const config = await this.levelManager.getGuildConfig(guildId);

            if (!config || !config.enabled) {
                return { canEarn: false, reason: 'system_disabled' };
            }

            const guild = this.client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);

            if (!member) {
                return { canEarn: false, reason: 'member_not_found' };
            }

            if (!config.canEarnXP(member, channelId)) {
                return { canEarn: false, reason: 'channel_restricted' };
            }

            return { canEarn: true, reason: '' };
        } catch (error) {
            return { canEarn: false, reason: 'error', error };
        }
    }

    async getVoiceStats(userId, guildId) {
        try {
            const key = `${guildId}:${userId}`;
            const session = this.activeVoiceSessions.get(key);
            const userLevel = await UserLevel.findOne({ guildId, userId });

            return {
                activeSession: session ? {
                    channelId: session.channelId,
                    duration: session.totalMinutes,
                    muted: session.muted,
                    coinsEarned: session.coinsEarned || 0,
                    lastUpdate: new Date(session.lastUpdate).toLocaleTimeString()
                } : null,
                totalMinutes: userLevel?.voiceMinutes || 0,
                lastVoiceUpdate: userLevel?.lastVoiceUpdate
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo stats de voz:', error);
            return null;
        }
    }

    async processVoiceSession(key, shouldEnd = true) {
        const session = this.activeVoiceSessions.get(key);
        if (!session) return;

        try {
            const [guildId, userId] = key.split(':');
            const now = Date.now();

            const minutesPending = Math.floor((now - session.lastUpdate) / (60 * 1000));

            if (minutesPending > 0) {
                await this.updateVoiceMinutesInDB(userId, guildId, minutesPending);

                const guild = this.client.guilds.cache.get(guildId);
                const member = guild?.members.cache.get(userId);
                const voiceState = member?.voice;

                const wasActive = !session.muted &&
                    voiceState?.channelId === session.channelId &&
                    !(voiceState?.mute || voiceState?.deaf);

                if (wasActive) {
                    const config = await this.levelManager.getGuildConfig(guildId);
                    const baseCoins = config.levelSettings.voiceCoinsPerMinute * minutesPending;
                    const channelMultiplier = config.getChannelMultiplier(session.channelId);
                    const userMultiplier = config.getUserMultiplier(member);
                    const finalCoins = Math.floor(baseCoins * channelMultiplier * userMultiplier);

                    if (finalCoins > 0) {
                        await this.levelManager.economyManager.giveCurrency(
                            userId,
                            guildId,
                            'coins',
                            finalCoins,
                            'voice_final'
                        );
                        session.coinsEarned = (session.coinsEarned || 0) + finalCoins;
                    }
                }

                session.totalMinutes = (session.totalMinutes || 0) + minutesPending;
            }

            await this.levelManager.handleMissionProgress(
                userId,
                guildId,
                'voice',
                minutesPending
            );

            if (shouldEnd) {
                this.activeVoiceSessions.delete(key);
            }

        } catch (error) {
            this.client.logger.error(`❌ Error finalizando sesión ${key}:`, error);
        }
    }

    getActiveSessionsCount() {
        return this.activeVoiceSessions.size;
    }

    getUserSession(guildId, userId) {
        const key = `${guildId}:${userId}`;
        return this.activeVoiceSessions.get(key);
    }
}