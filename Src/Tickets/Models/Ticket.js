import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    userId: String,
    username: String,
    content: String,
    timestamp: { type: Date, default: Date.now },
    attachments: [String]
});

const TicketSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true, unique: true },
    creatorId: { type: String, required: true },
    claimerId: { type: String, default: null },
    closerId: { type: String, default: null },
    participants: [{ type: String }],
    categoryValue: { type: String, default: "general" }, 
    panelId: { type: String, default: null },
    status: {
        type: String,
        enum: ["open", "closed", "claimed", "resolved"],
        default: "open"
    },
    reason: { type: String, default: "" },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium"
    },
    createdAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    transcript: { type: String, default: null },  
    transcriptUrl: { type: String, default: null },
    transcriptType: { 
        type: String, 
        enum: ["db", "txt", "html"], 
        default: "db" 
    },

    messages: { type: [MessageSchema], default: [] }
});

// 🔹 Índices para rendimiento
TicketSchema.index({ guildId: 1, status: 1 });
TicketSchema.index({ guildId: 1, creatorId: 1 });
TicketSchema.index({ guildId: 1, claimerId: 1 });

export default mongoose.model("Ticket", TicketSchema);
