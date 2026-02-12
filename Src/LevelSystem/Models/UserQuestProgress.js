// Models/UserQuestProgress.js
import mongoose from 'mongoose';

const userQuestProgressSchema = new mongoose.Schema({
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
    questId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyQuest',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'failed', 'expired', 'claimed'],
        default: 'active'
    },
    progress: {
        type: Map,
        of: Number, // { objectiveId: currentValue }
        default: new Map()
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    claimedAt: Date,
    timeSpent: Number, // en segundos
    streakBonus: {
        type: Number,
        default: 0
    },
    multiplier: {
        type: Number,
        default: 1.0
    },
    attempts: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Índices compuestos
userQuestProgressSchema.index({ userId: 1, guildId: 1, questId: 1 }, { unique: true });
userQuestProgressSchema.index({ guildId: 1, status: 1 });
userQuestProgressSchema.index({ completedAt: 1 });

// Métodos
userQuestProgressSchema.methods.updateProgress = function(objectiveId, amount = 1) {
    const current = this.progress.get(objectiveId) || 0;
    this.progress.set(objectiveId, current + amount);
    
    return this.progress.get(objectiveId);
};

userQuestProgressSchema.methods.completeQuest = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    this.timeSpent = Math.floor((this.completedAt - this.startedAt) / 1000);
};

userQuestProgressSchema.methods.claimRewards = async function() {
    if (this.status !== 'completed') {
        throw new Error('Quest no completada');
    }
    
    this.status = 'claimed';
    this.claimedAt = new Date();
    
    // Obtener la quest
    const DailyQuest = mongoose.model('DailyQuest');
    const quest = await DailyQuest.findById(this.questId);
    
    if (!quest) {
        throw new Error('Quest no encontrada');
    }
    
    // Calcular recompensas con multiplicadores
    const baseRewards = quest.rewards;
    const finalRewards = {
        xp: Math.floor(baseRewards.xp * this.multiplier) + this.streakBonus,
        coins: Math.floor(baseRewards.coins * this.multiplier),
        tokens: Math.floor(baseRewards.tokens * this.multiplier),
        items: baseRewards.items
    };
    
    return finalRewards;
};

export default mongoose.model('UserQuestProgress', userQuestProgressSchema);