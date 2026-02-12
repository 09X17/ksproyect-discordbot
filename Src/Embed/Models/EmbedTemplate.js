import mongoose from 'mongoose';

//
// =============================
// FIELD SCHEMA
// =============================
//
const embedFieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    value: { type: String, required: true },
    inline: { type: Boolean, default: false }
}, { _id: false });

//
// =============================
// ACTION SCHEMA
// =============================
// Permite acción única o múltiples acciones
//
const embedActionSchema = new mongoose.Schema({
    type: { type: String, required: true },

    // Role control
    roleId: String,
    mode: String, // add | remove | toggle | add_if_missing

    // Exclusive roles
    roles: [String],
    selectedRoleId: String,

    // Messages
    content: String,
    embeds: Array,

    // Delay
    seconds: Number

}, { _id: false });

//
// =============================
// USAGE TRACKING
// =============================
//
const usageSchema = new mongoose.Schema({
    totalUses: { type: Number, default: 0 },
    lastGlobalUse: Date,
    users: [{
        userId: String,
        uses: { type: Number, default: 0 },
        lastUsed: Date
    }]
}, { _id: false });

//
// =============================
// PERMISSIONS
// =============================
//
const permissionsSchema = new mongoose.Schema({
    allowedRoles: [String],
    blockedRoles: [String],
    requireAdmin: { type: Boolean, default: false }
}, { _id: false });

//
// =============================
// LIMITS
// =============================
//
const limitsSchema = new mongoose.Schema({
    userCooldown: Number,     // segundos
    globalCooldown: Number,   // segundos
    maxUsesPerUser: Number,
    maxTotalUses: Number
}, { _id: false });

//
// =============================
// BUTTON SCHEMA
// =============================
//
const embedButtonSchema = new mongoose.Schema({

    type: { type: String, enum: ['link', 'action'], default: 'action' },

    label: { type: String, required: true },

    // Discord ButtonStyle (Number)
    style: { type: Number, default: 1 },

    url: String,
    customId: String,
    emoji: String,
    disabled: { type: Boolean, default: false },

    // 🔥 Acción dinámica
    action: {
        type: mongoose.Schema.Types.Mixed
        // Puede ser:
        // - objeto (single action)
        // - array (multiple actions)
    },

    permissions: permissionsSchema,
    limits: limitsSchema,
    usage: { type: usageSchema, default: () => ({}) }

}, { _id: false });

//
// =============================
// SELECT MENU SCHEMA
// =============================
//
const embedSelectSchema = new mongoose.Schema({

    customId: String,
    placeholder: String,
    minValues: { type: Number, default: 1 },
    maxValues: { type: Number, default: 1 },

    options: [{
        label: String,
        value: String,
        description: String,
        emoji: String
    }],

    // 🔥 Opcionalmente también pueden ejecutar acción
    action: {
        type: mongoose.Schema.Types.Mixed
    },

    permissions: permissionsSchema,
    limits: limitsSchema,
    usage: { type: usageSchema, default: () => ({}) }

}, { _id: false });

//
// =============================
// MAIN TEMPLATE
// =============================
//
const embedTemplateSchema = new mongoose.Schema({

    guildId: { type: String, index: true, required: true },

    name: { type: String, required: true },
    description: String,

    embed: {
        title: String,
        description: String,
        color: Number,
        url: String,
        thumbnail: String,
        image: String,

        footer: {
            text: String,
            iconURL: String
        },

        author: {
            name: String,
            iconURL: String,
            url: String
        },

        timestamp: Date,

        fields: [embedFieldSchema]
    },

    components: {
        buttons: [embedButtonSchema],
        selects: [embedSelectSchema]
    },

    settings: {
        ephemeral: { type: Boolean, default: false },
        allowedRoles: [String],
        ownerId: String
    },

    stats: {
        sends: { type: Number, default: 0 },
        clicks: { type: Number, default: 0 }
    }

}, { timestamps: true });

export default mongoose.model('EmbedTemplate', embedTemplateSchema);
