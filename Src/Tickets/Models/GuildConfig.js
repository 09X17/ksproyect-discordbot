import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    value: { type: String, required: true },
    description: { type: String, default: "" },
    emoji: { type: String, default: "❓" },
    limit: { type: Number, default: 1 },
    ticketMessage: {
        title: { type: String, default: "Ticket {ticketId}" },
        description: { type: String, default: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}" },
        color: { type: String, default: "#0099ff" },
        footer: { type: String, default: "Creado el {date}" },
        image: { type: String, default: null },     
        thumbnail: { type: String, default: null }   
    }
});


const PanelSchema = new mongoose.Schema({
    panelId: { 
        type: String, 
        default: () => Math.random().toString(36).substring(2, 10).toUpperCase() 
    },
    name: { type: String, default: "Panel Principal" },
    channelId: { type: String, default: null },
    messageId: { type: String, default: null },
    embed: {
        title: { type: String, default: "🎫 Sistema de Tickets" },
        description: { type: String, default: "Selecciona una opción para abrir un ticket." },
        color: { type: String, default: "#0099ff" },
        image: { type: String, default: null },
        thumbnail: { type: String, default: null },
        footer: { type: String, default: "Soporte" }
    },
    categories: { type: [CategorySchema], default: [] },
    ticketMessage: {
        title: { type: String, default: "Ticket {ticketId}" },
        description: { type: String, default: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}" },
        color: { type: String, default: "#0099ff" },
        footer: { type: String, default: "Creado el {date}" }
    }
});

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    ticketCategoryId: { type: String, default: null }, 
    logChannelId: { type: String, default: null },     
    supportRoleId: { type: String, default: null },   
    ticketCount: { type: Number, default: 0 },     
    panels: { type: [PanelSchema], default: [] },    
    transcriptType: { 
        type: String, 
        enum: ["db", "txt", "html"], 
        default: "txt" 
    }, 

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

GuildConfigSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.model("GuildConfig", GuildConfigSchema);
