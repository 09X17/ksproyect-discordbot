import mongoose from "mongoose";
import { boxTypes, getRandomInRange } from "../Managers/boxTypesConfig.js";
import JobsConfig from "../Managers/JobsConfig.js";

const userLevelSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    username: {
        type: String,
        required: true,
        default: 'Usuario desconocido'
    },
    guildId: {
        type: String,
        required: true,
        index: true,
    },
    customization: {
        permissions: {
            type: mongoose.Schema.Types.Mixed,
            default: () => ({
                customBackground: false
            })
        },
        active: {
            accentColor: String,
            background: String
        }
    },
    xp: {
        type: Number,
        default: 0,
        min: 0,
    },
    level: {
        type: Number,
        default: 1,
        min: 1,
    },
    totalXP: {
        type: Number,
        default: 0,
    },
    messages: {
        type: Number,
        default: 0,
    },
    voiceMinutes: {
        type: Number,
        default: 0,
    },
    lastMessage: {
        type: Date,
        default: Date.now,
    },
    lastVoiceUpdate: {
        type: Date,
        default: Date.now,
    },
    boostMultiplier: {
        type: Number,
        default: 1.0,
        min: 1.0,
        max: 5.0,
    },
    boostExpires: {
        type: Date,
        default: null,
    },
    perks: [
        {
            perkId: String,
            activated: Boolean,
            expiresAt: Date,
        },
    ],
    purchasedItems: [
        {
            itemId: String,
            purchasedAt: Date,
            active: Boolean,
        },
    ],
    xpCooldown: {
        type: Date,
        default: Date.now,
    },
    stats: {
        dailyXp: {
            type: Number,
            default: 0,
        },
        weeklyXp: {
            type: Number,
            default: 0,
        },
        monthlyXp: {
            type: Number,
            default: 0,
        },
        xpToday: {
            type: Number,
            default: 0,
        },
        messagesToday: {
            type: Number,
            default: 0
        },
        streakDays: {
            type: Number,
            default: 0,
        },
        lastStreak: {
            type: Date,
            default: Date.now,
        },
        lastDailyReset: {
            type: Date,
            default: Date.now
        },
        lastDailyReward: {
            type: Date,
            default: null
        }
    },
    notifications: {
        levelUp: {
            type: Boolean,
            default: true,
        },
        roleReward: {
            type: Boolean,
            default: true,
        },
        leaderboard: {
            type: Boolean,
            default: true,
        },
    },
    blackMarket: {
        heat: {
            type: Number,
            default: 0
        },
        jailed: {
            type: Boolean,
            default: false
        },
        jailUntil: {
            type: Date,
            default: null
        },
        bannedUntil: {
            type: Date,
            default: null
        },
        lastRobbedAt: {
            type: Date,
            default: null
        },
        stats: {
            purchases: { type: Number, default: 0 },
            bets: { type: Number, default: 0 },
            caught: { type: Number, default: 0 },
            robbed: { type: Number, default: 0 }
        },

        lastAction: {
            type: Date,
            default: null
        }
    },
    inventory: [{
        boxType: { type: String, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        acquiredAt: { type: Date, default: Date.now }
    }],
    coins: { type: Number, default: 0, min: 0 },
    tokens: { type: Number, default: 0, min: 0 },
    purchaseHistory: [{
        itemId: mongoose.Schema.Types.ObjectId,
        itemName: String,
        price: Number,
        currency: String,
        purchasedAt: {
            type: Date,
            default: Date.now
        },
        quantity: Number
    }],
    activeItems: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        itemName: {
            type: String,
            required: true
        },
        itemType: {
            type: String,
            required: true
        },
        purchasedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: Date,
        active: {
            type: Boolean,
            default: true
        },
        multiplier: {
            type: Number,
            default: 1.5
        },
        durationHours: {
            type: Number,
            default: 24
        }
    }],
    jobs: {
        activeJob: { type: String, default: null },
        lastJobChange: Date,
        lastSalary: Date,
        lastMonthlySalary: Date,
        data: [{
            jobId: String,
            level: { type: Number, default: 1 },
            xp: { type: Number, default: 0 },
            totalXp: { type: Number, default: 0 },
            rank: { type: String, default: 'Novato' },
            lastWork: Date,
            cooldownUntil: Date,
            stats: {
                timesWorked: Number,
                coinsEarned: Number,
                xpEarned: Number,
                fails: Number,
                taxesPaid: { type: Number, default: 0 }
            },
            perks: [String],
            isIllegal: Boolean,
            joinedAt: Date
        }]
    },
    missions: {
        daily: [{
            missionId: { type: String, required: true },
            type: { type: String, required: true },
            progress: { type: Number, default: 0 },
            goal: { type: Number, required: true },
            completed: { type: Boolean, default: false },
            claimed: { type: Boolean, default: false },
            reward: {
                xp: Number,
                coins: Number,
                tokens: Number,
                lootbox: String
            }
        }],
        weekly: [{
            missionId: { type: String, required: true },
            type: { type: String, required: true },
            progress: { type: Number, default: 0 },
            goal: { type: Number, required: true },
            completed: { type: Boolean, default: false },
            claimed: { type: Boolean, default: false },
            reward: {
                xp: Number,
                coins: Number,
                tokens: Number,
                lootbox: String
            }
        }],
        lastGenerated: {
            daily: Date,
            weekly: Date
        }
    }
},
    { timestamps: true }
);

userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, level: -1 });
userLevelSchema.index({ guildId: 1, xp: -1 });
userLevelSchema.index({ guildId: 1, "stats.dailyXp": -1 });
userLevelSchema.index({ "activeItems.expiresAt": 1 });
userLevelSchema.index({ "stats.lastDailyReset": 1 });


userLevelSchema.methods.addXP = function (amount, source = "message") {
    const effectiveMultiplier = this.getEffectiveBoostMultiplier();
    const finalAmount = Math.floor(amount * effectiveMultiplier);

    this.xp += finalAmount;
    this.totalXP += finalAmount;
    this.updateStats(finalAmount, source);

    return {
        xpAdded: finalAmount,
        multiplierApplied: effectiveMultiplier
    };
};


userLevelSchema.methods.removeXP = async function (amount) {
    this.xp = Math.max(0, this.xp - amount);

    this.level = await this.calculateLevel();
    await this.save();

    return {
        xpRemoved: amount,
        newXP: this.xp,
        newLevel: this.level,
    };
};

userLevelSchema.methods.calculateLevel = async function () {
    const GuildConfig = mongoose.model("GuildConfigLevel");
    const config = await GuildConfig.findOne({ guildId: this.guildId });

    if (!config) {
        const baseXP = 100;
        const growthRate = 1.5;
        return this.calculateLevelFromXP(this.xp, baseXP, growthRate);
    }

    const { baseXP, growthRate } = config.levelSettings;
    return this.calculateLevelFromXP(this.xp, baseXP, growthRate);
};

userLevelSchema.methods.calculateLevelFromXP = function (xp, baseXP, growthRate) {
    let level = 1;
    let xpNeeded = 0;
    while (true) {
        xpNeeded += Math.floor(baseXP * Math.pow(level, growthRate));
        if (xp < xpNeeded) {
            break;
        }

        level++;

        if (level > 200) {
            level = 200;
            break;
        }
    }
    return level;
};

userLevelSchema.methods.updateStats = function (xpAmount, source = 'unknown') {
    const now = new Date();

    if (this.stats.lastDailyReset.toDateString() !== now.toDateString()) {
        this.stats.xpToday = 0;
        this.stats.messagesToday = 0;
        this.stats.lastDailyReset = now;

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.stats.lastStreak.toDateString() === yesterday.toDateString()) {
            this.stats.streakDays++;
        } else {
            this.stats.streakDays = 1;
        }

        this.stats.lastStreak = now;
    }

    this.stats.xpToday += xpAmount;
    this.stats.dailyXp += xpAmount;
    this.stats.weeklyXp += xpAmount;
    this.stats.monthlyXp += xpAmount;

    if (source === 'message') {
        this.stats.messagesToday++;
    }

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (this.updatedAt < weekAgo) {
        this.stats.weeklyXp = xpAmount;
    }

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    if (this.updatedAt < monthAgo) {
        this.stats.monthlyXp = xpAmount;
    }
};

