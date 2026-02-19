import UserLevel from '../Models/UserLevel.js';
import GuildConfig from '../Models/GuildConfig.js';
import LevelRole from '../Models/LevelRole.js';
import UserPerk from '../Models/UserPerk.js';
import VoiceRewardManager from './VoiceRewardManager.js';
import EconomyManager from './EconomyManager.js';
import BoostManager from './BoostManager.js';
import NotificationManager from './NotificationManager.js';
import RateLimiter from './ratelimiter.js';
import MissionManager from './MissionManager.js';
import EventManager from './EventManager.js';
import LootBoxManager from './LootBoxManager.js';
import LootBoxSpawner from './LootBoxSpawner.js';
import JobsManager from './JobsManager.js';
import BlackMarketManager from './BlackMarketManager.js';
import MiningManager from './MiningManager.js';
import CraftingManager from './CraftingManager.js';
import PinataManager from './PinataManager.js';

export default class LevelManager {
    constructor(client) {
        this.client = client;
        this.db = client.db;
        this.cache = new Map();
        this.cacheTTL = 300000;

        this.voiceManager = new VoiceRewardManager(client, this);
        this.economyManager = new EconomyManager(client, this);
        this.boostManager = new BoostManager(client, this);
        this.notificationManager = new NotificationManager(client, this);
        this.eventManager = new EventManager(client, this);
        this.jobsManager = new JobsManager(client, this);
        this.rateLimiter = new RateLimiter();
        this.lootBoxManager = new LootBoxManager(client, this);
        this.lootBoxSpawner = new LootBoxSpawner(
            client,
            this.lootBoxManager,
            this,
            this.boostManager,
            this.eventManager
        );
        this.blackMarketManager = new BlackMarketManager(client, this);
        this.miningManager = new MiningManager(client, this)
        this.craftingManager = new CraftingManager(client, this)
        this.pinataManager = new PinataManager(client, this);

        this.leaderboardCache = new Map();
        this.setupBoostCleanup();
        this.levelUpLocks = new Set();

        if (client.isReady()) {
            this.voiceManager.restoreActiveVoiceSessions();
        } else {
            client.once('clientReady', () => {
                setTimeout(() => {
                    this.voiceManager.restoreActiveVoiceSessions();
                }, 5000);
            });
        }



        this.setupCleanupIntervals();

        setInterval(() => {
            this.eventManager.checkScheduledEvents();
            this.rateLimiter.cleanup();
        }, 60000);
    }

    clearCache(guildId = null) {
        if (!guildId) {
            this.cache.clear();
            this.leaderboardCache.clear();
            return;
        }

        const configKey = `guildconfig:${guildId}`;
        this.cache.delete(configKey);

        for (const key of this.cache.keys()) {
            if (key.startsWith(`userlevel:${guildId}:`)) {
                this.cache.delete(key);
            }
        }

        for (const key of this.leaderboardCache.keys()) {
            if (key.startsWith(`${guildId}:`)) {
                this.leaderboardCache.delete(key);
            }
        }
    }

    setupCleanupIntervals() {
        setInterval(() => {
            this.voiceManager.checkActiveSessions();
            this.voiceManager.cleanupOldSessions();
            this.cleanupExpiredCache();
        }, 60 * 1000);

        setInterval(() => {
            this.voiceManager.backupToDatabase();
        }, 120 * 1000);
    }

    setupBoostCleanup() {
        setInterval(async () => {
            await this.boostManager.cleanupExpiredBoosts();
        }, 5 * 60 * 1000);
    }

