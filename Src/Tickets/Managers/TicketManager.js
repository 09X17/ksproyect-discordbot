import {
    ChannelType,
    PermissionsBitField,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    AttachmentBuilder
} from "discord.js";
import fs from "fs/promises";
import path from "path";

export default class TicketManager {
    constructor(client) {
        this.client = client;
        this.db = client.db;
        this.status = 'initializing';
    }

    async init() {
        try {
            if (!this.db || this.db.status === 0) {
                this.client.logger.warn("⚠️ TicketManager funcionando en modo limitado (sin base de datos)");
                this.status = 'limited';
                return;
            }

            if (!this.db.models || Object.keys(this.db.models).length === 0) {
                this.client.logger.warn("⚠️ TicketManager: Base de datos conectada pero sin modelos");
                this.status = 'limited';
                return;
            }

            this.status = 'ready';
        } catch (error) {
            this.client.logger.error("❌ Error inicializando TicketManager:", error);
            this.status = 'error';
        }
    }

    getModel(modelName) {
        if (!this.db.models || this.db.status === 0) {
            throw new Error("Base de datos no disponible");
        }
        
        const model = this.db.models[modelName];
        if (!model) {
            throw new Error(`Modelo ${modelName} no encontrado`);
        }
        
        return model;
    }

    async getGuildConfig(guildId) {
        try {
            const GuildConfig = this.getModel("GuildConfig");
            let config = await GuildConfig.findOne({ guildId });
            
            if (!config) {
                config = new GuildConfig({ guildId });
                await config.save();
            }
            
            return config;
        } catch (error) {
            this.client.logger.error("Error obteniendo configuración:", error);
            return null;
        }
    }

