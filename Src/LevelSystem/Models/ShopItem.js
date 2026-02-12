import mongoose from 'mongoose';

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
        enum: [
            'boost_user',
            'boost_server',
            'xp',
            'role',
            "economy",
            'badge',
            'title',
            'cosmetic',
            "currency",
            'consumable',
            'utility',
            "permission",
            'custom'
        ],
        default: 'custom'
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'xp',
        enum: ['xp', 'coins', 'tokens']
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
    category: {
        type: String,
        enum: [
            'general',
            'boosts_user',
            'boosts_server',
            'xp',
            'economy',
            'consumables',
            'roles',
            'cosmetics',
            'utilities',
            "permission",
            'limited'
        ],
        default: 'general'
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
        // Roles
        roleId: String,

        // Boosts
        duration: Number, // segundos
        multiplier: Number,
        stackable: { type: Boolean, default: false },

        // Economía / XP
        xpAmount: Number,
        coinsAmount: Number,
        tokensAmount: Number,

        // Cosméticos
        badgeId: String,
        title: String,
        hexColor: String,

        permission: String,

        // Custom
        command: String
    },
    requirements: {
        minLevel: {
            type: Number,
            default: 0
        },
        maxLevel: {
            type: Number,
            default: null
        },
        requiredItems: [{
            itemId: String,
            quantity: Number
        }],
        requiredRoles: [String],
        requiredPermissions: [String]
    },
    effects: {
        xpMultiplier: {
            type: Number,
            default: 1.0
        },
        xpBonus: {
            type: Number,
            default: 0
        },
        currencyMultiplier: {
            type: Number,
            default: 1.0
        },
        specialEffect: String
    },
    cooldown: {
        type: Number,
        default: 0
    },
    purchaseLimit: {
        perUser: {
            type: Number,
            default: -1
        },
        perDay: {
            type: Number,
            default: -1
        }
    },
    metadata: {
        createdBy: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedBy: String,
        updatedAt: {
            type: Date,
            default: Date.now
        },
        tags: [String]
    },
    stats: {
        purchases: {
            type: Number,
            default: 0
        },
        totalRevenue: {
            type: Number,
            default: 0
        },
        lastPurchase: Date
    },
    isTicket: {
        type: Boolean,
        default: false
    },
    ticketData: {
        giveawayUsage: {
            type: Boolean,
            default: false
        },
        ticketsPerPurchase: {
            type: Number,
            default: 1
        },
        requiredForGiveaway: {
            type: String, // ID del sorteo específico
            default: null
        },
        giveawayQuantity: {
            type: Number, // Cantidad necesaria para entrar
            default: 1
        },
        consumable: { // Si se consume al usarlo
            type: Boolean,
            default: true
        },
        stackable: { // Si se pueden acumular
            type: Boolean,
            default: true
        },
        expirationDays: {
            type: Number,
            default: 0 // 0 = no expira
        }
    },
    giveawayValidation: {
        enabled: {
            type: Boolean,
            default: false
        },
        minTickets: {
            type: Number,
            default: 0
        },
        maxTickets: {
            type: Number,
            default: 0 // 0 = ilimitado
        },
        allowedGiveaways: [String], // IDs de sorteos permitidos
        exclusiveToGiveaway: String // Solo para un sorteo específico
    },
    active: {
        type: Boolean,
        default: true
    },
    enabled: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

// Índices
shopItemSchema.index({ guildId: 1, name: 1 }, { unique: true });
shopItemSchema.index({ guildId: 1, type: 1 });
shopItemSchema.index({ guildId: 1, category: 1 });
shopItemSchema.index({ guildId: 1, price: 1 });
shopItemSchema.index({ 'metadata.tags': 1 });

