import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    levelSettings: {
        maxMessagesPerDay: {
            type: Number,
            default: 2000
        },
        baseXP: {
            type: Number,
            default: 100,
            min: 10,
            max: 1000
        },
        growthRate: {
            type: Number,
            default: 1.5,
            min: 1.1,
            max: 3.0
        },
        messageXP: {
            min: {
                type: Number,
                default: 15,
                min: 1
            },
            max: {
                type: Number,
                default: 25,
                min: 5
            },
            cooldown: {
                type: Number,
                default: 60,
                min: 0
            }
        },
        voiceXP: {
            perMinute: {
                type: Number,
                default: 10,
                min: 1
            },
            interval: {
                type: Number,
                default: 5,
                min: 1
            },
            maxPerSession: {
                type: Number,
                default: 500,
                min: 0
            }
        },
        coinsPerXP: {
            type: Number,
            default: 10,
            min: 1,
            max: 100
        },
        voiceCoinsPerMinute: {
            type: Number,
            default: 1,
            min: 0,
            max: 100
        },
        bonusChannels: {
            type: Map,
            of: Number,
            default: new Map()
        },
        ignoredChannels: {
            type: [String],
            default: []
        },
        ignoredRoles: {
            type: [String],
            default: []
        },
        maxDailyXP: {
            type: Number,
            default: 5000,
            min: 0
        }
    },
    vault: {
        enabled: {
            type: Boolean,
            default: true
        },
        balance: {
            type: Number,
            default: 0,
            min: 0
        },
        goals: [{
            goalId: String,
            title: String,
            description: String,
            targetAmount: Number,
            currentAmount: {
                type: Number,
                default: 0
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            completed: {
                type: Boolean,
                default: false
            }
        }],
        transactions: [{
            userId: String,
            username: String,
            amount: Number,
            type: {
                type: String,
                enum: ['deposit', 'withdraw']
            },
            reason: String,
            date: {
                type: Date,
                default: Date.now
            }
        }]
    },
    shop: {
        enabled: {
            type: Boolean,
            default: true
        },
        currencyName: {
            type: String,
            default: "Monedas"
        },
        currencyEmoji: {
            type: String,
            default: "💰"
        },
        logChannelId: {
            type: String,
            default: null
        }
    },
    notifications: {
        levelUpChannel: {
            type: String,
            default: null
        },
        levelUpDM: {
            type: Boolean,
            default: false
        },
        levelUpType: {
            type: String,
            enum: ['text', 'embed'],
            default: 'embed'
        },
        levelUpMessage: {
            type: String,
            default: "¡Felicidades {user}! Has subido al nivel **{level}** 🎉"
        },
        levelUpEmbed: {
            enabled: {
                type: Boolean,
                default: true
            },
            title: {
                type: String,
                default: "¡Nuevo Nivel Alcanzado! 🎉"
            },
            description: {
                type: String,
                default: "{user} ha alcanzado el nivel **{level}**"
            },
            color: {
                type: String,
                default: "#00FF00"
            },
            thumbnail: {
                type: Boolean,
                default: true
            },
            footer: {
                type: String,
                default: "¡Sigue así para más recompensas!"
            },
            fields: [{
                name: {
                    type: String,
                    required: true
                },
                value: {
                    type: String,
                    required: true
                },
                inline: {
                    type: Boolean,
                    default: false
                }
            }],
            image: {
                type: String,
                default: null
            },
            timestamp: {
                type: Boolean,
                default: true
            },
            mentionUser: {
                type: Boolean,
                default: true
            }
        }
    },
    leaderboard: {
        updateInterval: {
            type: Number,
            default: 300,
            min: 60
        },
        topCount: {
            type: Number,
            default: 10,
            min: 3,
            max: 25
        },
        showInChannel: {
            type: String,
            default: null
        }
    },
    penalties: {
        xpReductionRoles: [{
            roleId: String,
            multiplier: {
                type: Number,
                default: 0.5,
                min: 0,
                max: 1
            }
        }],
        noXPChannels: [String],
        noXPRoles: [String]
    },
    multipliers: {
        boostRoles: [{
            roleId: String,
            multiplier: {
                type: Number,
                default: 1.5,
                min: 1,
                max: 5
            }
        }],
        specialChannels: [{
            channelId: String,
            multiplier: {
                type: Number,
                default: 2.0,
                min: 1,
                max: 10
            }
        }]
    },
    eventSettings: {
        enabled: {
            type: Boolean,
            default: true
        },
        announcementChannel: {
            type: String,
            default: null
        },
        autoStartEvents: {
            type: Boolean,
            default: true
        },
        eventNotifications: {
            type: Boolean,
            default: true
        },
        allowedEvents: {
            type: [String],
            default: ['double_xp_weekend', 'holiday_special', 'server_anniversary']
        },
        customEvents: [{
            name: String,
            description: String,
            type: {
                type: String,
                enum: ['xp_multiplier', 'coin_multiplier', 'token_bonus', 'custom']
            },
            multiplier: Number,
            bonus: Number,
            startDate: Date,
            endDate: Date,
            active: Boolean,
            schedule: {
                days: [Number], 
                startHour: Number,
                endHour: Number,
                months: [Number],
                specificDates: [String] 
            }
        }]
    },
    eventChannels: [{
        channelId: String,
        eventType: String,
        notifications: {
            type: Boolean,
            default: true
        }
    }],
    lootboxSettings: {
        enabled: {
            type: Boolean,
            default: true
        },
        spawnChance: {
            type: Number,
            default: 0.03,
            min: 0,
            max: 0.1
        },
        allowedChannels: [String],
        excludedChannels: [String],
        minLevel: {
            type: Number,
            default: 1
        },
        cooldownSeconds: {
            type: Number,
            default: 30
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

guildConfigSchema.methods.formatMessage = function (message, data) {
    if (!message) return '';

    const replacements = {
        '{user}': data.userMention || data.userTag || '',
        '{user.tag}': data.userTag || '',
        '{user.id}': data.userId || '',
        '{user.avatar}': data.userAvatar || '',
        '{level}': data.level || '',
        '{oldLevel}': data.oldLevel || '',
        '{xp}': data.xp || '',
        '{xpNeeded}': data.xpNeeded || '',
        '{xpProgress}': data.xpProgress || '',
        '{rank}': data.rank || '',
        '{totalUsers}': data.totalUsers || '',
        '{coins}': data.coins || '',
        '{tokens}': data.tokens || '',
        '{guild}': data.guildName || '',
        '{guild.id}': data.guildId || '',
        '{role}': data.roleMention || '',
        '{role.name}': data.roleName || '',
        '{date}': new Date().toLocaleDateString(),
        '{time}': new Date().toLocaleTimeString(),
        '\\n': '\n'
    };

    let formatted = message;
    for (const [key, value] of Object.entries(replacements)) {
        formatted = formatted.split(key).join(value);
    }

    return formatted;
};

guildConfigSchema.methods.createLevelUpEmbed = function (data) {
    return {
        title: this.formatMessage(this.notifications.levelUpEmbed.title, data),
        description: this.formatMessage(this.notifications.levelUpEmbed.description, data),
        color: this.notifications.levelUpEmbed.color,
        thumbnail: this.notifications.levelUpEmbed.thumbnail && data.userAvatar ?
            data.userAvatar : null,
        fields: this.notifications.levelUpEmbed.fields.map(field => ({
            name: this.formatMessage(field.name, data),
            value: this.formatMessage(field.value, data),
            inline: field.inline || false
        })),
        footer: this.notifications.levelUpEmbed.footer ? {
            text: this.formatMessage(this.notifications.levelUpEmbed.footer, data)
        } : null,
        image: this.notifications.levelUpEmbed.image,
        timestamp: this.notifications.levelUpEmbed.timestamp
    };
};

guildConfigSchema.index({ enabled: 1 });

guildConfigSchema.methods.getChannelMultiplier = function (channelId) {
    const channelMultiplier = this.multipliers.specialChannels.find(c => c.channelId === channelId);
    if (channelMultiplier) return channelMultiplier.multiplier;

    const bonusChannel = this.levelSettings.bonusChannels.get(channelId);
    if (bonusChannel) return bonusChannel / 100 + 1;

    return 1.0;
};

guildConfigSchema.methods.getUserMultiplier = function (member) {
    let multiplier = 1.0;

    for (const boostRole of this.multipliers.boostRoles) {
        if (member.roles.cache.has(boostRole.roleId)) {
            multiplier *= boostRole.multiplier;
        }
    }

    for (const penaltyRole of this.penalties.xpReductionRoles) {
        if (member.roles.cache.has(penaltyRole.roleId)) {
            multiplier *= penaltyRole.multiplier;
        }
    }

    return multiplier;
};

guildConfigSchema.methods.canEarnXP = function (member, channelId) {
    if (!this.enabled) return false;

    for (const roleId of this.levelSettings.ignoredRoles) {
        if (member.roles.cache.has(roleId)) return false;
    }

    if (this.levelSettings.ignoredChannels.includes(channelId)) return false;

    if (this.penalties.noXPChannels.includes(channelId)) return false;

    for (const roleId of this.penalties.noXPRoles) {
        if (member.roles.cache.has(roleId)) return false;
    }

    return true;
};

guildConfigSchema.methods.addChannelMultiplier = function (channelId, multiplier) {
    const existing = this.multipliers.specialChannels.find(c => c.channelId === channelId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.multipliers.specialChannels.push({ channelId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removeChannelMultiplier = function (channelId) {
    this.multipliers.specialChannels = this.multipliers.specialChannels.filter(
        c => c.channelId !== channelId
    );

    return this.save();
};

guildConfigSchema.methods.addBoostRole = function (roleId, multiplier) {
    const existing = this.multipliers.boostRoles.find(r => r.roleId === roleId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.multipliers.boostRoles.push({ roleId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removeBoostRole = function (roleId) {
    this.multipliers.boostRoles = this.multipliers.boostRoles.filter(
        r => r.roleId !== roleId
    );

    return this.save();
};

guildConfigSchema.methods.addPenaltyRole = function (roleId, multiplier) {
    const existing = this.penalties.xpReductionRoles.find(r => r.roleId === roleId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.penalties.xpReductionRoles.push({ roleId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removePenaltyRole = function (roleId) {
    this.penalties.xpReductionRoles = this.penalties.xpReductionRoles.filter(
        r => r.roleId !== roleId
    );

    return this.save();
};

guildConfigSchema.methods.addIgnoredChannel = function (channelId) {
    if (!this.levelSettings.ignoredChannels.includes(channelId)) {
        this.levelSettings.ignoredChannels.push(channelId);
        return this.save();
    }
    return Promise.resolve(this);
};

guildConfigSchema.methods.removeIgnoredChannel = function (channelId) {
    this.levelSettings.ignoredChannels = this.levelSettings.ignoredChannels.filter(
        id => id !== channelId
    );
    return this.save();
};

guildConfigSchema.methods.setNotificationChannel = function (channelId) {
    this.notifications.levelUpChannel = channelId;
    return this.save();
};

guildConfigSchema.methods.toggleDMNotifications = function () {
    this.notifications.levelUpDM = !this.notifications.levelUpDM;
    return this.save();
};

guildConfigSchema.methods.addChannelMultiplier = function (channelId, multiplier) {
    const existing = this.multipliers.specialChannels.find(c => c.channelId === channelId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.multipliers.specialChannels.push({ channelId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removeChannelMultiplier = function (channelId) {
    this.multipliers.specialChannels = this.multipliers.specialChannels.filter(
        c => c.channelId !== channelId
    );

    return this.save();
};

guildConfigSchema.methods.addBoostRole = function (roleId, multiplier) {
    const existing = this.multipliers.boostRoles.find(r => r.roleId === roleId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.multipliers.boostRoles.push({ roleId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removeBoostRole = function (roleId) {
    this.multipliers.boostRoles = this.multipliers.boostRoles.filter(
        r => r.roleId !== roleId
    );

    return this.save();
};

guildConfigSchema.methods.addPenaltyRole = function (roleId, multiplier) {
    const existing = this.penalties.xpReductionRoles.find(r => r.roleId === roleId);

    if (existing) {
        existing.multiplier = multiplier;
    } else {
        this.penalties.xpReductionRoles.push({ roleId, multiplier });
    }

    return this.save();
};

guildConfigSchema.methods.removePenaltyRole = function (roleId) {
    this.penalties.xpReductionRoles = this.penalties.xpReductionRoles.filter(
        r => r.roleId !== roleId
    );

    return this.save();
};

guildConfigSchema.methods.getEventSettings = function () {
    return {
        enabled: this.eventSettings.enabled,
        announcementChannel: this.eventSettings.announcementChannel,
        autoStartEvents: this.eventSettings.autoStartEvents,
        allowedEvents: this.eventSettings.allowedEvents,
        customEvents: this.eventSettings.customEvents
    };
};

guildConfigSchema.methods.addCustomEvent = function (eventData) {
    this.eventSettings.customEvents.push({
        ...eventData,
        active: false
    });
    return this.save();
};

guildConfigSchema.methods.toggleEvent = function (eventId, enabled) {
    const customEvent = this.eventSettings.customEvents.find(e => e._id?.toString() === eventId);
    if (customEvent) {
        customEvent.active = enabled;
        return this.save();
    }
    return Promise.resolve(this);
};

guildConfigSchema.methods.isEventAllowed = function (eventId) {
    if (!this.eventSettings.enabled) return false;
    return this.eventSettings.allowedEvents.includes(eventId) ||
        this.eventSettings.customEvents.some(e => e._id?.toString() === eventId);
};

guildConfigSchema.methods.getEventAnnouncementChannel = function () {
    return this.eventSettings.announcementChannel ||
        this.notifications.levelUpChannel ||
        this.leaderboard.showInChannel;
};

guildConfigSchema.methods.depositToVault = async function ({
    userLevel,
    amount,
    reason = 'Depósito a la bóveda'
}) {
    if (!this.vault?.enabled) {
        throw new Error('La bóveda está deshabilitada');
    }

    if (amount <= 0) {
        throw new Error('Cantidad inválida');
    }

    if (userLevel.coins < amount) {
        throw new Error('Monedas insuficientes');
    }

    userLevel.coins -= amount;

    this.vault.balance += amount;

    const activeGoal = this.vault.goals.find(g => !g.completed);
    if (activeGoal) {
        activeGoal.currentAmount += amount;

        if (activeGoal.currentAmount >= activeGoal.targetAmount) {
            activeGoal.completed = true;
        }
    }

    this.vault.transactions.push({
        userId: userLevel.userId,
        username: userLevel.username,
        amount,
        type: 'deposit',
        reason
    });

    await userLevel.save();
    await this.save();

    return {
        userCoins: userLevel.coins,
        vaultBalance: this.vault.balance,
        goalCompleted: activeGoal?.completed || false
    };
};


export default mongoose.model('GuildConfigLevel', guildConfigSchema);