import mongoose from 'mongoose';

const userPerkSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    guildId: {
        type: String,
        required: true,
        index: true
    },
    perkId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['xp', 'currency', 'utility', 'cosmetic', 'special'],
        default: 'xp'
    },
    tier: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    unlockedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    active: {
        type: Boolean,
        default: true
    },
    stackable: {
        type: Boolean,
        default: false
    },
    effects: {
        xpMultiplier: {
            type: Number,
            default: 1.0
        },
        xpFlatBonus: {
            type: Number,
            default: 0
        },
        currencyMultiplier: {
            type: Number,
            default: 1.0
        },
        cooldownReduction: {
            type: Number,
            default: 0
        },
        specialAbility: String
    },
    requirements: {
        level: {
            type: Number,
            default: 0
        },
        totalXP: {
            type: Number,
            default: 0
        },
        streakDays: {
            type: Number,
            default: 0
        },
        achievements: [String]
    },
    limitations: {
        maxActivations: {
            type: Number,
            default: -1
        },
        cooldown: {
            type: Number,
            default: 0
        },
        duration: {
            type: Number,
            default: 0
        }
    },
    stats: {
        activations: {
            type: Number,
            default: 0
        },
        totalXPGained: {
            type: Number,
            default: 0
        },
        lastActivated: Date
    },
    metadata: {
        source: {
            type: String,
            enum: ['level', 'shop', 'achievement', 'event', 'admin'],
            default: 'level'
        },
        sourceId: String,
        rarity: {
            type: String,
            enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
            default: 'common'
        }
    }
}, {
    timestamps: true
});

// Índices
userPerkSchema.index({ userId: 1, guildId: 1, perkId: 1 }, { unique: true });
userPerkSchema.index({ guildId: 1, type: 1 });
userPerkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userPerkSchema.index({ 'metadata.rarity': 1 });

// Métodos
userPerkSchema.methods.canActivate = function() {
    if (!this.active) return false;
    
    if (this.expiresAt && this.expiresAt < new Date()) {
        this.active = false;
        return false;
    }
    
    if (this.limitations.maxActivations > 0 && 
        this.stats.activations >= this.limitations.maxActivations) {
        return false;
    }
    
    if (this.limitations.cooldown > 0 && this.stats.lastActivated) {
        const cooldownEnd = new Date(this.stats.lastActivated);
        cooldownEnd.setMinutes(cooldownEnd.getMinutes() + this.limitations.cooldown);
        
        if (cooldownEnd > new Date()) {
            return false;
        }
    }
    
    return true;
};

userPerkSchema.methods.activate = async function(userLevel) {
    if (!this.canActivate()) {
        return { success: false, reason: 'Perk no disponible' };
    }
    
    this.stats.activations++;
    this.stats.lastActivated = new Date();
    
    // Aplicar efectos al userLevel
    if (this.effects.xpMultiplier !== 1.0) {
        userLevel.boostMultiplier *= this.effects.xpMultiplier;
    }
    
    if (this.effects.xpFlatBonus > 0) {
        await userLevel.addXP(this.effects.xpFlatBonus, 'perk_activation');
        this.stats.totalXPGained += this.effects.xpFlatBonus;
    }
    
    // Configurar expiración si tiene duración
    if (this.limitations.duration > 0 && !this.expiresAt) {
        const expires = new Date();
        expires.setHours(expires.getHours() + this.limitations.duration);
        this.expiresAt = expires;
    }
    
    await this.save();
    await userLevel.save();
    
    return {
        success: true,
        effects: this.effects,
        expiresAt: this.expiresAt
    };
};

userPerkSchema.methods.getRemainingTime = function() {
    if (!this.expiresAt) return null;
    
    const now = new Date();
    const diff = this.expiresAt - now;
    
    if (diff <= 0) return { expired: true };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return {
        hours,
        minutes,
        seconds,
        totalSeconds: Math.floor(diff / 1000)
    };
};

export default mongoose.model('UserPerk', userPerkSchema);