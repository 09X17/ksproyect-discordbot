import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    eventId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    type: {
        type: String,
        enum: ['xp_multiplier', 'coin_multiplier', 'token_bonus', 'sale', 'custom'],
        required: true
    },
    multiplier: {
        type: Number,
        default: 1.0,
        min: 1.0,
        max: 10.0
    },
    bonus: {
        type: Number,
        default: 0,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 0.9
    },
    startDate: {
        type: Date,
        default: null
    },
    endDate: {
        type: Date,
        default: null
    },
    active: {
        type: Boolean,
        default: false
    },
    durationHours: {
        type: Number,
        default: 24,
        min: 1,
        max: 720
    },
    image: {
        type: String,
        default: null
    },
    schedule: {
        days: [Number],
        startHour: Number,
        endHour: Number,
        months: [Number],
        specificDates: [String]
    },
    createdBy: {
        userId: String,
        username: String
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    custom: {
        type: Boolean,
        default: true
    },
    stats: {
        usersAffected: {
            type: Number,
            default: 0
        },
        totalBonusGiven: {
            xp: { type: Number, default: 0 },
            coins: { type: Number, default: 0 },
            tokens: { type: Number, default: 0 }
        },
        lastActivated: Date
    }
}, {
    timestamps: true
});

eventSchema.index({ guildId: 1, eventId: 1 }, { unique: true });
eventSchema.index({ guildId: 1, active: 1 });
eventSchema.index({ endDate: 1 });
eventSchema.index({ guildId: 1, type: 1 });

export default mongoose.model('Event', eventSchema);