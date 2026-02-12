import mongoose from 'mongoose';

const embedMessageSchema = new mongoose.Schema({

    guildId: {
        type: String,
        required: true,
        index: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmbedTemplate',
        required: true,
        index: true
    },

    channelId: {
        type: String,
        required: true
    },

    messageId: {
        type: String,
        required: true
    }

}, { timestamps: true });

export default mongoose.model(
    'EmbedMessage',
    embedMessageSchema
);
