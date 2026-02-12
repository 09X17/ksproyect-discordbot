import mongoose from 'mongoose';

const contestVoteSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    entryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ContestEntry',
        required: true 
    },
    emoji: { type: String, required: true },
    isValid: { type: Boolean, default: true },
    metadata: {
        viaComponentsV2: { type: Boolean, default: true },
        interactionId: { type: String },
        userTag: { type: String },
        invalidReason: { type: String },
        createdAt: { type: Date, default: Date.now }
    }
});

export default mongoose.model('ContestVote', contestVoteSchema);