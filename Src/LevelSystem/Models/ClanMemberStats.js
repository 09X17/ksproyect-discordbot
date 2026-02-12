// Models/ClanMemberStats.js
import mongoose from 'mongoose';

const clanMemberStatsSchema = new mongoose.Schema({
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
    clanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Clan',
        required: true
    },
    stats: {
        daysInClan: { type: Number, default: 1 },
        dailyAverageXP: { type: Number, default: 0 },
        weeklyContributions: {
            xp: { type: Number, default: 0 },
            coins: { type: Number, default: 0 },
            items: [{ itemId: mongoose.Schema.Types.ObjectId, quantity: Number }]
        },
        questsCompleted: { type: Number, default: 0 },
        warsParticipated: { type: Number, default: 0 },
        warsWon: { type: Number, default: 0 }
    },
    achievements: [{
        name: String,
        unlockedAt: Date,
        description: String,
        icon: String
    }],
    activity: {
        lastLogin: Date,
        streakDays: { type: Number, default: 0 },
        lastContribution: Date
    },
    rewards: {
        claimedDaily: Boolean,
        dailyClaimStreak: { type: Number, default: 0 },
        lastClaimed: Date
    }
}, {
    timestamps: true
});

// Índices
clanMemberStatsSchema.index({ clanId: 1, userId: 1 }, { unique: true });
clanMemberStatsSchema.index({ clanId: 1, 'stats.weeklyContributions.xp': -1 });

// Métodos
clanMemberStatsSchema.methods.claimDailyReward = async function() {
    const now = new Date();
    const lastClaimed = this.rewards.lastClaimed;
    
    // Verificar si ya reclamó hoy
    if (lastClaimed && lastClaimed.toDateString() === now.toDateString()) {
        return { claimed: false, reason: 'Ya reclamado hoy' };
    }
    
    // Verificar racha
    let streakBonus = 0;
    if (lastClaimed) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastClaimed.toDateString() === yesterday.toDateString()) {
            this.rewards.dailyClaimStreak++;
        } else {
            this.rewards.dailyClaimStreak = 1;
        }
    } else {
        this.rewards.dailyClaimStreak = 1;
    }
    
    // Bonus por racha
    if (this.rewards.dailyClaimStreak >= 7) streakBonus = 50;
    if (this.rewards.dailyClaimStreak >= 30) streakBonus = 200;
    
    this.rewards.claimedDaily = true;
    this.rewards.lastClaimed = now;
    
    const baseReward = 100;
    const totalReward = baseReward + streakBonus;
    
    await this.save();
    
    return {
        claimed: true,
        reward: totalReward,
        streak: this.rewards.dailyClaimStreak,
        streakBonus
    };
};

export default mongoose.model('ClanMemberStats', clanMemberStatsSchema);