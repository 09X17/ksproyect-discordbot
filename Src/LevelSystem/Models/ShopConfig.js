import mongoose from 'mongoose';

const ShopConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },

    logChannelId: {
        type: String,
        default: null
    }

}, { timestamps: true });

export default mongoose.model('ShopConfig', ShopConfigSchema);
