import { MessageFlags, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import ContestEntry from '../Models/ContestEntry.js';
import ContestVote from '../Models/ContestVote.js';
import ContestChannel from '../Models/ContestChannel.js';

export default async function handleContestInteraction(client, interaction) {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'contest_vote') {
                return await handleVoteButton(client, interaction);
            }

            if (interaction.customId.startsWith('vote_emoji_')) {
                return await handleEmojiVote(client, interaction);
            }

            if (interaction.customId === 'contest_info') {
                return await handleInfoButton(client, interaction);
            }

            if (interaction.customId === 'contest_select_emoji') {
                return await handleEmojiSelectButton(client, interaction);
            }

            if (interaction.customId === 'contest_report') {
                return await handleReportButton(client, interaction);
            }

            if (interaction.customId.startsWith('contest_view_entry_')) {
                return await handleViewEntry(client, interaction);
            }

            if (interaction.customId.startsWith('contest_delete_entry_')) {
                return await handleDeleteEntry(client, interaction);
            }

            if (interaction.customId === 'contest_refresh_entries') {
                return await handleRefreshEntries(client, interaction);
            }

            if (interaction.customId === 'contest_view_best_entry') {
                return await handleViewBestEntry(client, interaction);
            }

            if (interaction.customId.startsWith('contest_admin_')) {
                return await handleAdminAction(client, interaction);
            }

            if (interaction.customId.startsWith('remove_vote_')) {
                return await handleRemoveVote(client, interaction);
            }

            if (interaction.customId.startsWith('confirm_remove_')) {
                return await handleConfirmRemoveVote(client, interaction);
            }

            if (interaction.customId === 'cancel_remove') {
                await interaction.update({
                    components: [],
                    flags: MessageFlags.IsComponentsV2,
                    content: null,
                    embeds: []
                });
                return true;
            }

            if (interaction.customId.startsWith('view_voters_')) {
                return await handleViewVoters(client, interaction);
            }
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'contest_emoji_select') {
                return await handleEmojiSelectMenu(client, interaction);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('contest_report_modal_')) {
                return await handleReportModal(client, interaction);
            }
        }

        return false;

    } catch (error) {
        console.error('❌ Error en contest.interactions:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Ocurrió un error en el sistema de concurso.',
                flags: 64
            }).catch(() => { });
        }

        return true;
    }
}

async function handleVoteButton(client, interaction) {
    const contestManager = client.contestManager;
    if (!contestManager) return true;

    const entry = await ContestEntry.findOne({
        messageId: interaction.message.id
    });

    if (!entry) {
        await interaction.reply({
            content: '❌ Esta entrada ya no existe.',
            flags: 64
        });
        return true;
    }

    const contestChannel = await ContestChannel.findOne({
        guildId: interaction.guild.id,
        channelId: interaction.channel.id
    });

    if (!contestChannel) {
        await interaction.reply({
            content: '❌ Este canal no es un concurso activo.',
            flags: 64
        });
        return true;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id);
    const joinDate = member.joinedAt;
    const timeInServer = Date.now() - joinDate.getTime();
    const minTime = contestChannel.minTimeInServer * 24 * 60 * 60 * 1000;

    if (timeInServer < minTime) {
        const daysMissing = Math.ceil((minTime - timeInServer) / (24 * 60 * 60 * 1000));
        await interaction.reply({
            content: `❌ Necesitas ${daysMissing} día(s) más en el servidor para votar.`,
            flags: 64
        });
        return true;
    }

    const cooldownCheck = await contestManager.checkVoteCooldown(
        interaction.user.id,
        entry._id,
        contestChannel
    );

    if (cooldownCheck.onCooldown) {
        await interaction.reply({
            content: `⏳ Debes esperar ${cooldownCheck.remaining}s antes de votar de nuevo.`,
            flags: 64
        });
        return true;
    }

    await showEmojiSelector(interaction, entry._id);

    return true;
}