    async cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }

    // ========== CORE METHODS ==========

    async getOrCreateUserLevel(guildId, userId) {
        if (!guildId || !userId) {
            throw new Error('guildId o userId no definidos');
        }

        let userLevel = await UserLevel.findOne({ guildId, userId });

        if (!userLevel) {
            const guild = this.client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);

            userLevel = new UserLevel({
                guildId,
                userId,
                username: member?.user?.username || 'Usuario desconocido',
                xp: 0,
                level: 1,
                totalXP: 0,
                messages: 0,
                voiceMinutes: 0,
                coins: 100,
                tokens: 0,
                boostMultiplier: 1.0,
                stats: {
                    messagesToday: 0,
                    xpToday: 0,
                    lastDailyReset: new Date(),
                    lastDailyReward: null,
                    streakDays: 0,
                    lastStreak: new Date()
                }
            });

            await userLevel.save();
        }

        return userLevel;
    }

    async getUserLevelForRank(guildId, userId) {
        const cacheKey = `rank:${guildId}:${userId}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < 15000) {
            return cached.data;
        }

        const data = await UserLevel
            .findOne({ guildId, userId })
            .lean();

        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }


    async getGuildConfig(guildId) {
        const cacheKey = `guildconfig:${guildId}`;

        if (this.cache?.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 300000) {
                return cached.data;
            }
        }

        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({
                    guildId,

                    levelSettings: {
                        maxMessagesPerDay: 2000,
                        baseXP: 100,
                        growthRate: 1.5,

                        messageXP: {
                            min: 15,
                            max: 25,
                            cooldown: 60
                        },

                        voiceXP: {
                            perMinute: 10,
                            interval: 5,
                            maxPerSession: 500
                        },

                        coinsPerXP: 10,
                        voiceCoinsPerMinute: 1,

                        bonusChannels: {},
                        ignoredChannels: [],
                        ignoredRoles: [],
                        maxDailyXP: 20
                    },

                    eventSettings: {
                        enabled: true,
                        announcementChannel: null,
                        autoStartEvents: true,
                        eventNotifications: true,
                        allowedEvents: [
                            'double_xp_weekend',
                            'holiday_special',
                            'server_anniversary'
                        ],
                        customEvents: []
                    }
                });

                await config.save();
            }
            if (!config.levelSettings) {
                config.levelSettings = {
                    maxMessagesPerDay: 2000,
                    baseXP: 100,
                    growthRate: 1.5,
                    messageXP: { min: 15, max: 25, cooldown: 60 },
                    voiceXP: { perMinute: 10, interval: 5, maxPerSession: 500 },
                    coinsPerXP: 10,
                    voiceCoinsPerMinute: 1,
                    bonusChannels: {},
                    ignoredChannels: [],
                    ignoredRoles: [],
                    maxDailyXP: 20
                };
                await config.save();
            }

            this.cache?.set(cacheKey, {
                data: config,
                timestamp: Date.now()
            });

            return config;

        } catch (error) {
            this.client.logger.error('❌ Error obteniendo GuildConfig:', error);
            throw error;
        }
    }

    async handleMessage(message) {
        try {
            const { author, guild, channel } = message;
            if (!author || !guild || author.bot) return;

            const userId = author.id;
            const guildId = guild.id;
            const channelId = channel.id;
            const member = message.member;

            if (!userId || !guildId) return;

            const config = await this.getGuildConfig(guildId);
            if (!config?.enabled || !member || !config.canEarnXP(member, channelId)) return;

            const cooldownCheck = await this.isOnCooldown(userId, guildId, config);
            if (cooldownCheck?.onCooldown) {
                await UserLevel.updateOne(
                    { guildId, userId },
                    { $inc: { messages: 1, 'stats.messagesToday': 1 } }
                );
                return;
            }

            const userLevel = await this.getOrCreateUserLevel(guildId, userId);
            await this.checkDailyReset(userLevel);

            if (await this.isOverMessageLimit(userLevel, config, userId, guildId)) return;

            const xpResult = await this.calculateMessageXP(userId, guildId, member, channelId, config);
            if (!xpResult.success) return;

            const dailyXP = userLevel.stats?.xpToday || 0;
            let xpToGive = xpResult.finalXP;
            const maxDailyXP = config.levelSettings.maxDailyXP || 0;

            if (maxDailyXP > 0) {
                if (dailyXP >= maxDailyXP) xpToGive = 0;
                else if (dailyXP + xpToGive > maxDailyXP) xpToGive = maxDailyXP - dailyXP;
            }

            if (xpToGive <= 0) {
                await this.updateMessageCount(userId, guildId);
                return;
            }

            const levelUpResult = await this.addXP(userId, guildId, xpToGive, 'message', message);

            await UserLevel.updateOne(
                { guildId, userId },
                {
                    $inc: {
                        messages: 1,
                        'stats.messagesToday': 1,
                        'stats.xpToday': xpToGive
                    },
                    $set: { xpCooldown: new Date() }
                }
            );

            const coinsToGive = 3;
            if (coinsToGive > 0) {
                await this.economyManager.giveCurrency(
                    userId,
                    guildId,
                    'coins',
                    coinsToGive,
                    'message'
                );
            }

            let tokensGiven = 0;
            if (Math.random() < 0.01) {
                tokensGiven = 1;
                await this.economyManager.giveCurrency(
                    userId,
                    guildId,
                    'tokens',
                    1,
                    'message_lucky'
                );
            }

            let lootboxResult = { spawned: false };
            if (this.lootBoxSpawner) {
                lootboxResult = await this.lootBoxSpawner.checkForLootBox(message);
            }

            await this.handleMissionProgress(userId, guildId, 'messages', 1);
            await this.handleMissionProgress(userId, guildId, 'xp', xpToGive);

            if (lootboxResult.spawned) {
                await this.handleMissionProgress(userId, guildId, 'lootbox', 1);
            }

        } catch (error) {
            this.client.logger.error('❌ Error en handleMessage:', error);
        }
    }

    // ========== MESSAGE HANDLING ==========

    async checkDailyReset(userLevel) {
        const now = new Date();
        const lastReset = userLevel.stats?.lastDailyReset ?? now;

        if (now.toDateString() !== new Date(lastReset).toDateString()) {
            userLevel.stats.messagesToday = 0;
            userLevel.stats.xpToday = 0;
            userLevel.stats.lastDailyReset = now;

            await userLevel.save();
        }
    }

    async isOnCooldown(userId, guildId, config) {
        try {
            const userLevel = await UserLevel.findOne({ guildId, userId }).select('xpCooldown');

            if (!userLevel || !userLevel.xpCooldown) {
                return false;
            }

            const now = Date.now();
            const cooldownEnd = new Date(userLevel.xpCooldown).getTime() +
                (config.levelSettings.messageXP.cooldown * 1000);

            if (now < cooldownEnd) {
                const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
                return {
                    onCooldown: true,
                    remainingSeconds: remainingSeconds,
                    cooldownEnd: new Date(cooldownEnd)
                };
            }

            await UserLevel.updateOne(
                { guildId, userId },
                { $set: { xpCooldown: null } }
            );

            return false;

        } catch (error) {
            this.client.logger.error('❌ Error en isOnCooldown:', error);
            return false;
        }
    }

    async updateMessageCount(userId, guildId) {
        try {
            await UserLevel.updateOne(
                { guildId, userId },
                {
                    $inc: {
                        messages: 1,
                        'stats.messagesToday': 1
                    }
                }
            );

            const cacheKey = `userlevel:${guildId}:${userId}`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                cached.data.messages += 1;
                cached.data.stats.messagesToday += 1;
            }

        } catch (error) {
            this.client.logger.error('❌ Error actualizando contador de mensajes:', error);
        }
    }

    async isOverMessageLimit(userLevel, config, userId, guildId) {
        const maxMessages = config.levelSettings.maxMessagesPerDay || 0;
        const messagesToday = userLevel.stats?.messagesToday || 0;
        if (maxMessages > 0 && messagesToday >= maxMessages) {

            const baseXPPreview = this.getRandomXP(
                config.levelSettings.messageXP.min,
                config.levelSettings.messageXP.max
            );
            const coinsPerXP = config.levelSettings.coinsPerXP || 10;
            const previewCoins = Math.floor(baseXPPreview / coinsPerXP);
            const reducedCoins = Math.floor(previewCoins * 0.1);

            if (reducedCoins > 0) {
                await this.economyManager.giveCurrency(
                    userId,
                    guildId,
                    'coins',
                    reducedCoins,
                    'message_limit_reached'
                );
            }

            await UserLevel.updateOne(
                { guildId, userId },
                {
                    $set: { xpCooldown: new Date() },
                    $inc: {
                        messages: 1,
                        'stats.messagesToday': 1
                    }
                }
            );
            return true;
        }
        return false;
    }

    async isOverDailyXPLimit(userLevel, config, xpToAdd) {
        const maxDailyXP = config.levelSettings.maxDailyXP || 0;
        const xpToday = userLevel.stats?.xpToday || 0;
        if (maxDailyXP > 0 && xpToday >= maxDailyXP) {
            return true;
        }
        if (maxDailyXP > 0 && (xpToday + xpToAdd) > maxDailyXP) {
            return maxDailyXP - xpToday;
        }

        return false;
    }

    async calculateMessageXP(userId, guildId, member, channelId, config) {
        const baseXP = this.getRandomXP(
            config.levelSettings.messageXP.min,
            config.levelSettings.messageXP.max
        );

        const channelMultiplier = config.getChannelMultiplier(channelId);
        const userMultiplier = config.getUserMultiplier(member);
        const perkMultiplier = await this.getPerkMultiplier(userId, guildId);
        const boostMultiplier = await this.boostManager.getEffectiveBoostMultiplier(userId, guildId);

        let finalXP = Math.floor(baseXP * channelMultiplier * userMultiplier * perkMultiplier * boostMultiplier);

        const maxXP = config.levelSettings.messageXP.max;
        if (finalXP > maxXP) {
            finalXP = maxXP;
        }

        return {
            success: true,
            baseXP,
            finalXP,
            multipliers: {
                channel: channelMultiplier,
                user: userMultiplier,
                perk: perkMultiplier,
                boost: boostMultiplier
            }
        };
    }

    async updateMessageStats(userId, guildId, xpEarned) {
        await UserLevel.updateOne(
            { guildId, userId },
            {
                $set: { xpCooldown: new Date() },
                $inc: {
                    messages: 1,
                    'stats.messagesToday': 1,
                    'stats.xpToday': xpEarned
                }
            }
        );
    }

    // ========== VOICE HANDLING ==========

    async handleVoiceStateUpdate(oldState, newState) {
        await this.voiceManager.handleVoiceStateUpdate(oldState, newState);
    }

    // ========== XP METHODS ==========

    async addXP(userId, guildId, amount, source = 'unknown', context = null) {
        const userLevel = await this.getOrCreateUserLevel(guildId, userId);

        const oldLevel = userLevel.level;

        const result = await this.boostManager.addXP(userId, guildId, amount, source);

        const newLevel = await userLevel.calculateLevel();

        if (newLevel > oldLevel) {
            userLevel.level = newLevel;
         //   await userLevel.save();

            this.client.logger.info(
                `LEVEL DETECTED ${userId}: ${oldLevel} → ${newLevel}`
            );
            await this.handleLevelUp(
                guildId,
                userId,
                oldLevel,
                newLevel,
                context
            );
        } else {
          //  await userLevel.save();
        }

        return {
            ...result,
            oldLevel,
            newLevel,
            leveledUp: newLevel > oldLevel
        };
    }


    async removeXP(userId, guildId, amount, reason = 'admin') {
        try {
            const userLevel = await this.getOrCreateUserLevel(guildId, userId);
            const result = await userLevel.removeXP(amount);

            await this.logXPTransaction(userId, guildId, -amount, `removed_${reason}`);

            return result;
        } catch (error) {
            this.client.logger.error('❌ Error removiendo XP:', error);
            throw error;
        }
    }

    async setLevel(userId, guildId, targetLevel) {
        try {
            const userLevel = await this.getOrCreateUserLevel(guildId, userId);
            const config = await this.getGuildConfig(guildId);

            const requiredXP = await userLevel.getRequiredXPForLevel(targetLevel);

            userLevel.xp = requiredXP;
            userLevel.level = targetLevel;
            userLevel.totalXP = Math.max(userLevel.totalXP, requiredXP);

            await userLevel.save();

            return {
                success: true,
                oldLevel: userLevel.level,
                newLevel: targetLevel,
                xpSet: requiredXP
            };
        } catch (error) {
            this.client.logger.error('❌ Error estableciendo nivel:', error);
            throw error;
        }
    }

    // ========== LEVEL UP HANDLING ==========

    async handleLevelUpBonus(userId, guildId, newLevel) {
        await this.economyManager.handleLevelUpBonus(userId, guildId, newLevel);
    }

    async handleLevelUp(guildId, userId, oldLevel, newLevel, context = null) {
        const lockKey = `${guildId}:${userId}`;

        // 🔒 Lock global por usuario
        if (this.levelUpLocks.has(lockKey)) {
            this.client.logger.warn(`⚠️ Level up ya en proceso: ${lockKey}`);
            return;
        }

        this.levelUpLocks.add(lockKey);

        try {
            this.client.logger.info(
                `🎊 Procesando level up: ${userId} | ${oldLevel} → ${newLevel}`
            );

            const guild = this.client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);

            if (!member) {
                this.client.logger.warn(
                    `⚠️ Miembro ${userId} no encontrado en guild ${guildId}`
                );
                return;
            }

            // 📦 DATOS BASE (UNA SOLA VEZ)
            const userLevel = await this.getOrCreateUserLevel(guildId, userId);
            const rankInfo = await this.getUserRank(guildId, userId);

            let allRolesAdded = [];

            // 🔁 PROCESAR CADA NIVEL INTERMEDIO
            for (let level = oldLevel + 1; level <= newLevel; level++) {

                // 🎭 Roles
                const roles = await this.grantRewardRoles(
                    guildId,
                    userId,
                    level,
                    level - 1
                );

                if (roles?.length) {
                    allRolesAdded.push(...roles);
                }

                // 🎁 Perks
                await this.checkAndGrantPerks(guildId, userId, level);
            }

            // 📢 NOTIFICACIÓN (UNA SOLA VEZ)
            this.client.logger.info(
                `📢 Enviando notificación de level up a ${userId}`
            );

            await this.notificationManager.sendLevelUpNotification({
                guildId,
                member,
                oldLevel,
                newLevel,
                rolesAdded: allRolesAdded,
                userLevel,
                rankInfo,
                context
            });

            // 🧹 Limpiar leaderboard
            this.clearLeaderboardCache(guildId);

            this.client.logger.info(
                `✅ Level up completado: ${userId} → Nivel ${newLevel}`
            );

            return {
                newLevel,
                rolesAdded: allRolesAdded
            };

        } catch (error) {
            this.client.logger.error('❌ Error en handleLevelUp:', error);
            throw error;

        } finally {
            // 🔓 Liberar lock (sin timeout)
            this.levelUpLocks.delete(lockKey);
        }
    }


    clearLeaderboardCache(guildId) {
        for (const key of this.leaderboardCache.keys()) {
            if (key.startsWith(`${guildId}:`)) {
                this.leaderboardCache.delete(key);
            }
        }
    }

    async grantRewardRoles(guildId, userId, newLevel, oldLevel) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);

            if (!member) {
                return [];
            }

            const addedRoles = [];

            for (let currentLevel = oldLevel + 1; currentLevel <= newLevel; currentLevel++) {

                const levelRole = await LevelRole.findOne({
                    guildId,
                    level: currentLevel
                });

                if (!levelRole) {
                    continue;
                }

                const role = guild.roles.cache.get(levelRole.roleId);

                if (!role) {
                    continue;
                }

                if (member.roles.cache.has(role.id)) {
                    continue;
                }

                const botMember = guild.members.cache.get(this.client.user.id);

                if (!botMember.permissions.has('ManageRoles')) {
                    break;
                }

                if (botMember.roles.highest.position <= role.position) {
                    continue;
                }

                try {
                    await member.roles.add(role);

                    addedRoles.push({
                        roleId: role.id,
                        roleName: role.name,
                        level: currentLevel,
                        levelRoleName: levelRole.name,
                        timestamp: new Date()
                    });

                    levelRole.stats.activeUsers = (levelRole.stats.activeUsers || 0) + 1;
                    await levelRole.save();

                    if (!levelRole.permissions.stackable && levelRole.permissions.autoRemove) {
                        await this.removePreviousLevelRoles(member, guildId, currentLevel);
                    }

                } catch (error) {
                    this.client.logger.error(`   ❌ Error otorgando rol:`, error.message);
                }
            }

            console.log(`\n📊 RESUMEN: Se otorgaron ${addedRoles.length} roles`);
            if (addedRoles.length > 0) {
                addedRoles.forEach(r => console.log(`   • ${r.roleName} (Nivel ${r.level})`));
            }

            return addedRoles;

        } catch (error) {
            this.client.logger.error('❌ Error en grantRewardRoles:', error);
            return [];
        }
    }

    async removePreviousLevelRoles(member, guildId, currentLevel) {
        try {
            const previousRoles = await LevelRole.find({
                guildId,
                level: { $lt: currentLevel },
                'permissions.stackable': false,
                'permissions.autoRemove': true
            });

            for (const levelRole of previousRoles) {
                if (member.roles.cache.has(levelRole.roleId)) {
                    const role = member.guild.roles.cache.get(levelRole.roleId);
                    if (role) {
                        await member.roles.remove(role.id).catch(() => { });

                        if (levelRole.stats.activeUsers > 0) {
                            levelRole.stats.activeUsers--;
                            await levelRole.save();
                        }
                    }
                }
            }
        } catch (error) {
            this.client.logger.error('Error removiendo roles anteriores:', error);
        }
    }

    // ========== PERK METHODS ==========

    async getPerkMultiplier(userId, guildId) {
        try {
            const activePerks = await UserPerk.find({
                userId,
                guildId,
                active: true,
                $or: [
                    { expiresAt: null },
                    { expiresAt: { $gt: new Date() } }
                ]
            });

            let multiplier = 1.0;
            for (const perk of activePerks) {
                multiplier *= perk.effects.xpMultiplier || 1.0;
            }

            return multiplier;
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo perk multiplier:', error);
            return 1.0;
        }
    }

    async checkAndGrantPerks(guildId, userId, newLevel) {
        try {
            const perkLevels = [
                { level: 5, perkId: 'beginner_boost' },
                { level: 10, perkId: 'intermediate_boost' },
                { level: 25, perkId: 'advanced_boost' },
                { level: 50, perkId: 'expert_boost' },
                { level: 100, perkId: 'master_boost' }
            ];

            for (const perkLevel of perkLevels) {
                if (newLevel >= perkLevel.level) {
                    await this.grantPerk(userId, guildId, perkLevel.perkId);
                }
            }
        } catch (error) {
            this.client.logger.error('❌ Error otorgando perks:', error);
        }
    }

    async grantPerk(userId, guildId, perkId, source = 'level') {
        try {
            const existingPerk = await UserPerk.findOne({
                userId,
                guildId,
                perkId
            });

            if (existingPerk) return existingPerk;

            const perkData = await this.getPerkTemplate(perkId);
            if (!perkData) return null;

            const newPerk = new UserPerk({
                userId,
                guildId,
                perkId,
                ...perkData,
                metadata: {
                    ...perkData.metadata,
                    source
                }
            });

            await newPerk.save();

            const userLevel = await this.getOrCreateUserLevel(guildId, userId);
            userLevel.perks.push({
                perkId,
                activated: false,
                expiresAt: null
            });

            await userLevel.save();

            return newPerk;
        } catch (error) {
            this.client.logger.error('❌ Error otorgando perk:', error);
            throw error;
        }
    }

    async getPerkTemplate(perkId) {
        const perkTemplates = {
            'beginner_boost': {
                name: 'Boost de Principiante',
                description: 'XP +10% por 24 horas',
                type: 'xp',
                tier: 1,
                effects: { xpMultiplier: 1.1 },
                limitations: { duration: 24 },
                metadata: { rarity: 'common' }
            },
            'intermediate_boost': {
                name: 'Boost Intermedio',
                description: 'XP +15% por 48 horas',
                type: 'xp',
                tier: 2,
                effects: { xpMultiplier: 1.15 },
                limitations: { duration: 48 },
                metadata: { rarity: 'uncommon' }
            },
            'advanced_boost': {
                name: 'Boost Avanzado',
                description: 'XP +25% por 72 horas',
                type: 'xp',
                tier: 3,
                effects: { xpMultiplier: 1.25 },
                limitations: { duration: 72 },
                metadata: { rarity: 'rare' }
            },
            'expert_boost': {
                name: 'Boost de Experto',
                description: 'XP +35% por 7 días',
                type: 'xp',
                tier: 4,
                effects: { xpMultiplier: 1.35 },
                limitations: { duration: 168 },
                metadata: { rarity: 'epic' }
            },
            'master_boost': {
                name: 'Boost Maestro',
                description: 'XP +50% por 14 días',
                type: 'xp',
                tier: 5,
                effects: { xpMultiplier: 1.5 },
                limitations: { duration: 336 },
                metadata: { rarity: 'legendary' }
            }
        };

        return perkTemplates[perkId] || null;
    }

    // ========== LEADERBOARD METHODS ==========

    async getLeaderboard(guildId, type = 'level', limit = 10, offset = 0) {
        try {
            const cacheKey = `${guildId}:${type}:${limit}:${offset}`;
            if (this.leaderboardCache.has(cacheKey)) {
                const cached = this.leaderboardCache.get(cacheKey);
                if (Date.now() - cached.timestamp < 300000) return cached.data;
            }

            let query = UserLevel.find({ guildId });
            let sortField = 'level';
            switch (type) {
                case 'xp': sortField = 'xp'; break;
                case 'totalxp': sortField = 'totalXP'; break;
                case 'messages': sortField = 'messages'; break;
                case 'voice': sortField = 'voiceMinutes'; break;
                case 'daily': sortField = 'stats.dailyXp'; break;
                case 'weekly': sortField = 'stats.weeklyXp'; break;
                case 'monthly': sortField = 'stats.monthlyXp'; break;
                case 'coins': sortField = 'coins'; break;
                case 'tokens': sortField = 'tokens'; break;
            }

            const leaderboard = await query
                .sort({ [sortField]: -1 })
                .skip(offset)
                .limit(limit)
                .lean();

            const enrichedLeaderboard = leaderboard.map((entry, index) => ({
                ...entry,
                rank: offset + index + 1,
                username: entry.username || 'Usuario desconocido'
            }));

            this.leaderboardCache.set(cacheKey, {
                timestamp: Date.now(),
                data: enrichedLeaderboard
            });

            return enrichedLeaderboard;

        } catch (error) {
            this.client.logger.error('❌ Error obteniendo leaderboard:', error);
            throw error;
        }
    }

    async getUserRank(guildId, userId) {
        try {
            const userLevel = await UserLevel.findOne({ guildId, userId });
            if (!userLevel) return null;

            const totalUsers = await UserLevel.countDocuments({ guildId });
            const higherRanked = await UserLevel.countDocuments({
                guildId,
                $or: [
                    { level: { $gt: userLevel.level } },
                    { level: userLevel.level, xp: { $gt: userLevel.xp } }
                ]
            });

            return {
                rank: higherRanked + 1,
                totalUsers,
                percentile: ((higherRanked + 1) / totalUsers) * 100,
                coins: userLevel.coins,
                tokens: userLevel.tokens,
                level: userLevel.level,
                xp: userLevel.xp
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo rank de usuario:', error);
            throw error;
        }
    }

    // ========== UTILITY METHODS ==========

    async calculateRequiredXP(guildId, level) {
        const config = await this.getGuildConfig(guildId);
        const { baseXP, growthRate } = config.levelSettings;
        return Math.floor(baseXP * Math.pow(level + 1, growthRate));
    }

    getRandomXP(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async logXPTransaction(userId, guildId, amount, source) {
        try {
            this.client.logger.info(`📝 XP: ${userId}@${guildId} | ${amount} XP | Source: ${source}`);
        } catch (error) {
            this.client.logger.error('❌ Error registrando transacción de XP:', error);
        }
    }

    async getStats(guildId) {
        try {
            const totalUsers = await UserLevel.countDocuments({ guildId });
            const activeToday = await UserLevel.countDocuments({
                guildId,
                'stats.lastStreak': {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                }
            });

            const totalXP = await UserLevel.aggregate([
                { $match: { guildId } },
                { $group: { _id: null, total: { $sum: '$totalXP' } } }
            ]);

            const totalCoins = await UserLevel.aggregate([
                { $match: { guildId } },
                { $group: { _id: null, total: { $sum: '$coins' } } }
            ]);

            const totalTokens = await UserLevel.aggregate([
                { $match: { guildId } },
                { $group: { _id: null, total: { $sum: '$tokens' } } }
            ]);

            const averageLevel = await UserLevel.aggregate([
                { $match: { guildId } },
                { $group: { _id: null, average: { $avg: '$level' } } }
            ]);

            return {
                totalUsers,
                activeToday,
                totalXP: totalXP[0]?.total || 0,
                totalCoins: totalCoins[0]?.total || 0,
                totalTokens: totalTokens[0]?.total || 0,
                averageLevel: Math.round(averageLevel[0]?.average || 1)
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    async resetUser(userId, guildId, options = {}) {
        try {
            const resetOptions = {
                xp: true,
                level: true,
                perks: false,
                items: false,
                economy: false,
                ...options
            };

            const userLevel = await this.getOrCreateUserLevel(guildId, userId);

            if (resetOptions.xp) {
                userLevel.xp = 0;
                userLevel.totalXP = 0;
            }

            if (resetOptions.level) {
                userLevel.level = 1;
            }

            if (resetOptions.economy) {
                userLevel.coins = 100;
                userLevel.tokens = 0;
                userLevel.transactions = [];
                userLevel.purchaseHistory = [];
                userLevel.activeItems = [];
            }

            if (resetOptions.perks) {
                await UserPerk.deleteMany({ userId, guildId });
                userLevel.perks = [];
            }

            if (resetOptions.items) {
                userLevel.purchasedItems = [];
            }

            await userLevel.save();

            return {
                success: true,
                resetOptions
            };
        } catch (error) {
            this.client.logger.error('❌ Error reiniciando usuario:', error);
            throw error;
        }
    }

    // ========== ECONOMY METHODS (Delegados) ==========

    async giveCurrency(userId, guildId, currency, amount, source) {
        return await this.economyManager.giveCurrency(userId, guildId, currency, amount, source);
    }

    async takeCurrency(userId, guildId, currency, amount, reason = 'purchase') {
        return await this.economyManager.takeCurrency(userId, guildId, currency, amount, reason);
    }

    async transferCurrency(fromUserId, toUserId, guildId, currency, amount, reason = 'transfer') {
        return await this.economyManager.transferCurrency(fromUserId, toUserId, guildId, currency, amount, reason);
    }

    async getUserEconomy(userId, guildId) {
        return await this.economyManager.getUserEconomy(userId, guildId);
    }

    async giveDailyReward(userId, guildId) {
        return await this.economyManager.giveDailyReward(userId, guildId);
    }

    async purchaseItem(userId, guildId, itemId, quantity = 1) {
        return await this.economyManager.purchaseItem(userId, guildId, itemId, quantity);
    }

    async getShopItems(guildId, category = 'all') {
        return await this.economyManager.getShopItems(guildId, category);
    }

    async getInventory(userId, guildId) {
        return await this.economyManager.getInventory(userId, guildId);
    }

    async giveItem(userId, guildId, itemId, quantity = 1) {
        return await this.economyManager.giveItem(userId, guildId, itemId, quantity)
    }

    // ========== BOOST METHODS (Delegados) ==========

    async getUserActiveBoost(userId, guildId) {
        return await this.boostManager.getUserActiveBoost(userId, guildId);
    }

    async getUserBoosts(userId, guildId) {
        return await this.boostManager.getUserBoosts(userId, guildId);
    }

    async checkBoostStatus(userId, guildId) {
        return await this.boostManager.checkBoostStatus(userId, guildId);
    }

    async getEffectiveBoostMultiplier(userId, guildId) {
        return await this.boostManager.getEffectiveBoostMultiplier(userId, guildId);
    }

    async verificarBoostEnTiempoReal(userId, guildId, xpBase, xpFinal) {
        return await this.boostManager.verificarBoostEnTiempoReal(userId, guildId, xpBase, xpFinal);
    }

    // ========== VOICE METHODS (Delegados) ==========

    async canEarnVoiceRewards(guildId, userId, channelId) {
        return await this.voiceManager.canEarnVoiceRewards(guildId, userId, channelId);
    }

    async getVoiceStats(userId, guildId) {
        return await this.voiceManager.getVoiceStats(userId, guildId);
    }

    // ========== NOTIFICATION METHODS (Delegados) ==========

    async sendLevelUpNotification(guildId, userId, newLevel, rolesAdded, context = null, userData = {}) {
        return await this.notificationManager.sendLevelUpNotification(
            guildId, userId, newLevel, rolesAdded, context, userData
        );
    }

    async sendRoleRewardNotification(guildId, userId, role, level) {
        return await this.notificationManager.sendRoleRewardNotification(guildId, userId, role, level);
    }

    // ========== ADMIN METHODS ==========

    async resetAllUsersEconomy(guildId, resetType = 'coins') {
        try {
            const updateField = resetType === 'coins' ? { coins: 0 } : { tokens: 0 };

            const result = await UserLevel.updateMany(
                { guildId },
                {
                    $set: updateField,
                    $push: {
                        transactions: {
                            type: 'system',
                            amount: 0,
                            currency: resetType,
                            description: `Reset masivo por administrador`,
                            source: 'admin_reset',
                            timestamp: new Date()
                        }
                    }
                }
            );

            return {
                success: true,
                resetType,
                usersAffected: result.modifiedCount
            };
        } catch (error) {
            this.client.logger.error(`❌ Error resetting ${resetType}:`, error);
            throw error;
        }
    }

    // ========== MISSION METHODS ==========

    async handleMissionProgress(userId, guildId, type, amount = 1) {
        return await MissionManager.handleProgress(
            userId,
            guildId,
            type,
            amount
        );
    }

    async getUserMissions(userId, guildId) {
        return await MissionManager.getMissions(userId, guildId);
    }

    async claimMission(userId, guildId, missionId, scope = 'daily') {
        return await MissionManager.claim(
            userId,
            guildId,
            missionId,
            scope
        );
    }

    // ========== EVENT METHODS ==========

    async startEvent(eventId, durationHours, customData) {
        return await this.eventManager.startEvent(eventId, durationHours, customData);
    }

    async getActiveEvents() {
        return this.eventManager.getActiveEvents();
    }

    async applyEventRewards(userId, guildId, amount, type, source) {
        return await this.eventManager.applyEventRewards(userId, guildId, amount, type, source);
    }

    // ========== RATE LIMIT METHODS ==========

    canProceed(userId, action, customLimit) {
        return this.rateLimiter.canProceed(userId, action, customLimit);
    }

    clearRateLimit(userId, action) {
        return this.rateLimiter.clearAttempts(userId, action);
    }

    async cleanupExpiredBoosts() {
        return await this.boostManager.cleanupExpiredBoosts();
    }

    // ========== JOB METHODS ==========


    async joinJob(userId, guildId, jobId) {
        return await this.jobsManager.joinJob(userId, guildId, jobId);
    }

    async leaveJob(userId, guildId, jobId) {
        return await this.jobsManager.leaveJob(userId, guildId, jobId);
    }

    async setActiveJob(userId, guildId, jobId) {
        return await this.jobsManager.setActiveJob(userId, guildId, jobId);
    }

    async getUserJobs(userId, guildId) {
        return await this.jobsManager.getUserJobs(userId, guildId);
    }

    async getActiveJobInfo(userId, guildId) {
        return await this.jobsManager.getActiveJobInfo(userId, guildId);
    }

    async workJob(userId, guildId) {
        return await this.jobsManager.work(userId, guildId);
    }

    async claimWeeklySalary(userId, guildId) {
        return await this.jobsManager.claimWeeklySalary(userId, guildId);
    }

    async claimMonthlySalary(userId, guildId) {
        return await this.jobsManager.claimMonthlySalary(userId, guildId);
    }

    // ========== BLACK MARKET METHODS ==========

    async getBlackMarketStatus(userId, guildId) {
        return this.blackMarketManager.getStatus(userId, guildId);
    }

    async blackMarketGamble(userId, guildId, amount, currency = 'coins') {
        return this.blackMarketManager.gamble(userId, guildId, amount, currency);
    }

    async blackMarketStats(userId, guildId) {
        return (await this.blackMarketManager.getStatus(userId, guildId)).stats;
    }

    async blackMarketHeat(userId, guildId) {
        return (await this.blackMarketManager.getStatus(userId, guildId)).heat;
    }

    async blackMarketPayBail(userId, guildId) {
        return this.blackMarketManager.payBail(userId, guildId);
    }

    async blackMarketLaunder(userId, guildId) {
        return this.blackMarketManager.launder(userId, guildId);
    }

    // ========== MINING METHODS ==========

    async mine(userId, guildId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return await this.miningManager.mine(user);
    }

    async setMiningZone(userId, guildId, zoneId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return await this.miningManager.setMiningZone(user, zoneId);
    }

    // ========== CRAFTING METHODS ==========

    async craft(userId, guildId, blueprintId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return await this.craftingManager.craft(user, blueprintId);
    }

    async getBlueprint(blueprintId) {
        return this.craftingManager.getBlueprint(blueprintId);
    }

    async getAvailableBlueprints(userId, guildId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return this.craftingManager.getAvailableBlueprints(user);
    }

    async canCraft(userId, guildId, blueprintId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return this.craftingManager.canCraft(user, blueprintId);
    }

    async getCraftingInventory(userId, guildId) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return user.crafting.materials;
    }


}