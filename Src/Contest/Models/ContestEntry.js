import mongoose from 'mongoose';

const contestEntrySchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, default: '' },
    votes: { type: Number, default: 0 },
    imageFilename: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'disqualified', 'removed', 'winner'],
        default: 'active'
    },
    lastVoteAt: { type: Date, default: null },
    metadata: {
        componentsVersion: { type: String, default: 'v2' },
        hasMediaGallery: { type: Boolean, default: true },
        voteButtons: { type: Number, default: 4 },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now }
    }
});

export default mongoose.model('ContestEntry', contestEntrySchema);