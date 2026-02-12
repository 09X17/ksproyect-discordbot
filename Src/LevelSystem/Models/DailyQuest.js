import mongoose from 'mongoose';

const objectiveSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: [
            'send_messages',
            'join_voice',
            'react_messages',
            'earn_xp',
            'earn_coins',
            'invite_users',
            'complete_quests',
            'win_duels',
            'purchase_items',
            'reach_streak',
            'gift_items',
            'trade_complete',
            'vote_on_polls',
            'create_threads',
            'post_media',
            'attend_events'
        ],
        required: true
    },
    target: {
        type: Number,
        required: true,
        min: 1
    },
    description: {
        type: String,
        default: ''
    },
    unit: {
        type: String,
        enum: ['messages', 'minutes', 'reactions', 'xp', 'coins', 'users', 'quests', 'duels', 'items', 'days', 'times'],
        default: 'messages'
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: true });

const rewardSchema = new mongoose.Schema({
    xp: {
        type: Number,
        default: 0,
        min: 0
    },
    coins: {
        type: Number,
        default: 0,
        min: 0
    },
    tokens: {
        type: Number,
        default: 0,
        min: 0
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        },
        data: mongoose.Schema.Types.Mixed
    }],
    special: {
        title: {
            type: String,
            trim: true
        },
        badge: {
            type: String,
            trim: true
        },
        roleId: {
            type: String,
            trim: true
        },
        unlockable: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Unlockable'
        },
        effect: {
            type: String,
            enum: ['xp_boost', 'coin_boost', 'luck_boost', 'none'],
            default: 'none'
        },
        duration: {
            type: Number, // en horas
            default: 0
        }
    }
});

const requirementSchema = new mongoose.Schema({
    minLevel: {
        type: Number,
        default: 1,
        min: 1
    },
    maxLevel: {
        type: Number,
        default: null
    },
    requiredQuests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyQuest'
    }],
    requiredItems: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    roleRestrictions: [String],
    channelRestrictions: [String],
    timeRestrictions: {
        startTime: String, // "HH:MM"
        endTime: String,   // "HH:MM"
        daysOfWeek: [Number] // 0-6 (Domingo a Sábado)
    }
});

const limitationSchema = new mongoose.Schema({
    repeatable: {
        type: Boolean,
        default: false
    },
    maxCompletions: {
        type: Number,
        default: 1,
        min: 1
    },
    cooldownHours: {
        type: Number,
        default: 0,
        min: 0
    },
    timeLimitHours: {
        type: Number,
        default: 24,
        min: 1
    },
    dailyLimit: {
        type: Number,
        default: null
    },
    weeklyLimit: {
        type: Number,
        default: null
    },
    monthlyLimit: {
        type: Number,
        default: null
    }
});

const metadataSchema = new mongoose.Schema({
    createdBy: {
        type: String,
        default: 'system'
    },
    tags: [{
        type: String,
        lowercase: true,
        trim: true
    }],
    rarity: {
        type: String,
        enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
        default: 'common'
    },
    hidden: {
        type: Boolean,
        default: false
    },
    story: {
        title: String,
        description: String,
        chapter: Number
    },
    season: {
        type: String,
        default: 'default'
    },
    version: {
        type: String,
        default: '1.0.0'
    }
});

const statsSchema = new mongoose.Schema({
    completions: {
        type: Number,
        default: 0,
        min: 0
    },
    attempts: {
        type: Number,
        default: 0,
        min: 0
    },
    abandonment: {
        type: Number,
        default: 0,
        min: 0
    },
    completionRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalRewardsGiven: {
        xp: { 
            type: Number, 
            default: 0 
        },
        coins: { 
            type: Number, 
            default: 0 
        },
        tokens: { 
            type: Number, 
            default: 0 
        }
    },
    averageCompletionTime: {
        type: Number, // en segundos
        default: 0
    },
    fastestCompletion: {
        userId: String,
        time: Number,
        date: Date
    },
    lastCompleted: {
        type: Date,
        default: null
    }
});