async function showEmojiSelector(interaction, entryId) {
    const selectorContainer = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                '<:yellowstar:1051613844717457522> \`VOTAR POR ESTA PUBLICACIÓN\`\n' +
                '<:flechaderecha:1458904809481572575> ¿Quieres votar con una estrella?\n\n' +
                '<:flechaderecha:1458904809481572575> \`NOTA:\` Tu voto será registrado inmediatamente.'
            )
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) => {
            const starButton = new ButtonBuilder()
                .setCustomId(`vote_emoji_⭐_${entryId}`)
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

async function handleEmojiVote(client, interaction) {
    const contestManager = client.contestManager;
    if (!contestManager) return true;

    if (interaction.customId === 'cancel_vote') {
        await interaction.update({
            components: [],
            flags: MessageFlags.IsComponentsV2,
            content: null,
            embeds: []
        });
        return true;
    }

    const parts = interaction.customId.split('_');
    const emoji = parts[2];
    const entryId = parts[3];

    console.log('🎯 Procesando voto:', { emoji, entryId, userId: interaction.user.id });
    const result = await contestManager.processEmojiVote(interaction, emoji, entryId);
    return result;
}

async function handleInfoButton(client, interaction) {
    const entry = await ContestEntry.findOne({
        messageId: interaction.message.id
    });

    if (!entry) {
        await interaction.reply({
            content: '❌ Información no disponible.',
            flags: 64
        });
        return true;
    }

    const votes = await ContestVote.find({
        entryId: entry._id,
        isValid: true
    });

    const emojiStats = votes.reduce((acc, vote) => {
        acc[vote.emoji] = (acc[vote.emoji] || 0) + 1;
        return acc;
    }, {});

    const emojiStatsText = Object.entries(emojiStats)
        .sort((a, b) => b[1] - a[1])
        .map(([emoji, count]) => `${emoji}: ${count}`)
        .join('\n');

    const infoContainer = new ContainerBuilder()
        .setAccentColor(0xF6B5FF)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `<:expediente:1458896978371940402> \`INFORMACIÓN DEL PARTICIPANTE\`\n\n` +
                `<:WhiteButton:923282526322184212> \`PARTICIPANTE:\` <@${entry.userId}>\n` +
                `<:RedButton:922997252501405716> \`VOTOS TOTALES:\` ${entry.votes}\n` +
                `<:GreenButton:922998420027899965> \`ESTADO:\` ${getStatusText(entry.status)}`
            )
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) => {
            const closeButton = new ButtonBuilder()
                .setCustomId('close_info')
                .setLabel('CERRAR')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:failure:1324518608818278492>');

            return actionRow.setComponents(closeButton);
        });

    await interaction.reply({
        components: [infoContainer],
        flags: MessageFlags.IsComponentsV2 | 64
    });

    return true;
}

async function handleEmojiSelectButton(client, interaction) {
    const entry = await ContestEntry.findOne({
        messageId: interaction.message.id
    });

    if (!entry) {
        await interaction.reply({
            content: '❌ Esta entrada ya no existe.',
            flags: 64
        });
        return true;
    }

    await showEmojiSelector(interaction, entry._id);
    return true;
}

async function handleReportButton(client, interaction) {
    const modal = {
        title: '🚨 Reportar Entrada',
        custom_id: `contest_report_modal_${interaction.message.id}`,
        components: [
            {
                type: 1,
                components: [{
                    type: 4,
                    custom_id: 'reason',
                    label: 'Motivo del reporte',
                    style: 2,
                    min_length: 10,
                    max_length: 200,
                    placeholder: 'Describe por qué estás reportando esta entrada...',
                    required: true
                }]
            }
        ]
    };

    await interaction.showModal(modal);
    return true;
}