userLevelSchema.methods.getRequiredXP = async function () {
    const GuildConfig = mongoose.model("GuildConfigLevel");
    const config = await GuildConfig.findOne({ guildId: this.guildId });

    if (!config) return 100;

    const { baseXP, growthRate } = config.levelSettings;
    const nextLevel = this.level + 1;
    return Math.floor(baseXP * Math.pow(nextLevel, growthRate));
};

userLevelSchema.methods.getProgress = async function () {
    const currentLevelXP = await this.getRequiredXPForLevel(this.level);
    const nextLevelXP = await this.getRequiredXPForLevel(this.level + 1);
    const xpInLevel = this.xp - currentLevelXP;
    const xpNeeded = nextLevelXP - currentLevelXP;
    const percentage = (xpInLevel / xpNeeded) * 100;

    return {
        current: xpInLevel,
        needed: xpNeeded,
        percentage: Math.min(100, Math.max(0, percentage)),
        currentLevelXP,
        nextLevelXP,
    };
};

userLevelSchema.methods.getRequiredXPForLevel = async function (targetLevel) {
    const GuildConfig = mongoose.model("GuildConfigLevel");
    const config = await GuildConfig.findOne({ guildId: this.guildId });

    if (!config || targetLevel <= 1) return 0;

    const { baseXP, growthRate } = config.levelSettings;
    let totalXP = 0;

    for (let lvl = 1; lvl < targetLevel; lvl++) {
        totalXP += Math.floor(baseXP * Math.pow(lvl, growthRate));
    }

    return totalXP;
};

userLevelSchema.methods.activateBoost = function (multiplier, durationHours) {
    const expires = new Date();
    expires.setHours(expires.getHours() + durationHours);

    this.boostMultiplier = multiplier;
    this.boostExpires = expires;

    return { multiplier, expires };
};

userLevelSchema.methods.activateBoostFromItem = function (item, quantity = 1) {
    const now = new Date();
    let multiplier = item.data?.multiplier || 1.5;
    const durationHours = item.data?.duration ? (item.data.duration / 3600) : 24;
    const totalDuration = durationHours * quantity;

    const existingBoost = this.activeItems.find(activeItem =>
        activeItem.itemId?.toString() === item._id?.toString() &&
        activeItem.active === true
    );

    if (existingBoost) {
        const newExpires = new Date(existingBoost.expiresAt);
        newExpires.setHours(newExpires.getHours() + totalDuration);

        existingBoost.expiresAt = newExpires;
        existingBoost.durationHours += totalDuration;

        if (multiplier > existingBoost.multiplier) {
            existingBoost.multiplier = multiplier;
        }

        if (multiplier > this.boostMultiplier) {
            this.boostMultiplier = multiplier;
            this.boostExpires = newExpires;
        }

        return existingBoost.multiplier;
    }

    const expires = new Date();
    expires.setHours(expires.getHours() + totalDuration);

    this.activeItems.push({
        itemId: item._id,
        itemName: item.name,
        itemType: item.type,
        purchasedAt: now,
        expiresAt: expires,
        active: true,
        multiplier,
        durationHours: totalDuration
    });

    if (multiplier > this.boostMultiplier) {
        this.boostMultiplier = multiplier;
        this.boostExpires = expires;
    }

    return multiplier;
};

userLevelSchema.methods.addCoins = function (amount) {
    if (amount <= 0) return;
    this.coins += amount;
};

userLevelSchema.methods.spendCoins = function (amount) {
    if (this.coins < amount) throw new Error('Monedas insuficientes');
    this.coins -= amount;
};

userLevelSchema.methods.addTokens = function (amount) {
    if (amount <= 0) return;
    this.tokens += amount;
};

