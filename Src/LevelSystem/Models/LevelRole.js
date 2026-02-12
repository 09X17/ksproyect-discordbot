import mongoose from 'mongoose';

const levelRoleSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    level: {
        type: Number,
        required: true,
        min: 1
    },
    roleId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#5865F2'
    },
    icon: {
        type: String,
        default: '🏆'
    },
    description: {
        type: String,
        default: ''
    },
    price: {
        type: Number,
        default: 0,
        min: 0
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
        requiredRoles: [String],
        excludedRoles: [String]
    },
    permissions: {
        canBuy: {
            type: Boolean,
            default: true
        },
        canRemove: {
            type: Boolean,
            default: false
        },
        autoRemove: {
            type: Boolean,
            default: false
        },
        stackable: {
            type: Boolean,
            default: false
        }
    },
    effects: {
        xpMultiplier: {
            type: Number,
            default: 1.0,
            min: 0.1,
            max: 5.0
        },
        currencyBonus: {
            type: Number,
            default: 0,
            min: 0
        },
        specialCommands: [String],
        customPermissions: [String]
    },
    limitations: {
        maxUsers: {
            type: Number,
            default: null
        },
        duration: {
            type: Number,
            default: null
        },
        cooldown: {
            type: Number,
            default: 0
        }
    },
    stats: {
        purchases: {
            type: Number,
            default: 0
        },
        activeUsers: {
            type: Number,
            default: 0
        },
        lastPurchase: {
            type: Date,
            default: null
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
        }
    }
}, {
    timestamps: true
});

// Índices
levelRoleSchema.index({ guildId: 1, level: 1 }, { unique: true });
levelRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });
levelRoleSchema.index({ guildId: 1, price: 1 });

// Métodos
levelRoleSchema.methods.canUserBuy = async function(userLevel, member) {
    // Verificar nivel mínimo
    if (this.requirements.minLevel > 0 && userLevel.level < this.requirements.minLevel) {
        return { canBuy: false, reason: `Requiere nivel ${this.requirements.minLevel} o superior` };
    }
    
    // Verificar nivel máximo
    if (this.requirements.maxLevel && userLevel.level > this.requirements.maxLevel) {
        return { canBuy: false, reason: `Requiere nivel ${this.requirements.maxLevel} o inferior` };
    }
    
    // Verificar roles requeridos
    for (const roleId of this.requirements.requiredRoles) {
        if (!member.roles.cache.has(roleId)) {
            return { canBuy: false, reason: 'No tienes los roles requeridos' };
        }
    }
    
    // Verificar roles excluidos
    for (const roleId of this.requirements.excludedRoles) {
        if (member.roles.cache.has(roleId)) {
            return { canBuy: false, reason: 'Tienes roles excluidos' };
        }
    }
    
    // Verificar límite de usuarios
    if (this.limitations.maxUsers && this.stats.activeUsers >= this.limitations.maxUsers) {
        return { canBuy: false, reason: 'Este rol ha alcanzado el límite máximo de usuarios' };
    }
    
    return { canBuy: true, reason: '' };
};

levelRoleSchema.methods.applyEffects = function(userLevel) {
    if (this.effects.xpMultiplier !== 1.0) {
        userLevel.boostMultiplier *= this.effects.xpMultiplier;
    }
    
    if (this.effects.currencyBonus > 0) {
        // Aquí se agregaría la lógica para bonificación de monedas
    }
    
    return userLevel;
};

levelRoleSchema.methods.purchase = function() {
    this.stats.purchases++;
    this.stats.activeUsers++;
    this.stats.lastPurchase = new Date();
};

levelRoleSchema.methods.expire = function() {
    if (this.stats.activeUsers > 0) {
        this.stats.activeUsers--;
    }
};

export default mongoose.model('LevelRole', levelRoleSchema);