async function handleViewEntry(client, interaction) {
    await safeDefer(interaction);

    const entryId = interaction.customId.replace('contest_view_entry_', '');
    const entry = await ContestEntry.findById(entryId);

    if (!entry) {
        await interaction.editReply({
            content: '❌ Esta entrada ya no existe.',
            components: []
        });
        return true;
    }

    const detailContainer = new ContainerBuilder()
        .setAccentColor(0x9B59B6)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `# 📷 Entrada Detallada\n\n` +
                `**Participante:** <@${entry.userId}>\n` +
                `**Votos:** ${entry.votes}\n` +
                `**Fecha:** ${new Date(entry.createdAt).toLocaleDateString('es-ES')}\n` +
                `**Último voto:** ${entry.lastVoteAt ? new Date(entry.lastVoteAt).toLocaleString('es-ES') : 'Nunca'}\n\n` +
                `## Descripción\n${entry.description || 'Sin descripción'}`
            )
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) => {
            const voteButton = new ButtonBuilder()
                .setCustomId('contest_vote')
                .setLabel('Votar')
                .setEmoji('⭐')
                .setStyle(ButtonStyle.Success);

            const refreshButton = new ButtonBuilder()
                .setCustomId(`contest_view_entry_${entry._id}`)
                .setLabel('Actualizar')
                .setEmoji('🔄')
                .setStyle(ButtonStyle.Secondary);

            return actionRow.setComponents(voteButton, refreshButton);
        });

    await interaction.editReply({
        components: [detailContainer],
        flags: MessageFlags.IsComponentsV2
    });

    return true;
}

async function handleDeleteEntry(client, interaction) {
    await safeDefer(interaction);

    const entryId = interaction.customId.replace('contest_delete_entry_', '');
    const entry = await ContestEntry.findById(entryId);

    const isOwner = entry.userId === interaction.user.id;
    const isAdmin = interaction.member.permissions.has('ManageMessages');

    if (!isOwner && !isAdmin) {
        await interaction.editReply({
            content: '❌ No tienes permisos para eliminar esta entrada.',
            components: []
        });
        return true;
    }

    entry.status = 'removed';
    entry.metadata.deletedAt = new Date();
    entry.metadata.deletedBy = interaction.user.id;
    await entry.save();

    try {
        const channel = await client.channels.fetch(entry.channelId);
        const message = await channel.messages.fetch(entry.messageId);
        await message.delete();
    } catch (error) {
        console.error('Error eliminando mensaje:', error);
    }

    await interaction.editReply({
        content: '✅ Entrada eliminada exitosamente.',
        components: []
    });

    return true;
}

async function handleRefreshEntries(client, interaction) {
    await safeDefer(interaction);

    const contestManager = client.contestManager;
    if (!contestManager) return true;

    const entries = await ContestEntry.find({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        status: 'active'
    }).sort({ votes: -1 });

    if (entries.length === 0) {
        const noEntriesContainer = new ContainerBuilder()
            .setAccentColor(0xE74C3C)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    '# 📭 No tienes entradas activas\n\n' +
                    'Envía una imagen con descripción en un canal de concurso para participar.'
                )
            );

        await interaction.editReply({
            components: [noEntriesContainer],
            flags: MessageFlags.IsComponentsV2
        });
        return true;
    }

    const entriesContainer = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `# 📷 Tus Entradas (${entries.length})\n\n` +
                entries.map((entry, index) =>
                    `**Entrada ${index + 1}**\n` +
                    `Votos: ${entry.votes} | Canal: <#${entry.channelId}>\n` +
                    `${entry.description ? `"${entry.description.slice(0, 50)}${entry.description.length > 50 ? '...' : ''}"\n` : ''}` +
                    `────────────────`
                ).join('\n')
            )
        );

    await interaction.editReply({
        components: [entriesContainer],
        flags: MessageFlags.IsComponentsV2
    });

    return true;
}