userLevelSchema.methods._spendCoinsInternal = function (amount, description, source) {
    if (this.coins < amount) {
        throw new Error('Monedas insuficientes');
    }

    const now = new Date();
    this.coins -= amount;

};

userLevelSchema.methods.purchaseItem = async function (item, quantity = 1) {
    const now = new Date();
    let totalPrice = item.price * quantity;

    if (item.currency === 'coins') {
        if (this.coins < totalPrice) throw new Error('Monedas insuficientes');
        this._spendCoinsInternal(totalPrice, `Compra: ${item.name} x${quantity}`, 'shop');
    } else if (item.currency === 'tokens') {
        if (this.tokens < totalPrice) throw new Error('Tokens insuficientes');
        this.tokens -= totalPrice;
    } else if (item.currency === 'xp') {
        if (this.xp < totalPrice) throw new Error('XP insuficiente');
        this.xp -= totalPrice;
        const newLevel = await this.calculateLevel();
        const leveledDown = newLevel < this.level;
        if (leveledDown) this.level = newLevel;
    }

    this.purchaseHistory.push({
        itemId: item._id,
        itemName: item.name,
        price: item.price,
        currency: item.currency,
        quantity,
        purchasedAt: now
    });

    let effects = {};

    try {
        if (item.type === 'boost_user' || item.type === 'boost_server') {
            const multiplier = await this.activateBoostFromItem(item, quantity);
            effects = { boost: { multiplier } };
        }

        else if (item.type === 'permission') {

            const permission = item.data?.permission;
            const hexColor = item.data?.hexColor;

            this.customization ??= {};
            this.customization.permissions ??= {};
            this.customization.active ??= {};

            if (permission) {
                this.customization.permissions[permission] = true;
                effects.permissionGranted = permission;

                this.markModified('customization.permissions');
            }

            if (hexColor && /^#([0-9A-F]{6})$/i.test(hexColor)) {
                this.customization.active.accentColor = hexColor;
                effects.accentColorApplied = hexColor;

                this.markModified('customization.active');
            }

            effects.success = true;
        }

        else {
            effects = await this.applyItemEffects(item, quantity);
        }

    } catch (err) {
        console.error('❌ Error aplicando efectos:', err);
        throw new Error(`Error aplicando efectos del item: ${err.message}`);
    }

    const shouldAddToInventory = !['permission', 'role'].includes(item.type);

    if (shouldAddToInventory) {
        this.inventory ??= [];
        const existing = this.inventory.find(i => i.itemId?.toString() === item._id.toString());

        if (existing) {
            existing.quantity += quantity;
        } else {
            this.inventory.push({
                itemId: item._id,
                itemName: item.name,
                quantity,
                acquiredAt: now
            });
        }
    } else {
    }

    await this.save();

    return {
        success: true,
        effects,
        newBalance: {
            coins: this.coins,
            tokens: this.tokens,
            xp: this.xp,
            level: this.level
        }
    };
};

userLevelSchema.methods.applyItemEffects = function (item, quantity = 1) {
    const effects = {};

    switch (item.type) {
        case 'xp': {
            const xpAmount = (item.data?.xpAmount || 0) * quantity;
            if (xpAmount > 0) {
                this.xp += xpAmount;
                this.totalXP += xpAmount;
                this.updateStats(xpAmount, 'item_purchase');
                effects.xpGained = xpAmount;
            }
            break;
        }

        case 'economy': {
            const coins = (item.data?.coinsAmount || 0) * quantity;
            const tokens = (item.data?.tokensAmount || 0) * quantity;
            const xp = (item.data?.xpAmount || 0) * quantity;

            if (coins > 0) this.coins += coins;
            if (tokens > 0) this.tokens += tokens;
            if (xp > 0) {
                this.xp += xp;
                this.totalXP += xp;
                this.updateStats(xp, 'item_purchase');
            }

            effects.coinsGained = coins;
            effects.tokensGained = tokens;
            effects.xpGained = xp;
            break;
        }

        case 'role': {
            effects.role = item.data?.roleId;
            break;
        }
    }

    return effects;
};