const dailyQuestSchema = new mongoose.Schema({
    // Identificación
    guildId: {
        type: String,
        required: true,
        index: true
    },
    questId: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Información básica
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        minlength: 10,
        maxlength: 500
    },
    shortDescription: {
        type: String,
        maxlength: 150
    },
    
    // Clasificación
    type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'seasonal', 'achievement', 'tutorial', 'event', 'chain'],
        default: 'daily'
    },
    category: {
        type: String,
        enum: [
            'chat',
            'voice',
            'social',
            'economy',
            'combat',
            'collection',
            'exploration',
            'creative',
            'community',
            'competitive',
            'cooperative',
            'miscellaneous'
        ],
        default: 'chat'
    },
    difficulty: {
        type: String,
        enum: ['tutorial', 'easy', 'medium', 'hard', 'epic', 'legendary'],
        default: 'medium'
    },
    
    // Objetivos
    objectives: [objectiveSchema],
    
    // Recompensas
    rewards: rewardSchema,
    
    // Requisitos
    requirements: requirementSchema,
    
    // Limitaciones
    limitations: limitationSchema,
    
    // Metadatos
    metadata: metadataSchema,
    
    // Estadísticas
    stats: statsSchema,
    
    // Estado
    active: {
        type: Boolean,
        default: true
    },
    autoGenerate: {
        type: Boolean,
        default: false
    },
    priority: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
    },
    
    // Control de tiempo
    availableFrom: {
        type: Date,
        default: null
    },
    availableUntil: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: function() {
            if (this.type === 'daily') {
                const date = new Date();
                date.setHours(23, 59, 59, 999);
                return date;
            }
            return null;
        }
    },
    
    // Relaciones
    nextQuest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyQuest'
    },
    prerequisiteQuests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyQuest'
    }],
    chainId: {
        type: String,
        default: null
    },
    chainPosition: {
        type: Number,
        default: 0
    },
    
    // Configuración de notificaciones
    notifyOnProgress: {
        type: Boolean,
        default: true
    },
    notifyOnCompletion: {
        type: Boolean,
        default: true
    },
    
    // Imágenes/Iconos
    icon: {
        type: String,
        default: '🎯'
    },
    color: {
        type: String,
        default: '#5865F2'
    },
    imageUrl: {
        type: String,
        default: null
    },
    
    // Validación
    validated: {
        type: Boolean,
        default: false
    },
    validatedBy: {
        type: String,
        default: null
    },
    validationDate: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índices compuestos para mejor performance
dailyQuestSchema.index({ guildId: 1, type: 1, active: 1 });
dailyQuestSchema.index({ guildId: 1, category: 1, difficulty: 1 });
dailyQuestSchema.index({ guildId: 1, 'metadata.rarity': 1, active: 1 });
dailyQuestSchema.index({ guildId: 1, expiresAt: 1, active: 1 });
dailyQuestSchema.index({ guildId: 1, availableFrom: 1, availableUntil: 1 });
dailyQuestSchema.index({ guildId: 1, chainId: 1, chainPosition: 1 });
dailyQuestSchema.index({ 'requirements.minLevel': 1, 'requirements.maxLevel': 1 });
dailyQuestSchema.index({ 'objectives.type': 1 });
dailyQuestSchema.index({ questId: 1 }, { unique: true, sparse: true });

// Virtuals
dailyQuestSchema.virtual('isAvailable').get(function() {
    const now = new Date();
    
    if (this.availableFrom && now < this.availableFrom) return false;
    if (this.availableUntil && now > this.availableUntil) return false;
    if (this.expiresAt && now > this.expiresAt) return false;
    
    return this.active && !this.metadata.hidden;
});

dailyQuestSchema.virtual('timeRemaining').get(function() {
    if (!this.expiresAt) return null;
    
    const now = new Date();
    const remaining = this.expiresAt.getTime() - now.getTime();
    
    return remaining > 0 ? remaining : 0;
});

dailyQuestSchema.virtual('isExpired').get(function() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
});

dailyQuestSchema.virtual('isChainQuest').get(function() {
    return !!this.chainId;
});

// Métodos de instancia
dailyQuestSchema.methods.checkCompletion = function(userProgress) {
    if (!userProgress || typeof userProgress !== 'object') {
        return false;
    }
    
    return this.objectives.every(obj => {
        const progress = userProgress[obj._id] || userProgress.get?.(obj._id.toString()) || 0;
        return progress >= obj.target;
    });
};

dailyQuestSchema.methods.getProgressPercentage = function(userProgress) {
    if (!userProgress || this.objectives.length === 0) {
        return 0;
    }
    
    let totalTarget = 0;
    let totalProgress = 0;
    
    this.objectives.forEach(obj => {
        const target = obj.target;
        const progress = userProgress[obj._id] || userProgress.get?.(obj._id.toString()) || 0;
        
        totalTarget += target;
        totalProgress += Math.min(progress, target);
    });
    
    return totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 100) : 100;
};

dailyQuestSchema.methods.getObjectiveProgress = function(userProgress, objectiveId) {
    const objective = this.objectives.id(objectiveId);
    if (!objective) return null;
    
    const progress = userProgress[objectiveId] || userProgress.get?.(objectiveId.toString()) || 0;
    
    return {
        current: progress,
        target: objective.target,
        percentage: Math.min(Math.round((progress / objective.target) * 100), 100),
        completed: progress >= objective.target,
        remaining: Math.max(objective.target - progress, 0)
    };
};

dailyQuestSchema.methods.calculateTotalReward = function() {
    const total = {
        xp: this.rewards.xp || 0,
        coins: this.rewards.coins || 0,
        tokens: this.rewards.tokens || 0,
        items: this.rewards.items?.length || 0
    };
    
    // Bonus por dificultad
    const difficultyMultiplier = {
        'tutorial': 0.5,
        'easy': 1,
        'medium': 1.5,
        'hard': 2,
        'epic': 3,
        'legendary': 5
    };
    
    const multiplier = difficultyMultiplier[this.difficulty] || 1;
    
    total.xp = Math.round(total.xp * multiplier);
    total.coins = Math.round(total.coins * multiplier);
    total.tokens = Math.round(total.tokens * multiplier);
    
    return total;
};

