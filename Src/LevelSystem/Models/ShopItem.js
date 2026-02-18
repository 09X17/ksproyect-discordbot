import mongoose from 'mongoose';

/* =========================
   SUBSCHEMAS
========================= */

const costSchema = new mongoose.Schema({
    coins: { type: Number, default: 0, min: 0 },
    tokens: { type: Number, default: 0, min: 0 },
    xp: { type: Number, default: 0, min: 0 }
}, { _id: false });

const revenueSchema = new mongoose.Schema({
    coins: { type: Number, default: 0 },
    tokens: { type: Number, default: 0 },
    xp: { type: Number, default: 0 }
}, { _id: false });

/* =========================
   MAIN SCHEMA
========================= */

const shopItemSchema = new mongoose.Schema({

    guildId: {
        type: String,
        required: true,
        index: true
    },

    name: {
        type: String,
        required: true,
        trim: true
    },

    description: {
        type: String,
        default: '',
        trim: true
    },

    type: {
        type: String,
        required: true,
        enum: [
            'boost_user',
            'boost_server',
            'economy',
            'role',
            'badge',
            'title',
            "tool",
            'cosmetic',
            'consumable',
            'utility',
            'permission',
            'custom'
        ]
    },

    category: {
        type: String,
        enum: [
            'general',
            'boosts_user',
            'boosts_server',
            'economy',
            'consumables',
            'roles',
            'cosmetic',
            'utilities',
            "tool",
            'permission',
            'limited'
        ],
        default: 'general'
    },

    /* =========================
       MULTI-CURRENCY COST
    ========================= */

    cost: {
        type: costSchema,
        required: true,
        validate: {
            validator: function (value) {
                return (value.coins || 0) > 0 ||
                    (value.tokens || 0) > 0 ||
                    (value.xp || 0) > 0;
            },
            message: 'El item debe tener al menos un costo mayor a 0'
        }
    },

    stock: {
        type: Number,
        default: -1,
        min: -1
    },

    limited: {
        type: Boolean,
        default: false
    },

    icon: {
        type: String,
        default: '🛒'
    },

    color: {
        type: String,
        default: '#5865F2'
    },

    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    requirements: {
        minLevel: { type: Number, default: 0 },
        maxLevel: { type: Number, default: null },
        requiredRoles: [String],
        requiredPermissions: [String]
    },

    cooldown: {
        type: Number,
        default: 0
    },

    purchaseLimit: {
        perUser: { type: Number, default: -1 },
        perDay: { type: Number, default: -1 }
    },

    stats: {
        purchases: { type: Number, default: 0 },
        revenue: { type: revenueSchema, default: () => ({}) },
        lastPurchase: Date
    },

    active: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});


shopItemSchema.index({ guildId: 1, name: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, type: 1 });
shopItemSchema.index({ guildId: 1, category: 1 });
shopItemSchema.index({ guildId: 1, 'cost.coins': 1 });
shopItemSchema.index({ guildId: 1, 'cost.tokens': 1 });


shopItemSchema.methods.canPurchase = function (userLevel, member, purchasesToday = 0) {

    if (!this.active) {
        return { canBuy: false, reason: 'Este artículo no está disponible' };
    }

    if (this.stock === 0) {
        return { canBuy: false, reason: 'Agotado' };
    }

    if (this.requirements.minLevel > 0 &&
        userLevel.level < this.requirements.minLevel) {
        return { canBuy: false, reason: `Requiere nivel ${this.requirements.minLevel}` };
    }

    if (this.requirements.maxLevel &&
        userLevel.level > this.requirements.maxLevel) {
        return { canBuy: false, reason: `Máximo nivel ${this.requirements.maxLevel}` };
    }

    for (const roleId of this.requirements.requiredRoles) {
        if (!member.roles.cache.has(roleId)) {
            return { canBuy: false, reason: 'Roles requeridos no encontrados' };
        }
    }

    if (this.purchaseLimit.perDay > 0 &&
        purchasesToday >= this.purchaseLimit.perDay) {
        return { canBuy: false, reason: 'Límite diario alcanzado' };
    }

    return { canBuy: true, reason: '' };
};


shopItemSchema.methods.applyEffects = async function (userLevel, member) {

    const effects = {};

    if (this.type === 'economy') {

        if (this.data?.coinsAmount) {
            userLevel.coins += this.data.coinsAmount;
            effects.coins = this.data.coinsAmount;
        }

        if (this.data?.tokensAmount) {
            userLevel.tokens += this.data.tokensAmount;
            effects.tokens = this.data.tokensAmount;
        }

        if (this.data?.xpAmount) {
            userLevel.xp += this.data.xpAmount;
            effects.xp = this.data.xpAmount;
        }

        effects.success = true;
        return effects;
    }

    if (this.type === 'permission') {

        const permission = this.data?.permission;
        const hexColor = this.data?.hexColor;

        if (!permission) return effects;

        userLevel.customization ??= {};
        userLevel.customization.permissions ??= {};
        userLevel.customization.active ??= {};

        userLevel.customization.permissions[permission] = true;

        if (hexColor && /^#([0-9A-F]{6})$/i.test(hexColor)) {
            userLevel.customization.active.accentColor = hexColor;
        }

        effects.permissionGranted = permission;
        effects.success = true;

        return effects;
    }

    if (this.type === 'boost_user' || this.type === 'boost_server') {

        if (!this.data) return effects;

        const multiplierResult =
            await userLevel.activateBoostFromItem(this, 1);

        effects.boost = {
            multiplier: multiplierResult,
            duration: this.data.duration
                ? this.data.duration / 3600
                : null,
            type: this.type,
            success: true
        };
    }

    if (this.type === 'tool') {

        const toolId = this.data?.toolId;
        if (!toolId) return { success: false };

        const { toolsConfig } = await import('../Configs/toolsConfig.js');
        const toolConfig = toolsConfig[toolId];

        if (!toolConfig) {
            return { success: false };
        }

        userLevel.crafting ??= {};
        userLevel.crafting.tools ??= [];

        userLevel.crafting.tools.push({
            toolId: toolConfig.id,
            name: toolConfig.name,
            rarity: toolConfig.rarity,
            durability: toolConfig.maxDurability,
            maxDurability: toolConfig.maxDurability,
            bonus: toolConfig.bonus,
            equipped: false,
            upgradeLevel: 0,
            acquiredAt: new Date()
        });

        await userLevel.save();

        return {
            success: true,
            tool: {
                name: toolConfig.name,
                rarity: toolConfig.rarity
            }
        };
    }

    return effects;
};


shopItemSchema.methods.registerPurchase = function (quantity = 1) {

    if (this.stock > 0) {
        this.stock -= quantity;
    }

    this.stats.purchases += quantity;

    this.stats.revenue.coins += (this.cost.coins || 0) * quantity;
    this.stats.revenue.tokens += (this.cost.tokens || 0) * quantity;
    this.stats.revenue.xp += (this.cost.xp || 0) * quantity;

    this.stats.lastPurchase = new Date();
};


export default mongoose.model('ShopItem', shopItemSchema);