userLevelSchema.methods.clearAllBoosts = async function () {
    this.activeItems = this.activeItems.filter(item =>
        !(item.itemType === 'boost_user' || item.itemType === 'boost_server')
    );

    this.boostMultiplier = 1.0;
    this.boostExpires = null;

    await this.save();
    return { cleared: true };
};

userLevelSchema.methods.getActiveBoosts = function () {
    const now = new Date();

    return this.activeItems.filter(item =>
        (item.itemType === 'boost_user' || item.itemType === 'boost_server') &&
        item.active === true &&
        (!item.expiresAt || new Date(item.expiresAt) > now)
    );
};

userLevelSchema.methods.getEffectiveBoostMultiplier = function () {
    const now = new Date();
    let multiplier = 1.0;
    if (this.boostMultiplier > 1 && this.boostExpires > now) {
        multiplier = Math.max(multiplier, this.boostMultiplier);
    }

    const activeBoosts = this.getActiveBoosts();
    if (activeBoosts.length > 0) {
        const bestBoost = activeBoosts.reduce((best, current) => {
            const currentMultiplier = current.multiplier || 1.5;
            const bestMultiplier = best.multiplier || 1.5;
            return currentMultiplier > bestMultiplier ? current : best;
        });

        multiplier = Math.max(multiplier, bestBoost.multiplier || 1.5);
    }

    return multiplier;
};

userLevelSchema.statics.cleanupExpiredItems = async function () {
    const now = new Date();

    const result = await this.updateMany(
        {
            'activeItems.expiresAt': { $lt: now },
            'activeItems.active': true
        },
        {
            $set: { 'activeItems.$[elem].active': false }
        },
        {
            arrayFilters: [{ 'elem.expiresAt': { $lt: now }, 'elem.active': true }],
            multi: true
        }
    );

    return result;
};

userLevelSchema.statics.getTopUsers = async function (guildId, limit = 10, sortBy = 'level') {
    const sortFields = {
        level: { level: -1, xp: -1 },
        xp: { xp: -1 },
        coins: { coins: -1 },
        messages: { messages: -1 },
        voice: { voiceMinutes: -1 }
    };

    const sort = sortFields[sortBy] || { level: -1, xp: -1 };

    return await this.find({ guildId })
        .sort(sort)
        .limit(limit)
        .lean();
};

userLevelSchema.methods.getActiveBackground = function () {
    const bg = this.customization?.active?.background;
    if (!bg) return null;

    return path.join(
        process.cwd(),
        'Src',
        'LevelSystem',
        'Assets',
        'UserBackgrounds',
        bg
    );
};

userLevelSchema.methods.addItemToInventory = async function (item, quantity = 1) {

    this.inventory ??= [];

    const existingIndex = this.inventory.findIndex(i => {
        if (item._id && i.itemId) {
            return i.itemId.toString() === item._id.toString();
        }
        return i.itemName === item.name;
    });

    if (existingIndex !== -1) {
        this.inventory[existingIndex].quantity += quantity;
        this.inventory[existingIndex].acquiredAt = new Date();
    } else {
        this.inventory.push({
            itemId: item._id || null,
            itemName: item.name,
            itemType: item.type || 'item',
            quantity,
            acquiredAt: new Date()
        });
    }

    this.markModified('inventory');
    await this.save();

    return true;
};

userLevelSchema.methods.addLootBoxToInventory = async function (boxType, boxName, quantity = 1) {
    if (!boxType || !boxName) throw new Error('Debes especificar boxType y boxName.');
    if (quantity < 1) quantity = 1;

    this.inventory ??= [];

    const existing = this.inventory.find(item =>
        item.boxType === boxType && (item.itemType === 'lootbox' || !item.itemType)
    );

    if (existing) {
        existing.quantity += quantity;
        existing.acquiredAt = new Date();
    } else {
        this.inventory.push({
            itemType: 'lootbox',
            boxType,
            name: boxName,
            itemName: boxName,
            quantity,
            acquiredAt: new Date()
        });
    }

    this.markModified('inventory');
    await this.save();

    return {
        boxType,
        boxName,
        quantity: this.inventory.find(i => i.boxType === boxType)?.quantity || quantity
    };
};