dailyQuestSchema.methods.getEstimatedTime = function() {
    // Estimación basada en objetivos y dificultad
    let baseTime = 0;
    
    this.objectives.forEach(obj => {
        switch(obj.type) {
            case 'send_messages':
                baseTime += obj.target * 2; // 2 minutos por mensaje
                break;
            case 'join_voice':
                baseTime += obj.target * 1.5; // 1.5 minutos por minuto objetivo
                break;
            case 'react_messages':
                baseTime += obj.target * 1;
                break;
            case 'earn_xp':
                baseTime += obj.target * 0.1; // 0.1 minutos por XP
                break;
            case 'earn_coins':
                baseTime += obj.target * 0.05; // 0.05 minutos por moneda
                break;
            default:
                baseTime += obj.target * 5;
        }
    });
    
    // Ajuste por dificultad
    const difficultyFactor = {
        'tutorial': 0.5,
        'easy': 0.8,
        'medium': 1,
        'hard': 1.5,
        'epic': 2.5,
        'legendary': 4
    };
    
    const factor = difficultyFactor[this.difficulty] || 1;
    
    return Math.round(baseTime * factor);
};

// Métodos estáticos
dailyQuestSchema.statics.generateQuestId = function(guildId, title) {
    const cleanTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    
    return `${guildId}_${cleanTitle}_${timestamp}_${random}`;
};

dailyQuestSchema.statics.findByCategory = function(guildId, category, options = {}) {
    const query = {
        guildId,
        category,
        active: true,
        'metadata.hidden': false
    };
    
    if (options.difficulty) {
        query.difficulty = options.difficulty;
    }
    
    if (options.minLevel) {
        query['requirements.minLevel'] = { $lte: options.minLevel };
    }
    
    if (options.maxLevel) {
        query['requirements.maxLevel'] = { $gte: options.maxLevel };
    }
    
    if (options.type) {
        query.type = options.type;
    }
    
    return this.find(query).sort({ priority: -1, 'metadata.rarity': -1 });
};

dailyQuestSchema.statics.getQuestChain = function(guildId, chainId) {
    return this.find({
        guildId,
        chainId,
        active: true
    }).sort({ chainPosition: 1 });
};

dailyQuestSchema.statics.updateQuestStats = async function(questId, data) {
    const update = {};
    
    if (data.completed) {
        update.$inc = {
            'stats.completions': 1,
            'stats.attempts': 1,
            'stats.totalRewardsGiven.xp': data.rewards?.xp || 0,
            'stats.totalRewardsGiven.coins': data.rewards?.coins || 0,
            'stats.totalRewardsGiven.tokens': data.rewards?.tokens || 0
        };
        
        if (data.completionTime) {
            update.$set = {
                'stats.lastCompleted': new Date()
            };
            
            update.$push = {
                'stats.completionTimes': data.completionTime
            };
        }
    } else if (data.attempted) {
        update.$inc = { 'stats.attempts': 1 };
    } else if (data.abandoned) {
        update.$inc = { 'stats.abandonment': 1 };
    }
    
    // Calcular tasa de completación
    if (update.$inc && update.$inc['stats.attempts']) {
        const quest = await this.findById(questId);
        if (quest) {
            const completionRate = (quest.stats.completions + (data.completed ? 1 : 0)) / 
                                  (quest.stats.attempts + 1) * 100;
            
            update.$set = {
                ...update.$set,
                'stats.completionRate': Math.round(completionRate)
            };
        }
    }
    
    return this.findByIdAndUpdate(questId, update, { new: true });
};

// Middleware y hooks
dailyQuestSchema.pre('save', function(next) {
    // Generar questId si no existe
    if (!this.questId) {
        this.questId = this.constructor.generateQuestId(this.guildId, this.title);
    }
    
    // Validar objetivos
    if (!this.objectives || this.objectives.length === 0) {
        return next(new Error('La misión debe tener al menos un objetivo'));
    }
    
    // Validar fechas
    if (this.availableUntil && this.availableFrom && this.availableUntil <= this.availableFrom) {
        return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
    }
    
    // Auto-calcular expiración si es diario
    if (this.type === 'daily' && !this.expiresAt) {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        this.expiresAt = date;
    }
    
    // Establecer prioridad automática basada en dificultad
    if (!this.priority) {
        const priorityMap = {
            'tutorial': 10,
            'easy': 5,
            'medium': 3,
            'hard': 2,
            'epic': 1,
            'legendary': 1
        };
        this.priority = priorityMap[this.difficulty] || 3;
    }
    
    // Validar nivel máximo
    if (this.requirements.maxLevel && this.requirements.maxLevel < this.requirements.minLevel) {
        return next(new Error('El nivel máximo no puede ser menor que el nivel mínimo'));
    }
    
    next();
});

dailyQuestSchema.post('save', function(doc, next) {
    // Actualizar estadísticas globales del sistema
    // Esto podría disparar eventos o actualizar cache
    console.log(`Misión "${doc.title}" guardada/actualizada`);
    next();
});

export default mongoose.model('DailyQuest', dailyQuestSchema);