async function handleViewBestEntry(client, interaction) {
    await safeDefer(interaction);

    const bestEntry = await ContestEntry.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        status: 'active'
    }).sort({ votes: -1 });

    if (!bestEntry) {
        const noBestContainer = new ContainerBuilder()
            .setAccentColor(0xF39C12)
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    '# 🏆 No tienes entradas\n\n' +
                    '¡Participa en un concurso para tener tu mejor entrada!'
                )
            );

        await interaction.editReply({
            components: [noBestContainer],
            flags: MessageFlags.IsComponentsV2
        });
        return true;
    }

    const bestContainer = new ContainerBuilder()
        .setAccentColor(0xFFD700)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                `# 🏆 Tu Mejor Entrada\n\n` +
                `**Votos:** ${bestEntry.votes}\n` +
                `**Canal:** <#${bestEntry.channelId}>\n` +
                `**Fecha:** ${new Date(bestEntry.createdAt).toLocaleDateString('es-ES')}\n\n` +
                `## Descripción\n${bestEntry.description || 'Sin descripción'}\n\n` +
                `¡Sigue así! 🚀`
            )
        );

    await interaction.editReply({
        components: [bestContainer],
        flags: MessageFlags.IsComponentsV2
    });

    return true;
}

async function handleAdminAction(client, interaction) {
    await safeDefer(interaction);

    const parts = interaction.customId.split('_');
    const action = parts[2];
    const entryId = parts[3];

    if (!interaction.member.permissions.has('ManageMessages')) {
        await interaction.editReply({
            content: '❌ Necesitas permisos de moderador para esta acción.',
            components: []
        });
        return true;
    }

    const entry = await ContestEntry.findById(entryId);
    if (!entry) {
        await interaction.editReply({
            content: '❌ Entrada no encontrada.',
            components: []
        });
        return true;
    }

    switch (action) {
        case 'disqualify':
            entry.status = 'disqualified';
            entry.metadata.disqualifiedBy = interaction.user.id;
            entry.metadata.disqualifiedAt = new Date();
            await entry.save();

            await interaction.editReply({
                content: `✅ Entrada descalificada por <@${entry.userId}>.`,
                components: []
            });
            break;

        case 'restore':
            entry.status = 'active';
            await entry.save();

            await interaction.editReply({
                content: `✅ Entrada restaurada para <@${entry.userId}>.`,
                components: []
            });
            break;

        case 'clearvotes':
            await ContestVote.deleteMany({ entryId: entry._id });
            entry.votes = 0;
            await entry.save();

            await interaction.editReply({
                content: `✅ Votos eliminados de la entrada de <@${entry.userId}>.`,
                components: []
            });
            break;
    }

    return true;
}

async function handleEmojiSelectMenu(client, interaction) {
    await safeDefer(interaction);

    const emoji = interaction.values[0];
    const entryId = interaction.message.content.match(/entryId: (\w+)/)?.[1];

    if (!entryId) {
        await interaction.editReply({
            content: '❌ No se pudo identificar la entrada.',
            components: []
        });
        return true;
    }

    const contestManager = client.contestManager;
    if (contestManager) {
        await contestManager.processEmojiVote(interaction, emoji, entryId);
    }

    return true;
}

async function handleReportModal(client, interaction) {
    await interaction.deferReply({ flags: 64 });

    const messageId = interaction.customId.replace('contest_report_modal_', '');
    const reason = interaction.fields.getTextInputValue('reason');

    const entry = await ContestEntry.findOne({ messageId });
    if (!entry) {
        await interaction.editReply({
            content: '❌ Esta entrada ya no existe.'
        });
        return true;
    }

    const report = {
        reporterId: interaction.user.id,
        reporterTag: interaction.user.tag,
        entryId: entry._id,
        userId: entry.userId,
        reason: reason,
        reportedAt: new Date(),
        status: 'pending'
    };

    console.log('📢 Reporte recibido:', report);

    const logChannel = interaction.guild.channels.cache.find(ch =>
        ch.name.includes('log') || ch.name.includes('report')
    );

    if (logChannel) {
        const reportEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🚨 Entrada Reportada')
            .addFields(
                { name: 'Reportado por', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
                { name: 'Entrada de', value: `<@${entry.userId}>`, inline: true },
                { name: 'Motivo', value: reason },
                { name: 'Mensaje ID', value: messageId, inline: true },
                { name: 'Enlace', value: `[Ir al mensaje](https://discord.com/channels/${interaction.guild.id}/${interaction.channel.id}/${messageId})`, inline: true }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [reportEmbed] });
    }

    await interaction.editReply({
        content: '✅ Reporte enviado. Los moderadores revisarán la entrada.'
    });

    return true;
}

