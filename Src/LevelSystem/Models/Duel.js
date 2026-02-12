// Models/Duel.js
import mongoose from 'mongoose';

const duelSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    challenger: {
        userId: String,
        username: String,
        avatar: String
    },
    opponent: {
        userId: String,
        username: String,
        avatar: String,
        accepted: {
            type: Boolean,
            default: false
        }
    },
    type: {
        type: String,
        enum: [
            'message_race',        // Carrera de mensajes
            'xp_battle',           // Batalla de XP
            'coin_collector',      // Recolector de monedas
            'reaction_war',        // Guerra de reacciones
            'voice_marathon',      // Maratón de voz
            'custom'
        ],
        default: 'message_race'
    },
    mode: {
        type: String,
        enum: ['friendly', 'ranked', 'wagered'],
        default: 'friendly'
    },
    wager: {
        coins: {
            type: Number,
            default: 0,
            min: 0
        },
        xp: {
            type: Number,
            default: 0,
            min: 0
        },
        items: [{
            itemId: mongoose.Schema.Types.ObjectId,
            quantity: Number
        }]
    },
    rules: {
        duration: { // en minutos
            type: Number,
            default: 5,
            min: 1,
            max: 60
        },
        target: { // objetivo a alcanzar
            type: Number,
            default: 100
        },
        allowedChannels: [String],
        restrictions: [String]
    },
    status: {
        type: String,
        enum: [
            'challenged',  // Reto enviado
            'accepted',    // Aceptado
            'active',      // En progreso
            'completed',   // Terminado
            'cancelled',   // Cancelado
            'timeout'      // Tiempo agotado
        ],
        default: 'challenged'
    },
    scores: {
        challenger: {
            current: { type: Number, default: 0 },
            history: [{
                timestamp: Date,
                value: Number,
                action: String
            }]
        },
        opponent: {
            current: { type: Number, default: 0 },
            history: []
        }
    },
    startTime: Date,
    endTime: Date,
    winner: String, // userId del ganador
    winnerReason: String,
    rewards: {
        winner: {
            coins: Number,
            xp: Number,
            streakBonus: Number,
            items: []
        },
        loser: {
            coins: Number, // Consuelo
            xp: Number
        },
        spectators: [{
            userId: String,
            bet: Number,
            reward: Number
        }]
    },
    spectators: [{
        userId: String,
        betOn: String, // 'challenger' o 'opponent'
        betAmount: Number
    }],
    chatLog: [{
        userId: String,
        message: String,
        timestamp: Date,
        type: { type: String, enum: ['taunt', 'encouragement', 'strategy'] }
    }],
    metadata: {
        arena: String, // Canal especial para duelos
        theme: String,
        specialEffects: [String]
    },
    stats: {
        totalMessages: Number,
        peakActivity: Number,
        spectatorCount: Number
    }
}, {
    timestamps: true
});

// Índices
duelSchema.index({ guildId: 1, status: 1 });
duelSchema.index({ guildId: 1, winner: 1 });
duelSchema.index({ 'challenger.userId': 1 });
duelSchema.index({ 'opponent.userId': 1 });
duelSchema.index({ startTime: 1 });
duelSchema.index({ endTime: 1 });

// Métodos
duelSchema.methods.startDuel = function() {
    this.status = 'active';
    this.startTime = new Date();
    
    // Calcular tiempo de fin
    const endTime = new Date(this.startTime);
    endTime.setMinutes(endTime.getMinutes() + this.rules.duration);
    this.endTime = endTime;
};

duelSchema.methods.updateScore = function(userId, amount, action = '') {
    const scoreField = userId === this.challenger.userId ? 'challenger' : 'opponent';
    
    this.scores[scoreField].current += amount;
    this.scores[scoreField].history.push({
        timestamp: new Date(),
        value: amount,
        action
    });
    
    // Verificar si alguien ganó
    if (this.scores[scoreField].current >= this.rules.target) {
        this.endDuel(userId, 'target_reached');
    }
    
    return this.scores[scoreField].current;
};

duelSchema.methods.endDuel = function(winnerId, reason = '') {
    this.status = 'completed';
    this.winner = winnerId;
    this.winnerReason = reason;
    this.endTime = new Date();
    
    // Calcular recompensas
    this.calculateRewards();
    
    return this.winner;
};

duelSchema.methods.calculateRewards = function() {
    const isRanked = this.mode === 'ranked';
    const isWagered = this.mode === 'wagered';
    
    const baseXP = 500;
    const baseCoins = 250;
    
    if (isWagered) {
        // Sistema de apuestas
        const totalPot = this.wager.coins * 2;
        const winnerCut = Math.floor(totalPot * 0.8); // 80% para el ganador
        const houseCut = totalPot - winnerCut; // 20% para el sistema
        
        this.rewards = {
            winner: {
                coins: winnerCut + this.wager.coins,
                xp: baseXP * 2,
                streakBonus: 50
            },
            loser: {
                coins: 0, // Pierde su apuesta
                xp: Math.floor(baseXP * 0.3) // 30% de consuelo
            }
        };
        
        // Recompensas para espectadores que apostaron bien
        this.spectators.forEach(spectator => {
            if (spectator.betOn === this.winner) {
                const reward = Math.floor(spectator.betAmount * 1.5);
                this.rewards.spectators.push({
                    userId: spectator.userId,
                    bet: spectator.betAmount,
                    reward
                });
            }
        });
    } else if (isRanked) {
        // Sistema de ranking
        const rankingBonus = this.calculateRankingBonus();
        
        this.rewards = {
            winner: {
                coins: baseCoins + rankingBonus.coins,
                xp: baseXP + rankingBonus.xp,
                streakBonus: 25
            },
            loser: {
                coins: Math.floor(baseCoins * 0.5),
                xp: Math.floor(baseXP * 0.5)
            }
        };
    } else {
        // Duelo amistoso
        this.rewards = {
            winner: {
                coins: baseCoins,
                xp: baseXP,
                streakBonus: 10
            },
            loser: {
                coins: Math.floor(baseCoins * 0.7),
                xp: Math.floor(baseXP * 0.7)
            }
        };
    }
};

duelSchema.methods.getTimeRemaining = function() {
    if (!this.startTime || !this.endTime) return 0;
    
    const now = new Date();
    const remaining = this.endTime - now;
    
    return Math.max(0, Math.floor(remaining / 1000)); // en segundos
};

duelSchema.methods.addSpectator = function(userId, betOn = null, betAmount = 0) {
    if (this.spectators.some(s => s.userId === userId)) {
        return false;
    }
    
    this.spectators.push({
        userId,
        betOn,
        betAmount
    });
    
    return true;
};

export default mongoose.model('Duel', duelSchema);