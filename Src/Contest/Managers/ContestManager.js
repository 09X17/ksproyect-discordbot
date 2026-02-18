import { MessageFlags, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MediaGalleryBuilder, AttachmentBuilder } from 'discord.js';
import ContestEntry from '../Models/ContestEntry.js';
import ContestVote from '../Models/ContestVote.js';
import ContestChannel from '../Models/ContestChannel.js';
import RateLimiter from "./rateLimiter.js"
import fetch from 'node-fetch';

export default class ContestManager {
    constructor(client) {
        this.client = client;
        this.db = client.db;
        this.cache = new Map();
        this.cacheTTL = 300000;
        this.rateLimiter = new RateLimiter();

        this.defaultSettings = {
            minTimeInServer: 7,
            maxEntriesPerUser: 3,
            votingEnabled: true,
            autoDeleteInvalid: true,
            notificationChannel: null,
            allowMultipleVotes: false,
            voteCooldown: 0,
            showVoteCount: true,
            requireDescription: false,
            maxDescriptionLength: 500
        };

        this.setupCleanupIntervals();
    }

    setupCleanupIntervals() {
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 5 * 60 * 1000);

        setInterval(async () => {
            await this.cleanupInvalidVotes();
        }, 60 * 60 * 1000);
    }

    async setupContestWithComponents(interaction, channelId, options = {}) {
        try {
            const guildId = interaction.guild.id;

            const existing = await ContestChannel.findOne({ guildId, channelId });
            if (existing) {
                await interaction.reply({
                    content: '❌ Este canal ya está configurado como concurso.',
                    flags: 64
                });
                return;
            }

            const settings = {
                ...this.defaultSettings,
                ...options,
                guildId,
                channelId,
                createdAt: new Date(),
                isActive: true,
                stats: {
                    totalEntries: 0,
                    totalVotes: 0,
                    activeUsers: 0
                }
            };

            const contestChannel = new ContestChannel(settings);
            await contestChannel.save();

            const configContainer = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    (textDisplay) => textDisplay
                        .setContent('# 🏆 Sistema de Concurso Configurado\n\n' +
                            `**Canal:** <#${channelId}>\n` +
                            `**Tiempo mínimo:** ${settings.minTimeInServer} días\n` +
                            `**Votaciones:** ${settings.votingEnabled ? '✅ Activadas' : '❌ Desactivadas'}\n` +
                            `**Máx. entradas:** ${settings.maxEntriesPerUser} por usuario\n\n` +
                            '### Cómo participar:\n' +
                            '1. Envía una imagen con descripción al canal\n' +
                            '2. El bot creará una entrada interactiva\n' +
                            '3. Usa los botones para votar\n' +
                            '4. ¡El tiempo mínimo en el servidor es verificado automáticamente!'
                        )
                )
                .addSeparatorComponents((separator) => separator);

            await interaction.reply({
                components: [configContainer],
                flags: MessageFlags.IsComponentsV2
            });

            this.clearCache(guildId);

        } catch (error) {
            console.error('❌ Error configurando concurso:', error);
            await interaction.reply({
                content: '❌ Error al configurar el concurso.',
                flags: 64
            });
        }
    }

    async handleContestSubmission(message) {
        try {
            const guildId = message.guild.id;
            const userId = message.author.id;
            const channelId = message.channel.id;

            const contestChannel = await ContestChannel.findOne({ guildId, channelId });
            if (!contestChannel || !contestChannel.isActive) return null;

            const validation = await this.validateSubmission(message, contestChannel);
            if (!validation.valid) {
                await this.sendValidationError(message, validation.reason);
                return null;
            }

            const submissionResult = await this.createContestEntry(message, contestChannel);
            await this.updateContestStats(guildId, channelId, 'entry');

            return submissionResult;

        } catch (error) {
            console.error('❌ Error manejando submission:', error);
            throw error;
        }
    }

    async createContestEntry(message, contestChannel) {
        const guildId = message.guild.id;
        const userId = message.author.id;
        const channelId = message.channel.id;
        const attachment = message.attachments.first();
        const user = message.author;

        const imageUrl = attachment.url;

        let discordAttachment;
        try {
            const response = await fetch(imageUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const fileName = attachment.name || `contest_${Date.now()}.png`;
            discordAttachment = new AttachmentBuilder(buffer, { name: fileName });
        } catch (error) {
            console.error('❌ Error descargando imagen:', error);
            await this.sendValidationError(message, 'Error al procesar la imagen');
            return null;
        }

        await message.delete().catch(() => { });

        const mainContainer = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `## \`ENTRADA DE ${user.globalName.toUpperCase() || user.username.toUpperCase()}\`\n` +
                    `<:WhiteButton:923282526322184212> \`DESCRIPCIÓN:\` __${message.content || 'Sin descripción'}__\n` +
                    `<:RedButton:922997252501405716> \`USUARIO:\` <@${userId}>\n` +
                    `<:GreenButton:922998420027899965> \`VOTOS:\` __0__`
                )
            )
            .addSeparatorComponents((separator) => separator)
            .addActionRowComponents((actionRow) => {
                const voteButton = new ButtonBuilder()
                    .setCustomId('contest_vote')
                    .setLabel('VOTAR')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:carta:1458896674268254343>');

                const infoButton = new ButtonBuilder()
                    .setCustomId('contest_info')
                    .setLabel('INFO')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:expediente:1458896978371940402>');

                const reportButton = new ButtonBuilder()
                    .setCustomId('contest_report')
                    .setLabel('REPORTE')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:report:1458897276780155107>');

                return actionRow.setComponents(voteButton, infoButton, reportButton);
            });

        const mediaGallery = new MediaGalleryBuilder()
            .addItems((mediaItem) =>
                mediaItem
                    .setDescription(`Imagen enviada por ${user.tag}`)
                    .setURL(`attachment://${discordAttachment.name}`)
            );

        const botMessage = await message.channel.send({
            components: [mainContainer, mediaGallery],
            files: [discordAttachment],
            flags: MessageFlags.IsComponentsV2
        });

        const contestEntry = await ContestEntry.create({
            guildId,
            userId,
            messageId: botMessage.id,
            channelId,
            imageUrl: imageUrl,
            imageFilename: discordAttachment.name,
            description: message.content || '',
            votes: 0,
            createdAt: new Date(),
            status: 'active',
            metadata: {
                version: 'v2_fixed',
                hasMediaGallery: true
            }
        });

        return {
            success: true,
            entry: contestEntry,
            message: botMessage
        };
    }

    async handleVoteButton(interaction) {
        try {
            const { guildId, channelId, message } = interaction;
            const userId = interaction.user.id;

            const contestEntry = await ContestEntry.findOne({
                guildId,
                messageId: message.id
            });

            if (!contestEntry) {
                await interaction.reply({
                    content: '❌ Esta entrada ya no está disponible.',
                    flags: 64
                });
                return;
            }

            const member = await interaction.guild.members.fetch(userId);
            const contestChannel = await ContestChannel.findOne({ guildId, channelId });

            const timeCheck = this.checkTimeInServer(member, contestChannel.minTimeInServer);
            if (!timeCheck.valid) {
                await interaction.reply({
                    content: `❌ ${timeCheck.reason}`,
                    flags: 64
                });
                return;
            }

            const cooldownCheck = await this.checkVoteCooldown(userId, contestEntry._id, contestChannel);
            if (cooldownCheck.onCooldown) {
                await interaction.reply({
                    content: `⏳ Debes esperar ${cooldownCheck.remaining}s antes de votar de nuevo.`,
                    flags: 64
                });
                return;
            }

            await this.showEmojiSelector(interaction, contestEntry);

        } catch (error) {
            console.error('❌ Error manejando voto:', error);
            await interaction.reply({
                content: '❌ Error al procesar el voto.',
                flags: 64
            });
        }
    }

    async showEmojiSelector(interaction, contestEntry) {
        const selectorContainer = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent('## 🎨 Votar por esta entrada\nElige un emoji para votar:')
            )
            .addSeparatorComponents((separator) => separator)
            .addActionRowComponents((actionRow) => {
                const starButton = new ButtonBuilder()
                    .setCustomId(`vote_emoji_⭐_${contestEntry._id}`)
                    .setLabel('VOTAR')
                    .setEmoji('<:carta:1458896674268254343>')
                    .setStyle(ButtonStyle.Secondary);

                const cancelButton = new ButtonBuilder()
                    .setCustomId('cancel_vote')
                    .setLabel('CANCELAR')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('<:failure:1324518608818278492>');

                return actionRow.setComponents(starButton, cancelButton);
            });

        await interaction.reply({
            components: [selectorContainer],
            flags: MessageFlags.IsComponentsV2 | 64
        });
    }

    async processEmojiVote(interaction, emoji, entryId) {
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            const contestEntry = await ContestEntry.findById(entryId);
            if (!contestEntry) {
                await this.sendTempResponse(interaction, '❌ Entrada no encontrada');
                return;
            }

            const contestChannel = await ContestChannel.findOne({
                guildId: contestEntry.guildId,
                channelId: contestEntry.channelId
            });

            if (!contestChannel) {
                await this.sendTempResponse(interaction, '❌ Canal de concurso no encontrado');
                return;
            }

            const cooldownCheck = await this.checkVoteCooldown(userId, entryId, contestChannel);
            if (cooldownCheck.onCooldown) {
                await this.sendTempResponse(interaction, `⏳ Espera ${cooldownCheck.remaining}s`);
                return;
            }

            const existingVote = await ContestVote.findOne({
                entryId: contestEntry._id,
                userId
            });

            if (existingVote && !contestChannel.allowMultipleVotes) {
                const alreadyVotedContainer = new ContainerBuilder()
                    .setAccentColor(0xFFA500)
                    .addTextDisplayComponents((td) =>
                        td.setContent(
                            '<:alerta:1458927121874550805> `YA HAS VOTADO`\n\n' +
                            `<:flechaderecha:1458904809481572575> Ya votaste por esta entrada\n` +
                            `<:flechaderecha:1458904809481572575> ¿Quieres remover tu voto?`
                        )
                    )
                    .addSeparatorComponents((separator) => separator)
                    .addActionRowComponents((actionRow) => {
                        const removeButton = new ButtonBuilder()
                            .setCustomId(`remove_vote_${entryId}`)
                            .setLabel('REMOVER MI VOTO')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('<:failure:1324518608818278492>');

                        const cancelButton = new ButtonBuilder()
                            .setCustomId('cancel_vote')
                            .setLabel('CANCELAR')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('<:success:1324518611343249531>');

                        return actionRow.setComponents(removeButton, cancelButton);
                    });

                await interaction.update({
                    components: [alreadyVotedContainer],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            // Guardar voto...
            if (existingVote) {
                existingVote.emoji = emoji;
                existingVote.createdAt = new Date();
                await existingVote.save();
            } else {
                const contestVote = new ContestVote({
                    guildId,
                    userId,
                    entryId: contestEntry._id,
                    emoji,
                    createdAt: new Date(),
                    isValid: true
                });
                await contestVote.save();
            }

            const voteCount = await ContestVote.countDocuments({
                entryId: contestEntry._id,
                isValid: true
            });

            contestEntry.votes = voteCount;
            contestEntry.lastVoteAt = new Date();
            await contestEntry.save();

            await this.refreshEntryMessage(contestEntry);

            // Mensaje de éxito CON botón para remover
            const successContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents((td) =>
                    td.setContent(
                        `<:success:1324518611343249531> \`VOTO REGISTRADO\`\n\n` +
                        `<:flechaderecha:1458904809481572575> \`TOTAL VOTOS:\` ${voteCount}`
                    )
                )
                .addSeparatorComponents((separator) => separator)
                .addActionRowComponents((actionRow) => {
                    const removeButton = new ButtonBuilder()
                        .setCustomId(`remove_vote_${entryId}`)
                        .setLabel('REMOVER MI VOTO')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('<:failure:1324518608818278492>');

                    return actionRow.setComponents(removeButton);
                });

            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate().catch(() => { });
            }

            await interaction.editReply({
                components: [successContainer],
                flags: MessageFlags.IsComponentsV2
            })

            setTimeout(async () => {
                try {
                    await interaction.editReply({
                        components: [],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (e) { }
            }, 5000);

        } catch (error) {
            console.error('❌ Error en processEmojiVote:', error);
            await this.sendTempResponse(interaction, '❌ Error al procesar voto');
        }
    }

    async removeVote(interaction, entryId) {
        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            const contestEntry = await ContestEntry.findById(entryId);
            if (!contestEntry) {
                await this.sendTempResponse(interaction, '❌ Entrada no encontrada');
                return;
            }

            const deletedVote = await ContestVote.findOneAndDelete({
                entryId: contestEntry._id,
                userId,
                isValid: true
            });

            if (!deletedVote) {
                await this.sendTempResponse(interaction, '❌ No tienes un voto para remover');
                return;
            }

            const voteCount = await ContestVote.countDocuments({
                entryId: contestEntry._id,
                isValid: true
            });

            contestEntry.votes = voteCount;
            contestEntry.lastVoteAt = new Date();
            await contestEntry.save();

            await this.refreshEntryMessage(contestEntry);

            await this.sendTempResponse(interaction,
                `<:success:1324518611343249531> Voto removido exitosamente`
            );

        } catch (error) {
            console.error('❌ Error removiendo voto:', error);
            await this.sendTempResponse(interaction, '❌ Error al remover el voto');
        }
    }

    async refreshEntryMessage(contestEntry) {
        try {
            const channel = await this.client.channels.fetch(contestEntry.channelId);
            if (!channel) {
                console.error('❌ Canal no encontrado:', contestEntry.channelId);
                return;
            }

            const message = await channel.messages.fetch(contestEntry.messageId).catch(() => null);
            if (!message) {
                console.error('❌ Mensaje no encontrado:', contestEntry.messageId);
                return;
            }

            const contestChannel = await ContestChannel.findOne({
                guildId: contestEntry.guildId,
                channelId: contestEntry.channelId
            });

            const user = await this.client.users.fetch(contestEntry.userId);

            let discordAttachment = null;
            try {
                if (contestEntry.imageUrl) {
                    const response = await fetch(contestEntry.imageUrl);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    const fileName = contestEntry.imageFilename || `contest_${contestEntry._id}.png`;
                    discordAttachment = new AttachmentBuilder(buffer, { name: fileName });
                }
            } catch (error) {
                console.error('❌ Error re-descargando imagen:', error);
                return;
            }

            if (!discordAttachment) {
                console.error('❌ No hay imagen para adjuntar');
                return;
            }

            const votes = await ContestVote.find({
                entryId: contestEntry._id,
                isValid: true
            });

            const buttons = [];

            const voteButton = new ButtonBuilder()
                .setCustomId('contest_vote')
                .setLabel('VOTAR')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:carta:1458896674268254343>');
            buttons.push(voteButton);

            const infoButton = new ButtonBuilder()
                .setCustomId('contest_info')
                .setLabel('INFO')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:expediente:1458896978371940402>');
            buttons.push(infoButton);

            const reportButton = new ButtonBuilder()
                .setCustomId('contest_report')
                .setLabel('REPORTAR')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:report:1458897276780155107>');
            buttons.push(reportButton);

            // Botón para ver votantes (si hay votos)
            if (votes.length > 0) {
                const votersButton = new ButtonBuilder()
                    .setCustomId(`view_voters_${contestEntry._id}`)
                    .setLabel(`VOTOS (${votes.length})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥')
                    .setDisabled(true)
                buttons.push(votersButton);
            }


            const mainContainer = new ContainerBuilder()
                .setAccentColor(0xB5FFB6)
                .addTextDisplayComponents((textDisplay) =>
                    textDisplay.setContent(
                        `## \`ENTRADA DE ${user.globalName.toUpperCase() || user.username.toUpperCase()}\`\n` +
                        `<:WhiteButton:923282526322184212> \`DESCRIPCIÓN:\` __${contestEntry.description || 'Sin descripción'}__\n` +
                        `<:RedButton:922997252501405716> \`USUARIO:\` <@${contestEntry.userId}>\n` +
                        `<:GreenButton:922998420027899965> \`VOTOS:\` __${contestEntry.votes} ${this.getVoteEmoji(contestEntry.votes)}__`
                    )
                )
                .addSeparatorComponents((separator) => separator)
                .addActionRowComponents((actionRow) => actionRow.setComponents(buttons));

            const mediaGallery = new MediaGalleryBuilder()
                .addItems((mediaItem) =>
                    mediaItem
                        .setDescription(`Imagen enviada por ${user.tag}`)
                        .setURL(`attachment://${discordAttachment.name}`)
                );

            await message.edit({
                components: [mainContainer, mediaGallery],
                files: [discordAttachment],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('❌ Error refrescando mensaje:', error);
        }
    }

    async sendTempResponse(interaction, message) {
        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents((td) => td.setContent(message));

        try {
            await interaction.update({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            setTimeout(async () => {
                try {
                    await interaction.editReply({
                        components: [],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (e) { }
            }, 3000);
        } catch (error) {
            console.error('❌ Error enviando respuesta:', error);
        }
    }

    getVoteEmoji(voteCount) {
        if (voteCount >= 100) return '🏆';
        if (voteCount >= 50) return '🔥';
        if (voteCount >= 25) return '⭐';
        if (voteCount >= 10) return '👍';
        return '👀';
    }

    async validateSubmission(message, contestChannel) {
        const guildId = message.guild.id;
        const userId = message.author.id;

        const hasImage = message.attachments.size > 0 &&
            message.attachments.some(att =>
                att.contentType && att.contentType.startsWith('image/'));

        if (!hasImage) {
            return { valid: false, reason: 'Debes incluir una imagen.' };
        }

        const userEntries = await ContestEntry.countDocuments({
            guildId,
            userId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        if (userEntries >= contestChannel.maxEntriesPerUser) {
            return {
                valid: false,
                reason: `Límite de ${contestChannel.maxEntriesPerUser} entradas alcanzado.`
            };
        }

        const member = await message.guild.members.fetch(userId);
        const timeCheck = this.checkTimeInServer(member, contestChannel.minTimeInServer);

        if (!timeCheck.valid) {
            return { valid: false, reason: timeCheck.reason };
        }

        if (contestChannel.requireDescription && !message.content) {
            return { valid: false, reason: 'Se requiere una descripción.' };
        }

        if (message.content && message.content.length > contestChannel.maxDescriptionLength) {
            return {
                valid: false,
                reason: `Descripción muy larga (máx ${contestChannel.maxDescriptionLength} caracteres).`
            };
        }

        return { valid: true };
    }

    checkTimeInServer(member, minDays) {
        const joinDate = member.joinedAt;
        const timeInServer = Date.now() - joinDate.getTime();
        const minTime = minDays * 24 * 60 * 60 * 1000;

        if (timeInServer < minTime) {
            const daysMissing = Math.ceil((minTime - timeInServer) / (24 * 60 * 60 * 1000));
            return {
                valid: false,
                reason: `Necesitas ${daysMissing} día(s) más en el servidor para participar.`
            };
        }

        return { valid: true };
    }

    async checkVoteCooldown(userId, entryId, contestChannel) {
        if (!contestChannel.voteCooldown || contestChannel.voteCooldown <= 0) {
            return { onCooldown: false };
        }

        const lastVote = await ContestVote.findOne({
            userId,
            entryId
        }).sort({ createdAt: -1 });

        if (!lastVote) {
            return { onCooldown: false };
        }

        const cooldownEnd = new Date(lastVote.createdAt).getTime() +
            (contestChannel.voteCooldown * 1000);

        if (Date.now() < cooldownEnd) {
            const remaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
            return {
                onCooldown: true,
                remaining
            };
        }

        return { onCooldown: false };
    }

    async sendValidationError(message, reason) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xFF0000)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(`## ❌ \`FALTO DE ARGUMENTOS\`\n<:flechaderecha:1458904809481572575>${reason}`)
            );

        const warning = await message.channel.send({
            components: [errorContainer],
            flags: MessageFlags.IsComponentsV2
        });

        setTimeout(() => warning.delete().catch(() => { }), 10000);
        await message.delete().catch(() => { });
    }

    async updateContestStats(guildId, channelId, type) {
        try {
            const update = type === 'entry'
                ? { 'stats.totalEntries': 1 }
                : { 'stats.totalVotes': 1 };

            await ContestChannel.updateOne(
                { guildId, channelId },
                {
                    $inc: update,
                    $set: { updatedAt: new Date() }
                }
            );
        } catch (error) {
            console.error('❌ Error actualizando estadísticas:', error);
        }
    }

    clearCache(guildId) {
        for (const key of this.cache.keys()) {
            if (key.includes(guildId)) {
                this.cache.delete(key);
            }
        }
    }

    cleanupExpiredCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }

    async cleanupInvalidVotes() {
        try {
            const allVotes = await ContestVote.find({ isValid: true });

            for (const vote of allVotes) {
                try {
                    const guild = await this.client.guilds.fetch(vote.guildId);
                    const member = await guild.members.fetch(vote.userId).catch(() => null);

                    if (!member) {
                        vote.isValid = false;
                        vote.metadata.invalidReason = 'user_left';
                        await vote.save();

                        const entry = await ContestEntry.findById(vote.entryId);
                        if (entry) {
                            const validVotes = await ContestVote.countDocuments({
                                entryId: entry._id,
                                isValid: true
                            });
                            entry.votes = validVotes;
                            await entry.save();
                            await this.refreshEntryMessage(entry);
                        }
                    }
                } catch (error) { }
            }
        } catch (error) {
            console.error('❌ Error limpiando votos inválidos:', error);
        }
    }

    async getContestStats(guildId, channelId = null) {
        try {
            const query = channelId
                ? { guildId, channelId }
                : { guildId };

            const contestChannels = await ContestChannel.find(query);
            const stats = [];

            for (const channel of contestChannels) {
                const entries = await ContestEntry.countDocuments({
                    guildId,
                    channelId: channel.channelId
                });

                const totalVotes = await ContestVote.countDocuments({
                    guildId,
                    'metadata.viaComponentsV2': true
                });

                const activeUsers = await ContestEntry.distinct('userId', {
                    guildId,
                    channelId: channel.channelId,
                    status: 'active'
                });

                stats.push({
                    channel: `<#${channel.channelId}>`,
                    entries,
                    totalVotes,
                    activeUsers: activeUsers.length,
                    minTimeInServer: channel.minTimeInServer,
                    votingEnabled: channel.votingEnabled
                });
            }

            return stats;
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    async endContest(guildId, channelId) {
        try {
            const contestChannel = await ContestChannel.findOne({ guildId, channelId });
            if (!contestChannel) {
                return { success: false, message: 'Canal de concurso no encontrado.' };
            }

            contestChannel.isActive = false;
            contestChannel.endedAt = new Date();
            await contestChannel.save();

            const winners = await this.getWinners(guildId, channelId);

            this.clearCache(guildId);

            return {
                success: true,
                message: 'Concurso finalizado exitosamente.',
                winners
            };
        } catch (error) {
            console.error('❌ Error finalizando concurso:', error);
            throw error;
        }
    }

    async getWinners(guildId, channelId, limit = 3) {
        try {
            const winners = await ContestEntry.find({
                guildId,
                channelId,
                status: 'active'
            })
                .sort({ votes: -1 })
                .limit(limit)
                .lean();

            return winners.map((entry, index) => ({
                position: index + 1,
                userId: entry.userId,
                votes: entry.votes,
                imageUrl: entry.imageUrl,
                description: entry.description
            }));
        } catch (error) {
            console.error('❌ Error obteniendo ganadores:', error);
            return [];
        }
    }
}