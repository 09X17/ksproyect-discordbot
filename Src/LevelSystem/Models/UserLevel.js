import mongoose from "mongoose";
import { boxTypes, getRandomInRange } from "../Managers/boxTypesConfig.js";
import JobsConfig from "../Managers/JobsConfig.js";
import { toolsConfig, TOOL_RARITIES } from "../Configs/toolsConfig.js";
import { materialsConfig } from "../Configs/materialConfigs.js";

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
    },
    crafting: {
        inventory: {
            capacity: { type: Number, default: 80000 },
            weight: { type: Number, default: 0 }
        },
        activeZone: {
            type: String,
            default: "forest_mine"
        },
        equippedToolId: {
            type: String,
            default: null
        },
        miningCooldownUntil: {
            type: Date,
            default: null
        },
        tools: [{
            toolId: { type: String, required: true },
            name: String,
            rarity: String,
            tier: { type: Number, default: 1 },
            durability: { type: Number, default: 100 },
            maxDurability: { type: Number, default: 100 },
            upgradeLevel: { type: Number, default: 0 },
            enchantments: [{
                enchantId: String,
                bonus: {
                    quantityMultiplier: Number,
                    rareChanceBonus: Number,
                    qualityBonus: Number
                }
            }],
            bonus: {
                quantityMultiplier: { type: Number, default: 1 },
                rareChanceBonus: { type: Number, default: 0 },
                qualityBonus: { type: Number, default: 0 }
            },
            acquiredAt: { type: Date, default: Date.now }
        }],
        materials: [{
            materialId: { type: String, required: true },
            quantity: { type: Number, default: 0 },
            quality: { type: Number, default: 100 }, // 1–100
            rarity: { type: String, required: true },
            metadata: {
                refined: { type: Boolean, default: false },
                bound: { type: Boolean, default: false }, // no trade
                origin: String // job/event/box
            }
        }],
        blueprints: [{
            blueprintId: String,
            level: { type: Number, default: 1 },
            discoveredAt: Date
        }],
        stats: {
            craftedItems: { type: Number, default: 0 },
            failedCrafts: { type: Number, default: 0 },
            totalMaterialsUsed: { type: Number, default: 0 },
            minedMaterials: { type: Number, default: 0 },
            miningSessions: { type: Number, default: 0 }
        }
    },
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
    const cost = item.cost || {};

    const totalCoins = (cost.coins || 0) * quantity;
    const totalTokens = (cost.tokens || 0) * quantity;
    const totalXP = (cost.xp || 0) * quantity;

    /* =========================
       VALIDAR BALANCE
    ========================= */

    if (this.coins < totalCoins)
        throw new Error('Monedas insuficientes');

    if (this.tokens < totalTokens)
        throw new Error('Tokens insuficientes');

    if (this.xp < totalXP)
        throw new Error('XP insuficiente');

    /* =========================
       DESCONTAR
    ========================= */

    if (totalCoins > 0) {
        this._spendCoinsInternal(
            totalCoins,
            `Compra: ${item.name} x${quantity}`,
            'shop'
        );
    }

    if (totalTokens > 0) {
        this.tokens -= totalTokens;
    }

    if (totalXP > 0) {
        this.xp -= totalXP;

        const newLevel = await this.calculateLevel();
        if (newLevel < this.level) {
            this.level = newLevel;
        }
    }


    this.purchaseHistory.push({
        itemId: item._id,
        itemName: item.name,
        cost: {
            coins: totalCoins,
            tokens: totalTokens,
            xp: totalXP
        },
        quantity,
        purchasedAt: now
    });


    let effects = {};

    try {

        if (item.type === 'boost_user' || item.type === 'boost_server') {

            const multiplier =
                await this.activateBoostFromItem(item, quantity);

            effects.boost = { multiplier };
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
        }

        else {
            effects = await this.applyItemEffects(item, quantity);
        }

    } catch (err) {
        throw new Error(`Error aplicando efectos del item: ${err.message}`);
    }


    const inventoryTypes = ['consumable', 'utility'];

    if (inventoryTypes.includes(item.type)) {

        this.inventory ??= [];

        const existing = this.inventory.find(
            i => i.itemId?.toString() === item._id.toString()
        );

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
    }


    item.registerPurchase(quantity);


    await this.save();
    await item.save();

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

            if (coins > 0) effects.coinsGained = coins;
            if (tokens > 0) effects.tokensGained = tokens;
            if (xp > 0) effects.xpGained = xp;

            break;
        }

        case 'role': {
            effects.roleGranted = item.data?.roleId;
            break;
        }

        case 'tool': {

            const toolId = item.data?.toolId;
            if (!toolId) break;

            const toolConfig = toolsConfig[toolId];
            if (!toolConfig) break;

            this.crafting ??= {};
            this.crafting.tools ??= [];

            for (let i = 0; i < quantity; i++) {

                this.crafting.tools.push({
                    toolId: toolConfig.id,
                    name: toolConfig.name,
                    rarity: toolConfig.rarity,
                    tier: toolConfig.tier ?? 1,
                    durability: toolConfig.maxDurability,
                    maxDurability: toolConfig.maxDurability,
                    bonus: toolConfig.bonus,
                    upgradeLevel: 0,
                    enchantments: [],
                    acquiredAt: new Date()
                });

            }

            this.markModified("crafting.tools");

            effects.toolGranted = {
                toolId: toolConfig.id,
                quantity
            };

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

userLevelSchema.methods.getMaterial = function (materialId) {
    return this.crafting.materials.find(m => m.materialId === materialId) || null;
};

userLevelSchema.methods.getUsedCraftingWeight = function () {
    return this.crafting.materials.reduce((total, mat) => {
        const config = materialsConfig[mat.materialId];
        if (!config) return total;
        return total + (config.weight * mat.quantity);
    }, 0);
};

userLevelSchema.methods.canCarryMaterial = function (materialId, quantity) {
    const config = materialsConfig[materialId];
    if (!config) throw new Error("Material no válido");

    const currentWeight = this.getUsedCraftingWeight();
    const newWeight = currentWeight + (config.weight * quantity);

    return newWeight <= this.crafting.inventory.capacity;
};

userLevelSchema.methods.addMaterial = async function (materialId, quantity = 1, options = {}) {
    if (quantity <= 0) return false;

    const config = materialsConfig[materialId];
    if (!config) throw new Error("Material no válido");

    if (!this.canCarryMaterial(materialId, quantity)) {
        throw new Error("Inventario lleno");
    }

    const quality = options.quality ?? Math.floor(Math.random() * 31) + 70;

    const existing = this.getMaterial(materialId);

    if (existing) {
        const totalQty = existing.quantity + quantity;
        existing.quality = Math.floor(
            ((existing.quality * existing.quantity) + (quality * quantity)) / totalQty
        );
        existing.quantity = totalQty;
    } else {
        this.crafting.materials.push({
            materialId,
            quantity,
            quality,
            rarity: config.rarity,
            metadata: {
                refined: false,
                bound: options.bound ?? false,
                origin: options.origin ?? "unknown"
            }
        });
    }

    this.markModified("crafting.materials");
    return true;
};

userLevelSchema.methods.removeMaterial = function (materialId, quantity = 1) {
    const material = this.getMaterial(materialId);
    if (!material || material.quantity < quantity) {
        throw new Error("Material insuficiente");
    }

    material.quantity -= quantity;

    if (material.quantity <= 0) {
        this.crafting.materials = this.crafting.materials.filter(
            m => m.materialId !== materialId
        );
    }

    this.crafting.stats.totalMaterialsUsed += quantity;
    this.markModified("crafting.materials");
};

userLevelSchema.methods.hasMaterials = function (requirements) {
    return requirements.every(req => {
        const mat = this.getMaterial(req.materialId);
        return mat && mat.quantity >= req.quantity;
    });
};

userLevelSchema.methods.consumeMaterials = function (requirements) {
    requirements.forEach(req => {
        this.removeMaterial(req.materialId, req.quantity);
    });
};

userLevelSchema.methods.getCraftQualityBonus = function (requirements) {
    let totalQuality = 0;
    let totalQty = 0;

    requirements.forEach(req => {
        const mat = this.getMaterial(req.materialId);
        if (mat) {
            totalQuality += mat.quality * req.quantity;
            totalQty += req.quantity;
        }
    });

    if (totalQty === 0) return 0;

    const avgQuality = totalQuality / totalQty;

    return (avgQuality - 70) / 300;
};

userLevelSchema.methods.craft = async function (blueprintId) {

    const blueprint = blueprintsConfig[blueprintId];
    if (!blueprint) throw new Error("Blueprint no válido");

    if (!this.hasMaterials(blueprint.requires)) {
        throw new Error("Materiales insuficientes");
    }

    const qualityBonus = this.getCraftQualityBonus(blueprint.requires);
    const successRate = blueprint.successRate + qualityBonus;

    const roll = Math.random();
    const success = roll <= successRate;

    this.consumeMaterials(blueprint.requires);

    if (success) {

        await this.applyCraftResult(blueprint.result);

        this.crafting.stats.craftedItems++;

    } else {

        this.crafting.stats.failedCrafts++;

    }

    this.markModified("crafting");

    return {
        success,
        successRate: Math.min(successRate, 0.99)
    };
};

userLevelSchema.methods.applyCraftResult = async function (result) {

    switch (result.type) {

        case "material":
            await this.addMaterial(result.materialId, result.quantity);
            break;

        case "coins":
            this.coins += result.quantity;
            break;

        case "tokens":
            this.tokens += result.quantity;
            break;

        case "lootbox":
            await this.addLootBoxToInventory(result.boxType, result.name, result.quantity);
            break;

        default:
            throw new Error("Tipo de resultado no soportado");
    }
};

userLevelSchema.methods.refine = async function (blueprintId) {
    return this.craft(blueprintId);
};

userLevelSchema.methods.upgradeCraftingCapacity = async function (amount, cost) {

    if (this.coins < cost) throw new Error("Monedas insuficientes");

    this.coins -= cost;
    this.crafting.inventory.capacity += amount;

    this.markModified("crafting.inventory");

    return this.crafting.inventory.capacity;
};

userLevelSchema.methods.equipTool = async function (toolId) {

    if (!this.crafting?.tools?.length)
        throw new Error("No tienes herramientas.");

    const tool = this.crafting.tools.find(t => t.toolId === toolId);

    if (!tool)
        throw new Error("No posees esta herramienta.");

    if (tool.durability <= 0)
        throw new Error("La herramienta está rota.");

    this.crafting.equippedToolId = toolId;

    this.markModified("crafting");

    return tool;
};

userLevelSchema.methods.repairTool = async function (toolId) {

    const tool = this.crafting.tools.find(t => t.toolId === toolId);
    if (!tool) throw new Error("Herramienta no encontrada.");

    const config = toolsConfig[toolId];
    if (!config) throw new Error("Configuración inválida.");

    const rarityData = TOOL_RARITIES[config.rarity];

    const repairCost = Math.floor(
        config.repair.baseCostCoins *
        (1 - (tool.durability / config.maxDurability)) *
        rarityData.repairMultiplier
    );

    if (this.coins < repairCost) {
        throw new Error("Monedas insuficientes para reparar.");
    }

    // Coste en materiales
    for (const mat of config.repair.materialCost) {
        const userMat = this.crafting.materials.find(m => m.materialId === mat.materialId);
        if (!userMat || userMat.quantity < mat.quantity) {
            throw new Error("Materiales insuficientes para reparar.");
        }
    }

    // Descontar coins
    this.coins -= repairCost;

    // Descontar materiales
    for (const mat of config.repair.materialCost) {
        const userMat = this.crafting.materials.find(m => m.materialId === mat.materialId);
        userMat.quantity -= mat.quantity;
    }

    tool.durability = config.maxDurability;

    this.markModified("crafting");

    return {
        repaired: true,
        cost: repairCost
    };
};

userLevelSchema.methods.upgradeTool = async function (toolId) {

    const tool = this.crafting.tools.find(t => t.toolId === toolId);
    if (!tool) throw new Error("Herramienta no encontrada.");

    const baseCost = 200;
    const upgradeCost = baseCost * (tool.upgradeLevel + 1);

    if (this.coins < upgradeCost) {
        throw new Error("Monedas insuficientes.");
    }

    this.coins -= upgradeCost;

    tool.upgradeLevel++;
    tool.maxDurability += 20;
    tool.durability += 20;

    if (tool.bonus.quantityMultiplier)
        tool.bonus.quantityMultiplier += 0.02;

    if (tool.bonus.rareChanceBonus !== undefined)
        tool.bonus.rareChanceBonus += 0.01;

    /* =========================
       ⬆ SISTEMA DE TIER
    ========================= */

    const tierThreshold = 3; // cada 3 upgrades sube tier
    const maxTier = 4;

    const newTier = Math.floor(tool.upgradeLevel / tierThreshold) + 1;

    if (newTier > tool.tier && newTier <= maxTier) {
        tool.tier = newTier;
    }

    this.markModified("crafting.tools");

    return {
        upgraded: true,
        newLevel: tool.upgradeLevel,
        newTier: tool.tier
    };
};

userLevelSchema.methods.setActiveZone = async function (zoneId) {
    this.crafting.activeZone = zoneId;
    this.markModified("crafting");
};

userLevelSchema.methods.getCraftingStatus = function (requirements) {

    const missing = [];
    const available = [];

    for (const req of requirements) {

        const userMat = this.getMaterial(req.materialId);
        const ownedQty = userMat?.quantity ?? 0;

        if (ownedQty < req.quantity) {
            missing.push({
                materialId: req.materialId,
                required: req.quantity,
                owned: ownedQty,
                missing: req.quantity - ownedQty
            });
        }

        available.push({
            materialId: req.materialId,
            required: req.quantity,
            owned: ownedQty
        });
    }

    return {
        canCraft: missing.length === 0,
        missing,
        available
    };
};

userLevelSchema.methods.canMine = function () {

    const now = new Date();

    if (!this.crafting.miningCooldownUntil)
        return { allowed: true };

    if (this.crafting.miningCooldownUntil <= now)
        return { allowed: true };

    return {
        allowed: false,
        remaining: this.crafting.miningCooldownUntil - now
    };
};

userLevelSchema.methods.applyMiningCooldown = async function (minutes = 3) {

    const now = new Date();
    const cooldown = new Date(now.getTime() + minutes * 60 * 1000);

    this.crafting.miningCooldownUntil = cooldown;

    this.markModified("crafting");

    return cooldown;
};


userLevelSchema.set('toObject', { getters: true });
userLevelSchema.set('toJSON', { getters: true });

export default mongoose.model("UserLevel", userLevelSchema);