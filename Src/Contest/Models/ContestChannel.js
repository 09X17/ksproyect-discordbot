import mongoose from 'mongoose';

const contestChannelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true, unique: true },
    minTimeInServer: { type: Number, default: 7 },
    maxEntriesPerUser: { type: Number, default: 3 },
    votingEnabled: { type: Boolean, default: true },
    allowMultipleVotes: { type: Boolean, default: false },
    voteCooldown: { type: Number, default: 0 },
    requireDescription: { type: Boolean, default: false },
    maxDescriptionLength: { type: Number, default: 500 },
    customEmojis: [{ type: String }],
    notificationChannel: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    stats: {
        totalEntries: { type: Number, default: 0 },
        totalVotes: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 }
    },
    metadata: {
        componentsVersion: { type: String, default: 'v2' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        endedAt: { type: Date, default: null }
    }
});

export default mongoose.model('ContestChannel', contestChannelSchema);