// Métodos
shopItemSchema.methods.canPurchase = async function (userLevel, member, purchasesToday = 0) {
    // Verificar si está activo
    if (!this.active) {
        return { canBuy: false, reason: 'Este artículo no está disponible' };
    }

    // Verificar stock
    if (this.stock === 0) {
        return { canBuy: false, reason: 'Agotado' };
    }

    // Verificar nivel mínimo
    if (this.requirements.minLevel > 0 && userLevel.level < this.requirements.minLevel) {
        return { canBuy: false, reason: `Requiere nivel ${this.requirements.minLevel}` };
    }

    // Verificar nivel máximo
    if (this.requirements.maxLevel && userLevel.level > this.requirements.maxLevel) {
        return { canBuy: false, reason: `Máximo nivel ${this.requirements.maxLevel}` };
    }

    // Verificar roles requeridos
    for (const roleId of this.requirements.requiredRoles) {
        if (!member.roles.cache.has(roleId)) {
            return { canBuy: false, reason: 'Roles requeridos no encontrados' };
        }
    }

    // Verificar límite por usuario
    if (this.purchaseLimit.perUser > 0) {
        // Aquí se implementaría la verificación de compras previas
    }

    // Verificar límite diario
    if (this.purchaseLimit.perDay > 0 && purchasesToday >= this.purchaseLimit.perDay) {
        return { canBuy: false, reason: 'Límite diario alcanzado' };
    }

    return { canBuy: true, reason: '' };
};

shopItemSchema.methods.applyEffects = async function (userLevel, member) {
    console.log('🎯 applyEffects llamado para:', {
        item: this.name,
        type: this.type,
        data: this.data
    });

    const effects = {};


    if (this.type === 'economy') {
        if (!this.data) return effects;

        if (this.data.coinsAmount) {
            userLevel.coins += this.data.coinsAmount;
            effects.coins = this.data.coinsAmount;
        }

        if (this.data.tokensAmount) {
            userLevel.tokens += this.data.tokensAmount;
            effects.tokens = this.data.tokensAmount;
        }

        if (this.data.xpAmount) {
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

        // Validar permisos permitidos
        if (!permission.startsWith('rank_color_') &&
            !['customBackground', 'customTitle', 'customAccentColor'].includes(permission)) {
            throw new Error(`Permiso inválido: ${permission}`);
        }

        // Guardar el permiso
        userLevel.customization.permissions[permission] = true;

        // Guardar el color en active para RankCard
        if (hexColor && /^#([0-9A-F]{6})$/i.test(hexColor)) {
            userLevel.customization.active.accentColor = hexColor;
        }

        effects.permissionGranted = permission;
        effects.success = true;

        await userLevel.save();

        return effects;
    }

    // Solo para boosts
    if (this.type === 'boost_user' || this.type === 'boost_server') {
        console.log('⚡ Es un boost, procesando...');

        if (!this.data) {
            console.log('⚠️ No hay data en el item');
            return effects;
        }

        console.log('📊 Data del boost:', {
            multiplier: this.data.multiplier,
            duration: this.data.duration
        });

        // Crear objeto para pasar
        const boostItem = {
            _id: this._id,
            name: this.name,
            type: this.type,
            data: this.data
        };

        console.log('📤 Enviando a activateBoostFromItem:', boostItem);

        try {
            // ¡¡¡ESTA ES LA LÍNEA CLAVE!!!
            console.log('🔧 Llamando userLevel.activateBoostFromItem...');
            const multiplierResult = await userLevel.activateBoostFromItem(boostItem, 1);
            console.log('✅ activateBoostFromItem retornó:', multiplierResult);

            effects.boost = {
                multiplier: multiplierResult,
                duration: this.data.duration / 3600,
                type: this.type,
                success: true
            };

        } catch (error) {
            console.error('❌ ERROR en activateBoostFromItem:', error);
            console.error('Stack:', error.stack);
            effects.error = error.message;
        }
    } else {
        console.log('📦 No es un boost, ignorando...');
    }

    console.log('📋 Efectos finales:', effects);
    return effects;
};

shopItemSchema.methods.purchase = function () {
    if (this.stock > 0) {
        this.stock--;
    }

    this.stats.purchases++;
    this.stats.totalRevenue += this.price;
    this.stats.lastPurchase = new Date();
};

export default mongoose.model('ShopItem', shopItemSchema);