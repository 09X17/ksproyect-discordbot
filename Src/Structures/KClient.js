import { Client, Collection, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import * as Helpers from '../Utils/Helpers.js';
import * as Embeds from '../Utils/Embeds.js';
import Logger from '../Utils/logger.js';
import settings from '../Config/Settings.js';

export default class KClient extends Client {
    constructor(options = {}) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences,
            ],
            partials: [
                Partials.Channel,
                Partials.Message,
                Partials.Reaction,
                Partials.User,
                Partials.GuildMember
            ],
            allowedMentions: {
                parse: ['users', 'roles', 'everyone'],
                repliedUser: true
            },
            ...options
        });

        /* Core Collections */
        this.commands = new Collection();
        this.aliases = new Collection();
        this.slashCommands = new Collection();
        this.events = new Collection();

        /* Runtime Maps */
        this.cooldowns = new Map();
        this.activeTrades = new Map();

        /* Utilities */
        this.helpers = Helpers;
        this.embeds = Embeds;
        this.logger = Logger;
        this.config = settings;

        /* External Systems */
        this.db = null;
        this.ticketManager = null;
        this.reviewManager = null;
        this.embedManager = null;
        this.levelManager = null;
        this.contestManager = null;
        this.welcomeManager = null;

        /* Runtime Info */
        this.startTime = Date.now();
        this.initialized = false;

        /* Activity Rotation */
        this.activities = [
            { name: 'HKS', type: ActivityType.Watching },
            { name: 'HKS', type: ActivityType.Playing },
            { name: 'HKS', type: ActivityType.Listening },
        ];
        this.activityIndex = 0;
        this.activityInterval = null;

        this.validateConfig();
    }

    /* ================================================= */
    /* CONFIG VALIDATION */
    /* ================================================= */

    validateConfig() {
        if (!this.config.token) {
            throw new Error('❌ DISCORD_TOKEN is not configured.');
        }

        if (!this.config.prefix) {
            this.logger.warn('⚠️ No prefix configured. Using default value.');
            this.config.prefix = process.env.PREFIX || 'ks!';
        }
    }

    validateEnvironment() {
        const required = ['DISCORD_TOKEN'];
        const missing = required.filter(env => !process.env[env]);

        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }
    }

    /* ================================================= */
    /* INITIALIZATION */
    /* ================================================= */

    async initialize() {
        try {
            this.logger.info('🚀 Starting bot...', {
                version: process.env.npm_package_version || '1.0.0',
                node: process.version,
                platform: process.platform
            });

            await this.loadDatabase();
            await this.loadHandlers();
            await this.login(this.config.token);

            this.setupActivityRotation();

            this.initialized = true;

            this.logger.success('✅ Bot initialized successfully.', {
                user: this.user?.tag,
                guilds: this.guilds.cache.size
            });

        } catch (error) {
            this.logger.error('❌ Failed to initialize bot:', error);
            await this.emergencyShutdown('initialization_failed');
        }
    }

    /* ================================================= */
    /* DATABASE */
    /* ================================================= */

    async loadDatabase() {
        try {
            const { default: databaseHandler } = await import('../Handlers/databaseHandler.js');
            await databaseHandler(this);
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                this.logger.warn('📝 Database handler not found — continuing without database.');

                this.db = {
                    status: 0,
                    models: {},
                    isConnected: () => false,
                    disconnect: async () => {}
                };
            } else {
                this.logger.error('❌ Error loading database:', error);
                throw error;
            }
        }
    }

    /* ================================================= */
    /* HANDLERS */
    /* ================================================= */

    async loadHandlers() {
        const handlers = [
            { name: 'event', priority: 1 },
            { name: 'level', priority: 2 },
            { name: 'command', priority: 3 },
            { name: 'slash', priority: 4 },
            { name: 'ticket', priority: 5 },
            { name: 'contest', priority: 6 },
            { name: 'embed', priority: 7 }
        ].sort((a, b) => a.priority - b.priority);

        for (const handler of handlers) {
            try {
                const { default: loadHandler } = await import(`../Handlers/${handler.name}Handler.js`);
                await loadHandler(this);

                this.logger.success(`✅ ${handler.name}Handler loaded successfully.`);
            } catch (error) {
                if (error.code === 'MODULE_NOT_FOUND') {
                    this.logger.warn(`📝 ${handler.name}Handler not found — continuing.`);
                } else {
                    this.logger.error(`❌ Error loading ${handler.name}Handler:`, error);

                    if (handler.priority <= 3) {
                        throw error; // Critical handlers stop startup
                    }
                }
            }
        }
    }

    /* ================================================= */
    /* ACTIVITY ROTATION */
    /* ================================================= */

    setupActivityRotation() {
        if (!this.user || !this.activities.length) return;

        this.updateActivity();

        this.activityInterval = setInterval(() => {
            this.updateActivity();
        }, 30000);
    }

    updateActivity() {
        if (!this.user) return;

        const activity = this.activities[this.activityIndex];
        this.user.setActivity(activity);

        this.activityIndex = (this.activityIndex + 1) % this.activities.length;
    }

    /* ================================================= */
    /* SHUTDOWN */
    /* ================================================= */

    async emergencyShutdown(reason = 'unknown') {
        this.logger.error(`🚨 Emergency shutdown triggered: ${reason}`);

        try {
            if (this.activityInterval) {
                clearInterval(this.activityInterval);
            }

            if (this.db?.disconnect) {
                await this.db.disconnect().catch(() => {});
            }

            this.destroy();
            process.exit(1);

        } catch (error) {
            this.logger.error('💥 Critical error during emergency shutdown:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        this.logger.info('🔌 Shutting down bot...');

        try {
            if (this.activityInterval) {
                clearInterval(this.activityInterval);
            }

            if (this.db?.disconnect) {
                await this.db.disconnect();
                this.logger.success('🗄️ Database disconnected.');
            }

            this.destroy();

            this.logger.success('✅ Bot shut down successfully.');
            process.exit(0);

        } catch (error) {
            this.logger.error('❌ Error during shutdown:', error);
            process.exit(1);
        }
    }

    /* ================================================= */
    /* HEALTH MONITORING */
    /* ================================================= */

    getSystemHealth() {
        const reviewHealth = this.reviewManager?.getHealth?.() || { status: 'offline' };

        const health = {
            status: 'online',
            timestamp: new Date().toISOString(),
            uptime: this.helpers.formatTime(Date.now() - this.startTime),
            components: {
                database: this.db?.status === 1 ? 'healthy' : this.db ? 'limited' : 'offline',
                ticketManager: this.ticketManager ? 'healthy' : 'offline',
                welcomeManager: this.welcomeManager ? 'healthy' : 'offline',
                reviewSystem: reviewHealth.status,
                embedManager: this.embedManager ? 'healthy' : 'offline'
            },
            stats: this.getStats(),
            performance: {
                latency: this.ws.ping,
                memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
                uptime: process.uptime()
            }
        };

        const values = Object.values(health.components);
        const healthy = values.filter(v => v === 'healthy').length;
        const limited = values.filter(v => v === 'limited').length;
        const total = values.length;

        if (healthy === total && this.db?.status === 1) {
            health.status = 'excellent';
        } else if ((healthy + limited) >= total * 0.8) {
            health.status = 'good';
        } else if ((healthy + limited) >= total * 0.6) {
            health.status = 'degraded';
        } else {
            health.status = 'poor';
        }

        return health;
    }

    getStats() {
        return {
            guilds: this.guilds.cache.size,
            users: this.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            channels: this.channels.cache.size,
            commands: {
                prefix: this.commands.size,
                slash: this.slashCommands.size,
                total: this.commands.size + this.slashCommands.size
            }
        };
    }

    /* ================================================= */
    /* PERMISSIONS & UTILITIES */
    /* ================================================= */

    isOwner(userId) {
        return this.config.owners?.includes(userId) || false;
    }

    isDeveloper(userId) {
        return this.config.developers?.includes(userId) || this.isOwner(userId);
    }

    hasPermissions(member, permissions) {
        return permissions.every(perm => member.permissions.has(perm));
    }

    getCommand(name) {
        const commandName = name.toLowerCase();
        return this.commands.get(commandName) ||
               this.commands.get(this.aliases.get(commandName));
    }

    getSlashCommand(name) {
        return this.slashCommands.get(name);
    }

    async logToChannel(message, channelId = process.env.LOG_CHANNEL_ID) {
        if (!channelId) return false;

        try {
            const channel = await this.channels.fetch(channelId);
            if (channel?.isTextBased()) {
                await channel.send(message);
                return true;
            }
        } catch (error) {
            this.logger.error('❌ Failed to send log to channel:', error);
        }

        return false;
    }
}