userLevelSchema.methods.openLootBox = async function (boxType, levelManager = null, ignoreInventory = false) {
    const boxData = boxTypes[boxType];
    if (!boxData) throw new Error(`Caja inválida: ${boxType}`);

    this.inventory ??= [];

    let box;
    if (!ignoreInventory) {
        const index = this.inventory.findIndex(item => item.boxType === boxType && (item.itemType === 'lootbox' || !item.itemType));
        if (index === -1) throw new Error(`No tienes ninguna ${boxData.name}`);

        box = this.inventory[index];

        if (box.quantity > 1) {
            box.quantity--;
        } else {
            this.inventory = this.inventory.filter((_, i) => i !== index);
        }

        this.markModified('inventory');
    }

    const rewards = {};
    const totalWeight = boxData.rewards.reduce((s, r) => s + r.weight, 0);
    let roll = Math.random() * totalWeight;

    let selectedReward = null;
    for (const reward of boxData.rewards) {
        roll -= reward.weight;
        if (roll <= 0) {
            selectedReward = reward;
            break;
        }
    }

    if (!selectedReward) selectedReward = boxData.rewards[0];

    switch (selectedReward.type) {
        case 'coins': {
            const amount = getRandomInRange(selectedReward.min, selectedReward.max);
            rewards.coins = amount;
            break;
        }

        case 'tokens': {
            const amount = getRandomInRange(selectedReward.min, selectedReward.max);
            rewards.tokens = amount;
            break;
        }

        case 'random_box': {
            const randomType = selectedReward.boxes[Math.floor(Math.random() * selectedReward.boxes.length)];
            const randomBox = boxTypes[randomType];

            const existing = this.inventory.find(i => i.itemType === 'lootbox' && i.boxType === randomType);
            if (existing) {
                existing.quantity++;
            } else {
                this.inventory.push({
                    itemType: 'lootbox',
                    itemName: randomBox.name,
                    boxType: randomType,
                    quantity: 1,
                    acquiredAt: new Date()
                });
            }
            rewards.random_box = randomBox.name;
            this.markModified('inventory');
            break;
        }
    }

    await this.save();

    return {
        boxType,
        boxName: boxData.name,
        color: boxData.color,
        emoji: boxData.emoji,
        rewards
    };
};

userLevelSchema.methods.getConsolidatedInventory = function () {

    if (!this.inventory?.length) return [];

    const map = {};

    for (const item of this.inventory) {
        const key = `${item.itemType}_${item.boxType || item.itemName}`;

        if (!map[key]) {
            map[key] = {
                itemName: item.itemName,
                itemType: item.itemType,
                boxType: item.boxType || null,
                quantity: 0,
                firstAcquired: item.acquiredAt,
                lastAcquired: item.acquiredAt
            };
        }

        map[key].quantity += item.quantity ?? 1;

        if (item.acquiredAt < map[key].firstAcquired)
            map[key].firstAcquired = item.acquiredAt;

        if (item.acquiredAt > map[key].lastAcquired)
            map[key].lastAcquired = item.acquiredAt;
    }

    return Object.values(map);
};

userLevelSchema.methods.getJob = function (jobId) {
    if (!this.jobs?.data?.length) return null;
    return this.jobs.data.find(j => j.jobId === jobId) || null;
};

userLevelSchema.methods.getActiveJob = function () {
    if (!this.jobs?.activeJob) return null;
    return this.getJob(this.jobs.activeJob);
};

