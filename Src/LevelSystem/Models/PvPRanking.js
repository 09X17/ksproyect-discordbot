// Models/PvPRanking.js
import mongoose from 'mongoose';

const pvpRankingSchema = new mongoose.Schema({
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
    username: String,
    avatar: String,
    tier: {
        type: String,
        enum: [
            'bronze',
            'silver',
            'gold',
            'platinum',
            'diamond',
            'master',
            'grandmaster',
            'challenger'
        ],
        default: 'bronze'
    },
    division: {
        type: Number,
        default: 5,
        min: 1,
        max: 5
    },
    rating: {
        type: Number,
        default: 1000,
        min: 0
    },
    stats: {
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        draws: { type: Number, default: 0 },
        winStreak: { type: Number, default: 0 },
        bestWinStreak: { type: Number, default: 0 },
        totalDuels: { type: Number, default: 0 },
        totalTimeSpent: { type: Number, default: 0 }, // en segundos
        averageScore: { type: Number, default: 0 },
        fastestWin: { type: Number, default: null } // en segundos
    },
    matchHistory: [{
        duelId: mongoose.Schema.Types.ObjectId,
        opponentId: String,
        result: { type: String, enum: ['win', 'loss', 'draw'] },
        ratingChange: Number,
        timestamp: Date,
        mode: String,
        duration: Number
    }],
    achievements: [{
        name: String,
        unlockedAt: Date,
        description: String
    }],
    seasonStats: {
        seasonNumber: Number,
        peakRating: Number,
        peakDivision: Number,
        tournamentWins: Number
    },
    playstyle: {
        preferredMode: String,
        averageBet: Number,
        aggressionLevel: Number // 1-10
    },
    rewards: {
        currentSeason: {
            coinsEarned: { type: Number, default: 0 },
            xpEarned: { type: Number, default: 0 },
            itemsEarned: []
        },
        allTime: {
            coinsEarned: { type: Number, default: 0 },
            xpEarned: { type: Number, default: 0 }
        }
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    cooldowns: {
        nextDuel: Date,
        rankUpAttempt: Date
    }
}, {
    timestamps: true
});

// Índices
pvpRankingSchema.index({ guildId: 1, rating: -1 });
pvpRankingSchema.index({ guildId: 1, tier: 1, division: 1 });
pvpRankingSchema.index({ guildId: 1, 'stats.wins': -1 });
pvpRankingSchema.index({ guildId: 1, 'stats.winStreak': -1 });

// Métodos
pvpRankingSchema.methods.updateRanking = async function(result, opponentRating, mode = 'ranked') {
    const K = 32; // Factor K para Elo
    
    // Calcular expected score
    const expected = 1 / (1 + Math.pow(10, (opponentRating - this.rating) / 400));
    
    // Calcular cambio de rating
    let ratingChange;
    
    if (result === 'win') {
        ratingChange = Math.round(K * (1 - expected));
        this.stats.wins++;
        this.stats.winStreak++;
        
        if (this.stats.winStreak > this.stats.bestWinStreak) {
            this.stats.bestWinStreak = this.stats.winStreak;
        }
    } else if (result === 'loss') {
        ratingChange = Math.round(K * (0 - expected));
        this.stats.losses++;
        this.stats.winStreak = 0;
    } else {
        ratingChange = Math.round(K * (0.5 - expected));
        this.stats.draws++;
    }
    
    // Aplicar cambio
    this.rating += ratingChange;
    this.stats.totalDuels++;
    
    // Actualizar tier y división
    await this.updateTier();
    
    return ratingChange;
};

pvpRankingSchema.methods.updateTier = function() {
    const tiers = {
        bronze: { min: 0, max: 999 },
        silver: { min: 1000, max: 1199 },
        gold: { min: 1200, max: 1399 },
        platinum: { min: 1400, max: 1599 },
        diamond: { min: 1600, max: 1799 },
        master: { min: 1800, max: 1999 },
        grandmaster: { min: 2000, max: 2199 },
        challenger: { min: 2200, max: 3000 }
    };
    
    // Encontrar tier actual
    for (const [tierName, range] of Object.entries(tiers)) {
        if (this.rating >= range.min && this.rating <= range.max) {
            this.tier = tierName;
            
            // Calcular división (1-5)
            const tierRange = range.max - range.min;
            const positionInTier = this.rating - range.min;
            const divisionSize = tierRange / 5;
            
            this.division = 5 - Math.floor(positionInTier / divisionSize);
            this.division = Math.max(1, Math.min(5, this.division));
            
            break;
        }
    }
};

pvpRankingSchema.methods.addMatchToHistory = function(duelId, opponentId, result, ratingChange, mode, duration) {
    this.matchHistory.unshift({
        duelId,
        opponentId,
        result,
        ratingChange,
        timestamp: new Date(),
        mode,
        duration
    });
    
    // Mantener solo las últimas 50 partidas
    if (this.matchHistory.length > 50) {
        this.matchHistory.pop();
    }
};

pvpRankingSchema.methods.getWinRate = function() {
    const total = this.stats.wins + this.stats.losses + this.stats.draws;
    return total > 0 ? (this.stats.wins / total) * 100 : 0;
};

pvpRankingSchema.methods.getRankName = function() {
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
    const divisionName = romanNumerals[this.division - 1] || 'V';
    return `${this.tier.charAt(0).toUpperCase() + this.tier.slice(1)} ${divisionName}`;
};

export default mongoose.model('PvPRanking', pvpRankingSchema);