    async setupGuild(guild, supportRoleId) {
        try {
            const config = await this.getGuildConfig(guild.id);
            if (!config) {
                throw new Error("No se pudo obtener la configuración del servidor");
            }

            if (!config.ticketCategoryId) {
                const category = await guild.channels.create({
                    name: "🎫 Tickets",
                    type: ChannelType.GuildCategory,
                    permissionOverwrites: [
                        { 
                            id: guild.roles.everyone.id, 
                            deny: [PermissionsBitField.Flags.ViewChannel] 
                        }
                    ]
                });
                config.ticketCategoryId = category.id;
            }

            if (!config.logChannelId) {
                const logChannel = await guild.channels.create({
                    name: "ticket-logs",
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { 
                            id: guild.roles.everyone.id, 
                            deny: [PermissionsBitField.Flags.ViewChannel] 
                        }
                    ]
                });
                config.logChannelId = logChannel.id;
            }

            if (supportRoleId) {
                config.supportRoleId = supportRoleId;
            }

            if (!config.panels) {
                config.panels = [];
            }

            await config.save();
            return { success: true, config };
        } catch (error) {
            this.client.logger.error("Error configurando servidor:", error);
            return { success: false, error: error.message };
        }
    }

    async createTicket(guild, user, reason = "", categoryValue = "general", panelId = null) {
        try {
            this.client.logger.debug(`Creando ticket: guild=${guild.id}, user=${user.id}, category=${categoryValue}`);
            let config = await this.getGuildConfig(guild.id);
            
            if (!config || !config.ticketCategoryId) {
                const setupResult = await this.setupGuild(guild);
                if (!setupResult.success) {
                    throw new Error("Error configurando el sistema de tickets");
                }
                config = setupResult.config;
            }

            const Ticket = this.getModel("Ticket");

            const defaultTicketMessage = {
                title: "Ticket {ticketId}",
                description: "Hola {user}! El equipo te ayudará pronto.\n\n**Motivo:** {reason}",
                color: "#0099ff",
                footer: "Creado el {date}",
                image: null,
                thumbnail: null
            };

            const categoryData = this.findCategoryInPanels(config.panels, categoryValue);
            
            const openTicketsCount = await Ticket.countDocuments({
                guildId: guild.id,
                creatorId: user.id,
                categoryValue,
                status: { $in: ["open", "claimed"] }
            });

            const ticketLimit = categoryData.category.limit || 1;
            if (openTicketsCount >= ticketLimit) {
                return {
                    success: false,
                    error: `❌ Solo puedes tener ${ticketLimit} ticket(s) abierto(s) en **${categoryData.categoryName}**.`
                };
            }

            const ticketMessageConfig = {
                ...defaultTicketMessage,
                ...(categoryData.category.ticketMessage || {})
            };

            this.client.logger.debug("Configuración del mensaje:", ticketMessageConfig);

            const ticketId = this.generateTicketId();
            const channel = await this.createTicketChannel(guild, user, ticketId, config);

            config.ticketCount = (config.ticketCount || 0) + 1;
            await config.save();

            await this.sendTicketMessage(
                channel, 
                user, 
                ticketId, 
                reason, 
                categoryData.categoryName, 
                ticketMessageConfig,
                config.supportRoleId
            );

            const ticket = new Ticket({
                guildId: guild.id,
                ticketId,
                channelId: channel.id,
                creatorId: user.id,
                categoryValue,
                categoryName: categoryData.categoryName,
                reason,
                panelId,
                participants: [user.id],
                status: "open"
            });
            await ticket.save();

            await this.sendLog(
                guild.id,
                `\`TICKET:\` ${ticketId}\n\`CREADO POR:\` ${user.toString()}\n\`CATEGORÍA:\` ${categoryData.categoryName}`
            );

            return {
                success: true,
                ticket,
                channel: channel.toString(),
                category: categoryData.categoryName
            };

        } catch (error) {
            this.client.logger.error("Error en createTicket:", error);
            return {
                success: false,
                error: error.message,
                details: "Error al crear el ticket. Por favor contacta con un administrador."
            };
        }
    }

    findCategoryInPanels(panels, categoryValue) {
        let categoryName = categoryValue;
        let specificCategory = null;

        if (panels && panels.length > 0) {
            for (const panel of panels) {
                if (panel.categories) {
                    const category = panel.categories.find(c => c.value === categoryValue);
                    if (category) {
                        specificCategory = category;
                        categoryName = category.name;
                        this.client.logger.debug(`✅ Categoría encontrada: ${category.name}`);
                        break;
                    }
                }
            }
        }

        if (!specificCategory) {
            this.client.logger.debug(`⚠️ Categoría no encontrada, usando valores por defecto`);
            specificCategory = {
                name: "Soporte General",
                value: categoryValue,
                description: "Ayuda general",
                emoji: "❓",
                limit: 1
            };
        }

        return { category: specificCategory, categoryName };
    }

    async createTicketChannel(guild, user, ticketId, config) {
        const channelName = `⬛| ticket-${ticketId}`;
        
        const permissionOverwrites = [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.AttachFiles
                ]
            },
            {
                id: this.client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory,
                    PermissionsBitField.Flags.ManageMessages,
                    PermissionsBitField.Flags.ManageChannels
                ]
            }
        ];

        await guild.channels.fetch();
        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: config.ticketCategoryId,
            permissionOverwrites
        });

        if (config.supportRoleId) {
            await channel.permissionOverwrites.create(config.supportRoleId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true,
                ManageMessages: true
            });
        }

        return channel;
    }

    async sendTicketMessage(channel, user, ticketId, reason, categoryName, messageConfig, supportRoleId) {
        const replaceVariables = (text) => {
            if (!text) return "";
            return text
                .replace(/{ticketId}/g, ticketId)
                .replace(/{user}/g, user.toString())
                .replace(/{reason}/g, reason || "No especificado")
                .replace(/{category}/g, categoryName)
                .replace(/{date}/g, new Date().toLocaleDateString());
        };

        const embed = new EmbedBuilder()
            .setTitle(replaceVariables(messageConfig.title))
            .setDescription(replaceVariables(messageConfig.description))
            .setColor(messageConfig.color || "#0099ff")
            .setFooter({
                text: replaceVariables(messageConfig.footer || "Creado el {date}")
            });

        if (messageConfig.image) {
            embed.setImage(messageConfig.image);
        }

        if (messageConfig.thumbnail) {
            embed.setThumbnail(messageConfig.thumbnail);
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("close_ticket")
                .setLabel("Cerrar Ticket")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🔒"),
            new ButtonBuilder()
                .setCustomId("claim_ticket")
                .setLabel("Tomar Ticket")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🎯"),
            new ButtonBuilder()
                .setCustomId("transcript_ticket")
                .setLabel("Transcript")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("📄")
        );

        const roleMention = supportRoleId ? ` | <@&${supportRoleId}>` : "";
        const messageContent = `${user.toString()}${roleMention}`;

        await channel.send({
            content: messageContent,
            embeds: [embed],
            components: [buttons]
        });
    }

    async closeTicket(ticketId, closerId, reason = "") {
        try {
            const Ticket = this.getModel("Ticket");
            const ticket = await Ticket.findOne({ ticketId });
            
            if (!ticket) {
                throw new Error("Ticket no encontrado");
            }

            const guild = this.client.guilds.cache.get(ticket.guildId);
            if (!guild) {
                throw new Error("Servidor no encontrado");
            }

            const channel = guild.channels.cache.get(ticket.channelId);
            if (channel) {
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("```TICKET CERRADO```")
                            .setDescription(
                                `**Cerrado por:** <@${closerId}>\n` +
                                `**Razón:** ${reason || "No especificada"}\n\n` +
                                `El canal se eliminará en 5 segundos.`
                            )
                            .setColor("#ff0000")
                            .setTimestamp()
                    ]
                });

                setTimeout(() => {
                    channel.delete().catch(err => {
                        this.client.logger.error("Error eliminando canal:", err);
                    });
                }, 5000);
            }

            ticket.status = "closed";
            ticket.closedAt = new Date();
            ticket.closerId = closerId;
            if (reason) ticket.closeReason = reason;
            await ticket.save();

            await this.sendLog(
                ticket.guildId,
                `\`TICKET:\` ${ticketId}\n\`CERRADO POR:\` <@${closerId}>\n\`RAZÓN:\` ${reason || "No especificada"}`
            );

            return { success: true, ticket };
        } catch (error) {
            this.client.logger.error("Error cerrando ticket:", error);
            return { success: false, error: error.message };
        }
    }

    async claimTicket(ticketId, claimerId) {
        try {
            const Ticket = this.getModel("Ticket");
            const ticket = await Ticket.findOne({ ticketId });
            
            if (!ticket) {
                throw new Error("Ticket no encontrado");
            }

            if (ticket.status !== "open") {
                throw new Error("Este ticket no está disponible para reclamar");
            }

            ticket.status = "claimed";
            ticket.claimerId = claimerId;
            await ticket.save();

            const guild = this.client.guilds.cache.get(ticket.guildId);
            if (guild) {
                const channel = guild.channels.cache.get(ticket.channelId);
                if (channel) {
                    await channel.permissionOverwrites.create(claimerId, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true,
                        AttachFiles: true
                    });

                    await channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(`🎯 Ticket reclamado por <@${claimerId}>`)
                                .setColor("#00ff00")
                                .setTimestamp()
                        ]
                    });
                }
            }

            await this.sendLog(
                ticket.guildId,
                `\`TICKET:\` ${ticketId}\n\`RECLAMADO POR:\` <@${claimerId}>`
            );

            return { success: true, ticket };
        } catch (error) {
            this.client.logger.error("Error reclamando ticket:", error);
            return { success: false, error: error.message };
        }
    }

    async generateTranscript(ticketId, requesterId) {
        try {
            const Ticket = this.getModel("Ticket");
            const ticket = await Ticket.findOne({ ticketId });
            
            if (!ticket) {
                throw new Error("Ticket no encontrado");
            }

            const guild = this.client.guilds.cache.get(ticket.guildId);
            if (!guild) {
                throw new Error("Servidor no encontrado");
            }

            const channel = guild.channels.cache.get(ticket.channelId);
            if (!channel) {
                throw new Error("Canal no encontrado");
            }

            const messages = await this.fetchAllMessages(channel);
            
            const transcriptContent = this.buildTranscriptContent(ticketId, messages);
            
            const filePath = path.join(process.cwd(), `transcript-${ticketId}.txt`);
            await fs.writeFile(filePath, transcriptContent, "utf8");

            ticket.transcript = transcriptContent;
            ticket.transcriptType = "txt";
            ticket.transcriptUrl = `transcript-${ticketId}.txt`;
            await ticket.save();

            await this.sendTranscriptToLogs(guild, ticket.guildId, ticketId, requesterId, filePath);

            return { success: true, transcript: transcriptContent };
        } catch (error) {
            this.client.logger.error("Error generando transcript:", error);
            return { success: false, error: error.message };
        }
    }

    async fetchAllMessages(channel) {
        let messages = [];
        let lastId;

        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const fetched = await channel.messages.fetch(options);
            if (fetched.size === 0) break;

            messages = messages.concat(Array.from(fetched.values()));
            lastId = fetched.last().id;
        }

        return messages.reverse();
    }

    buildTranscriptContent(ticketId, messages) {
        let content = `Transcript del Ticket: ${ticketId}\n`;
        content += `Generado: ${new Date().toLocaleString()}\n`;
        content += `${"=".repeat(80)}\n\n`;

        for (const message of messages) {
            if (message.system) continue;

            const timestamp = message.createdAt.toLocaleString();
            const author = message.author.tag;
            const messageContent = message.content || "(sin contenido)";

            content += `[${timestamp}] ${author}:\n`;
            content += `${messageContent}\n`;

            if (message.attachments.size > 0) {
                const attachments = Array.from(message.attachments.values())
                    .map(a => a.url)
                    .join("\n  ");
                content += `  Archivos adjuntos:\n  ${attachments}\n`;
            }

            if (message.embeds.length > 0) {
                content += `  [${message.embeds.length} embed(s)]\n`;
            }

            content += "\n";
        }

        return content;
    }

    async sendTranscriptToLogs(guild, guildId, ticketId, requesterId, filePath) {
        const config = await this.getGuildConfig(guildId);
        if (!config?.logChannelId) return;

        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (!logChannel?.isTextBased()) return;

        const attachment = new AttachmentBuilder(filePath);
        
        await logChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`📄 Transcript generado - Ticket ${ticketId}`)
                    .setDescription(`Generado por <@${requesterId}>`)
                    .setColor("#0099ff")
                    .setTimestamp()
            ],
            files: [attachment]
        });
    }

    async sendLog(guildId, message, evidence = null) {
        try {
            const config = await this.getGuildConfig(guildId);
            if (!config?.logChannelId) return;

            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(config.logChannelId);
            if (!channel?.isTextBased()) return;

            const embed = new EmbedBuilder()
                .setTitle("```REGISTRO DE TICKETS```")
                .setDescription(message)
                .setColor("#F54927")
                .setTimestamp();

            if (evidence) {
                if (evidence instanceof EmbedBuilder) {
                    await channel.send({ embeds: [embed, evidence] });
                    return;
                }

                if (typeof evidence === "string") {
                    if (this.isValidImageUrl(evidence)) {
                        embed.setImage(evidence);
                    } else if (evidence.startsWith("http")) {
                        embed.addFields({
                            name: "```ENLACE```",
                            value: `[Ver evidencia](${evidence})`
                        });
                    } else if (evidence.trim().length > 0) {
                        const truncatedEvidence = evidence.length > 1024 
                            ? evidence.substring(0, 1021) + "..." 
                            : evidence;
                        embed.addFields({
                            name: "```NOTAS```",
                            value: truncatedEvidence
                        });
                    }
                }
            }

            await channel.send({ embeds: [embed] });

        } catch (error) {
            this.client.logger.error("Error enviando log:", error);
        }
    }

    isValidImageUrl(url) {
        if (typeof url !== 'string') return false;

        try {
            new URL(url);
        } catch {
            return false;
        }

        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)(\?.*)?$/i;
        const imageDomains = [
            'cdn.discordapp.com',
            'media.discordapp.net',
            'images-ext-1.discordapp.net',
            'images-ext-2.discordapp.net',
            'i.imgur.com',
            'imgur.com',
            'i.redd.it',
            'gyazo.com',
            'prntscr.com',
            'tenor.com',
            'img.kiwi'
        ];

        const urlObj = new URL(url);
        
        return imageExtensions.test(urlObj.pathname) ||
               imageDomains.some(domain => urlObj.hostname.includes(domain));
    }

    generateTicketId() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    async getGuildTickets(guildId, filters = {}) {
        try {
            const Ticket = this.getModel("Ticket");
            const query = { guildId, ...filters };
            return await Ticket.find(query).sort({ createdAt: -1 });
        } catch (error) {
            this.client.logger.error("Error obteniendo tickets:", error);
            return [];
        }
    }

    async getTicketStats(guildId) {
        try {
            const Ticket = this.getModel("Ticket");
            const stats = await Ticket.aggregate([
                { $match: { guildId } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
                        claimed: { $sum: { $cond: [{ $eq: ["$status", "claimed"] }, 1, 0] } },
                        closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } }
                    }
                }
            ]);

            return stats[0] || { total: 0, open: 0, claimed: 0, closed: 0 };
        } catch (error) {
            this.client.logger.error("Error obteniendo estadísticas:", error);
            return { total: 0, open: 0, claimed: 0, closed: 0 };
        }
    }
}