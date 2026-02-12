import { Schema, model } from 'mongoose';

const tradeHistorySchema = new Schema({
  tradeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  guildId: {
    type: String,
    required: true,
    index: true
  },
  initiatorId: {
    type: String,
    required: true,
    index: true
  },
  targetId: {
    type: String,
    required: true,
    index: true
  },
  initiatorOffer: {
    type: {
      type: String,
      enum: ['coins', 'tokens', 'xp'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    }
  },
  targetOffer: {
    type: {
      type: String,
      enum: ['coins', 'tokens', 'xp'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    }
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'declined', 'expired', 'failed'],
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledBy: {
    type: String,
    default: null
  },
  cancelReason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

tradeHistorySchema.index({ guildId: 1, createdAt: -1 });
tradeHistorySchema.index({ initiatorId: 1, createdAt: -1 });
tradeHistorySchema.index({ targetId: 1, createdAt: -1 });

tradeHistorySchema.statics.getUserHistory = async function(guildId, userId, limit = 10) {
  return this.find({
    guildId,
    $or: [
      { initiatorId: userId },
      { targetId: userId }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

tradeHistorySchema.statics.getUserStats = async function(guildId, userId) {
  const trades = await this.find({
    guildId,
    $or: [
      { initiatorId: userId },
      { targetId: userId }
    ]
  });

  return {
    total: trades.length,
    completed: trades.filter(t => t.status === 'completed').length,
    cancelled: trades.filter(t => t.status === 'cancelled').length,
    declined: trades.filter(t => t.status === 'declined').length,
    expired: trades.filter(t => t.status === 'expired').length
  };
};

tradeHistorySchema.statics.checkCooldown = async function(guildId, user1Id, user2Id, cooldownMinutes = 5) {
  const cooldownTime = Date.now() - (cooldownMinutes * 60 * 1000);
  
  const recentTrade = await this.findOne({
    guildId,
    createdAt: { $gte: new Date(cooldownTime) },
    $or: [
      { initiatorId: user1Id, targetId: user2Id },
      { initiatorId: user2Id, targetId: user1Id }
    ]
  });

  return recentTrade;
};

export default model('TradeHistory', tradeHistorySchema);