userLevelSchema.methods.joinJob = function (jobId, { setActive = true } = {}) {
    this.jobs ??= { data: [], activeJob: null };

    const existing = this.jobs.data.find(j => j.jobId === jobId);
    if (existing) {
        throw new Error('Ya estás en este trabajo');
    }

    const jobConfig = JobsConfig[jobId];
    if (!jobConfig) throw new Error('Trabajo no existente');

    const initialRank = jobConfig.ranks?.[0]?.name || 'Novato';

    this.jobs.data.push({
        jobId,
        level: 1,
        xp: 0,
        totalXp: 0,
        rank: initialRank,
        lastWork: null,
        cooldownUntil: null,
        stats: {
            timesWorked: 0,
            coinsEarned: 0,
            xpEarned: 0,
            fails: 0
        },
        perks: [], 
        isIllegal: jobConfig.illegal || false,
        joinedAt: new Date()
    });

    if (setActive) {
        this.jobs.activeJob = jobId;
    }

    return {
        joined: true,
        jobId,
        active: setActive
    };
};

userLevelSchema.methods.setActiveJob = function (jobId) {
    const job = this.getJob(jobId);
    if (!job) throw new Error('No tienes este trabajo');

    this.jobs.activeJob = jobId;
    return job;
};

userLevelSchema.methods.leaveJob = function (jobId) {
    if (!this.jobs?.data?.length) {
        throw new Error('No tienes trabajos');
    }

    const index = this.jobs.data.findIndex(j => j.jobId === jobId);
    if (index === -1) {
        throw new Error('No tienes este trabajo');
    }

    this.jobs.data.splice(index, 1);

    if (this.jobs.activeJob === jobId) {
        this.jobs.activeJob = null;
    }

    return { left: true, jobId };
};

userLevelSchema.methods.workJob = async function () {
    const job = this.getActiveJob();
    if (!job) {
        return { success: false, reason: 'No tienes un trabajo activo.' };
    }

    const jobConfig = JobsConfig[job.jobId];
    if (!jobConfig) {
        return { success: false, reason: 'Configuración del trabajo no encontrada.' };
    }

    const now = new Date();
    const cooldownMs = jobConfig.cooldown ?? 60 * 60 * 1000;

    if (job.cooldownUntil && job.cooldownUntil > now) {
        return {
            success: false,
            reason: `Ya trabajaste recientemente. Tiempo restante: <t:${Math.floor(job.cooldownUntil.getTime() / 1000)}:R>`,
            cooldownEndsAt: job.cooldownUntil
        };
    }

    const coins = Math.floor(
        Math.random() * (jobConfig.rewards.coins.max - jobConfig.rewards.coins.min + 1)
        + jobConfig.rewards.coins.min
    );

    const xp = Math.floor(
        Math.random() * (jobConfig.rewards.xp.max - jobConfig.rewards.xp.min + 1)
        + jobConfig.rewards.xp.min
    );

    job.xp += xp;
    job.totalXp += xp;
    job.stats.timesWorked++;
    job.stats.coinsEarned += coins;
    job.stats.xpEarned += xp;

    const xpPerLevel = jobConfig.xpPerLevel ?? 100;
    let leveledUp = false;

    while (job.xp >= xpPerLevel) {
        job.xp -= xpPerLevel;
        job.level++;
        leveledUp = true;
    }

    let rankUp = false;
    if (jobConfig.ranks?.length) {
        const newRank = jobConfig.ranks
            .slice()
            .reverse()
            .find(r => job.level >= r.level);

        if (newRank && newRank.name !== job.rank) {
            job.rank = newRank.name;
            rankUp = true;
        }
    }

    this.coins += coins;
    await this.addXP(xp, 'job');

    job.lastWork = now;
    job.cooldownUntil = new Date(now.getTime() + cooldownMs);

    this.markModified('jobs');
    await this.save();

    return {
        success: true,
        jobId: job.jobId,
        jobName: jobConfig.name,
        emoji: jobConfig.emoji,
        rewards: { coins, xp },
        level: job.level,
        rank: job.rank,
        progress: {
            currentXP: job.xp,
            xpToNext: xpPerLevel
        },
        cooldownEndsAt: job.cooldownUntil,
        leveledUp,
        rankUp
    };
};

userLevelSchema.set('toObject', { getters: true });
userLevelSchema.set('toJSON', { getters: true });

export default mongoose.model("UserLevel", userLevelSchema);