async function handleRemoveVote(client, interaction) {
    const contestManager = client.contestManager;
    if (!contestManager) return true;

    // Extraer entryId del customId: remove_vote_ENTRYID
    const entryId = interaction.customId.replace('remove_vote_', '');

    const entry = await ContestEntry.findById(entryId);
    if (!entry) {
        await interaction.reply({
            content: '❌ Esta entrada ya no existe.',
            flags: 64
        });
        return true;
    }

    const existingVote = await ContestVote.findOne({
        entryId: entry._id,
        userId: interaction.user.id,
        isValid: true
    });

    if (!existingVote) {
        await interaction.reply({
            content: '❌ No has votado por esta entrada.',
            flags: 64
        });
        return true;
    }

    const confirmContainer = new ContainerBuilder()
        .setAccentColor(0xFFA500)
        .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
                '<:alerta:1458927121874550805> `¿REMOVER VOTO?`\n\n' +
                '<:flechaderecha:1458904809481572575> ¿Estás seguro de que quieres remover tu voto?\n' +
                '<:flechaderecha:1458904809481572575> Tu voto será eliminado permanentemente.' 
            )
        )
        .addSeparatorComponents((separator) => separator)
        .addActionRowComponents((actionRow) => {
            const confirmButton = new ButtonBuilder()
                .setCustomId(`confirm_remove_${entry._id}`)
                .setLabel('SÍ, REMOVER')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('<:failure:1324518608818278492>');

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_remove')
                .setLabel('CANCELAR')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('<:success:1324518611343249531>');

            return actionRow.setComponents(confirmButton, cancelButton);
        });

    await interaction.reply({
        components: [confirmContainer],
        flags: MessageFlags.IsComponentsV2 | 64
    });

    return true;
}

async function handleConfirmRemoveVote(client, interaction) {
    const contestManager = client.contestManager;
    if (!contestManager) return true;

    const entryId = interaction.customId.replace('confirm_remove_', '');
    const result = await contestManager.removeVote(interaction, entryId);
    return result;
}

async function handleViewVoters(client, interaction) {
    // 🛑 Seguridad absoluta
    if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
            content: '⚠️ No se pudo mostrar la lista (interacción ya usada).',
            flags: 64
        }).catch(() => {});
        return true;
    }

    const entryId = interaction.customId.replace('view_voters_', '');
    const entry = await ContestEntry.findById(entryId);

    if (!entry) {
        await interaction.reply({
            content: '❌ Entrada no encontrada.',
            flags: 64
        });
        return true;
    }

    const votes = await ContestVote.find({
        entryId: entry._id,
        isValid: true
    }).sort({ createdAt: -1 });

    const container = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addTextDisplayComponents(td => {
            if (votes.length === 0) {
                return td.setContent(
                    '<:users:1458904809481572575> `LISTA DE VOTANTES`\n\n' +
                    '❌ Esta entrada aún no tiene votos.'
                );
            }

            const groups = {};
            for (const v of votes) {
                (groups[v.emoji] ??= []).push(v.userId);
            }

            let text = '';
            for (const [emoji, users] of Object.entries(groups)) {
                text += `\n${emoji} **(${users.length})**\n`;
                for (const id of users) {
                    text += `• <@${id}>\n`;
                }
            }

            return td.setContent(
                '<:users:1458904809481572575> `LISTA DE VOTANTES`\n\n' +
                `**Total votos:** ${votes.length}\n` +
                text
            );
        });

    await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2 | flags: 64
    });

    return true;
}



async function safeDefer(interaction) {

    if (interaction.customId?.startsWith('view_voters_')) return;

    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => { });
    }
}

function getStatusText(status) {
    switch (status) {
        case 'active': return '🟢 Activa';
        case 'disqualified': return '🔴 Descalificada';
        case 'removed': return '🗑️ Eliminada';
        case 'winner': return '🏆 Ganadora';
        default: return '❓ Desconocido';
    }
}