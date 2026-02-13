import { MessageFlags, InteractionType, EmbedBuilder,  ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

import TicketInteractionManager from '../Tickets/Managers/TicketInteractionManager.js';
import handleShopInteraction from '../LevelSystem/Managers/ShopInteractions.js';
import handleShopAdminInteraction from '../LevelSystem/Managers/ShopAdminInteractions.js';
import handleConfigLevelInteraction from '../LevelSystem/Managers/LevelConfigInteractions.js';
import handleLootboxInteraction from '../LevelSystem/Managers/LootboxInteractions.js';
import handleContestInteraction from '../Contest/Managers/contestinteraction.js';
import handleRankcardColorSelect from "../LevelSystem/Managers/RankCardInteractions.js"
import handleTradeInteraction from "../LevelSystem/Managers/TradeInteractionHandler.js"
import handleLootboxOpen from '../LevelSystem/Managers/InventoryInteractions.js';
import JobsConfig from '../LevelSystem/Managers/JobsConfig.js';
import handleEmbedEditorInteraction from '../Embed/Managers/handleEmbedEditorInteraction.js';

let ticketInteractionManager = null;

export default {
    name: 'interactionCreate',
    once: false,

    async execute(client, interaction) {

        // ================================
        // 🧠 INIT MANAGERS
        // ================================
        if (!ticketInteractionManager) {
            ticketInteractionManager = new TicketInteractionManager(client);
        }

        try {


            // ================================
            // 🚀 SLASH COMMANDS
            // ================================
            if (interaction.isChatInputCommand()) {
                return await handleSlashCommand(client, interaction);
            }

            // ================================
            // 🧠 MODALS (OTROS)
            // ================================
            if (interaction.isModalSubmit()) {

                if (interaction.customId === 'shop_create_item') {
                    return await handleShopCreateItem(client, interaction);
                }

                // 🛠️ Shop Admin
                if (await handleShopAdminInteraction(client, interaction)) return;

                // ⚙️ Level Config
                if (await handleConfigLevelInteraction(client, interaction)) return;
                
                // contest
                if(await handleContestInteraction(client, interaction)) return;
                
                // Trade
                if (await handleTradeInteraction(client, interaction)) return;
                                
                
                if (await handleEmbedEditorInteraction(client, interaction)) return;

                // 2️⃣ Sistema de embeds dinámicos
                if (await client.embedRouter.handle(interaction)) return;

                const ticketHandled =
                    await ticketInteractionManager?.handleTicketInteraction(interaction);

                if (ticketHandled) return;
            }

            // ================================
            // 🔘 BUTTONS
            // ================================
            if (interaction.isButton()) {

                // 🎟️ Tickets
                if (await ticketInteractionManager?.handleTicketInteraction(interaction)) return;
                
                if (await handleEmbedEditorInteraction(client, interaction)) return;

                // 2️⃣ Sistema de embeds dinámicos
                if (await client.embedRouter.handle(interaction)) return;

                // 🏆 Leaderboard
                if (await handleLeaderboardButton(client, interaction)) return;

                // 🛒 Shop
                if (await handleShopInteraction(client, interaction)) return;

                // 🛠️ Shop Admin
                if (await handleShopAdminInteraction(client, interaction)) return;

                // ⚙️ Level Config
                if (await handleConfigLevelInteraction(client, interaction)) return;

                // 🎁 Lootboxes
                if (await handleLootboxInteraction(client, interaction)) return;
                
                // Contest
                if(await handleContestInteraction(client, interaction)) return;

                // Trade
                if (await handleTradeInteraction(client, interaction)) return;
                
                // rankcard
                if (await handleRankcardColorSelect(client, interaction)) return;
                
                // lootboxx
                if(await handleLootboxOpen(client, interaction)) return;
                
                if (interaction.customId.startsWith('job_')) {
                    const jobs = Object.values(JobsConfig);
                    const [, action, pageStr] = interaction.customId.split('_');
                    let page = parseInt(pageStr);

                    if (action === 'next') page++;
                    if (action === 'prev') page--;

                    page = Math.max(0, Math.min(page, jobs.length - 1));

                    const embed = buildJobEmbed(jobs[page], page, jobs.length);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`job_prev_${page}`)
                            .setEmoji("<:flechaizquierda:1456491998335865075>")
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),

                        new ButtonBuilder()
                            .setCustomId(`job_next_${page}`)
                            .setEmoji("<:flechaderecha:1455684486938362010>")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === jobs.length - 1)
                    );

                    return interaction.update({
                        embeds: [embed],
                        components: [row]
                    });
                }

            }

            // ================================
            // 📂 SELECT MENUS
            // ================================
            if (interaction.isStringSelectMenu()) {

                // 🎟️ Tickets
                if (await ticketInteractionManager?.handleTicketInteraction(interaction)) return;
                
                if (await handleEmbedEditorInteraction(client, interaction)) return;

                // 2️⃣ Sistema de embeds dinámicos
                if (await client.embedRouter.handle(interaction)) return;

                // 🛒 Shop
                if (await handleShopInteraction(client, interaction)) return;

                // 🛠️ Shop Admin
                if (await handleShopAdminInteraction(client, interaction)) return;

                // ⚙️ Level Config
                if (await handleConfigLevelInteraction(client, interaction)) return;
                
                // Contest
                if(await handleContestInteraction(client, interaction)) return;
                
                // Trade
                if (await handleTradeInteraction(client, interaction)) return;
                
                 // rankcard
                if (await handleRankcardColorSelect(client, interaction)) return;
                
                // lootboxx
                if (await handleLootboxOpen(client, interaction)) return;

                                // ===== JOIN =====
                if (interaction.customId.startsWith('job_join_')) {
                    if (interaction.user.id !== interaction.customId.split('_')[2]) {
                        return interaction.reply({ content: '❌ Esto no es para ti.', flags: 64 });
                    }

                    const jobId = interaction.values[0];
                    const result = await interaction.client.levelManager.joinJob(
                        interaction.user.id,
                        interaction.guild.id,
                        jobId
                    );

                    if (!result.success) {

                        // ⏳ COOLDOWN
                        if (result.reason === 'cooldown') {
                            const unix = Math.floor((Date.now() + result.remaining) / 1000);
                            return interaction.update({
                                content: `<:relojdearena:1457064155067449364> Debes esperar <t:${unix}:R> para cambiar de trabajo.`,
                                components: []
                            });
                        }

                        return interaction.update({
                            content: `❌ ${result.reason}`,
                            components: []
                        });
                    }

                    return interaction.update({
                        content: `<:verificado:1453073955467563008> Te uniste al trabajo **${JobsConfig[jobId].name.toUpperCase()}**`,
                        components: []
                    });
                }

                // ===== LEAVE =====
                if (interaction.customId.startsWith('job_leave_')) {
                    if (interaction.user.id !== interaction.customId.split('_')[2]) {
                        return interaction.reply({ content: '❌ Esto no es para ti.', flags: 64 });
                    }

                    const jobId = interaction.values[0];
                    const result = await interaction.client.levelManager.leaveJob(
                        interaction.user.id,
                        interaction.guild.id,
                        jobId
                    );

                    if (!result.success) {

                        // ⏳ COOLDOWN
                        if (result.reason === 'cooldown') {
                            const unix = Math.floor((Date.now() + result.remaining) / 1000);
                            return interaction.update({
                                content: `<:relojdearena:1457064155067449364> Debes esperar <t:${unix}:R> para cambiar de trabajo.`,
                                components: []
                            });
                        }

                        return interaction.update({
                            content: `❌ ${result.reason}`,
                            components: []
                        });
                    }

                    return interaction.update({
                        content: `<:verificado:1453073955467563008> Has abandonado el trabajo **${JobsConfig[jobId].name.toUpperCase()}**`,
                        components: []
                    });
                }
                
            }

            // ================================
            // 📎 CONTEXT MENUS
            // ================================
            if (interaction.isContextMenuCommand()) {
                return await handleContextMenu(client, interaction);
            }

            // ================================
            // 🔤 AUTOCOMPLETE
            // ================================
            if (interaction.isAutocomplete()) {
                return await handleAutocomplete(interaction);
            }

            // ================================
            // ❓ NO MANEJADA
            // ================================
            client.logger.debug(
                `Interacción no manejada: ${interaction.type} | ${interaction.customId || interaction.commandName}`
            );

        } catch (error) {
            client.logger.error('Error en interactionCreate:', error.stack);
            handleInteractionError(interaction, error);
        }
    }
};

/* ============================================================
   ================= FUNCIONES AUXILIARES =====================
   ============================================================ */

// ================================
// 🧾 EMBED MODALS
// ================================
async function handleEmbedModal(client, interaction) {
    try {
        const embedManager = client.embedManager;
        if (!embedManager) {
            return interaction.reply({
                content: '❌ El sistema de embeds no está disponible.',
                flags: MessageFlags.Ephemeral
            });
        }

        await embedManager.handleModalSubmit(interaction);

    } catch (error) {
        client.logger.error('Error en handleEmbedModal:', error);
        await interaction.reply({
            content: '❌ Error procesando el formulario.',
            flags: MessageFlags.Ephemeral
        });
    }
}

// ================================
// 🚀 SLASH COMMANDS
// ================================
async function handleSlashCommand(client, interaction) {
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({
            content: '❌ Comando no disponible.',
            flags: MessageFlags.Ephemeral
        });
    }

    await command.run(client, interaction);
}

// ================================
// 📎 CONTEXT MENU
// ================================
async function handleContextMenu(client, interaction) {
    const command = client.contextMenus.get(interaction.commandName);
    if (!command) return;

    await command.execute(client, interaction);
}

// ================================
// 🔤 AUTOCOMPLETE
// ================================
async function handleAutocomplete(interaction) {
    if (!interaction.isAutocomplete()) return;

    const command = interaction.client.slashCommands.get(interaction.commandName);
    if (!command || typeof command.autocomplete !== 'function') return;

    try {
        await command.autocomplete(interaction.client, interaction);
    } catch (error) {
        console.error('Error en autocomplete:', error);

        // ⚠️ Autocomplete SOLO puede responder con respond()
        if (!interaction.responded) {
            await interaction.respond([]);
        }
    }
}
// ================================
// 🏆 LEADERBOARD BUTTONS
// ================================
export async function handleLeaderboardButton(client, interaction) {
    if (!interaction.customId.startsWith('leaderboard_')) return false;

    await interaction.deferUpdate();
    const [, action, type] = interaction.customId.split('_');
    const command = client.slashCommands.get('leaderboard');
    if (!command) return true;

    const key = `${interaction.user.id}:${interaction.guild.id}:${type}`;
    const current = command.currentPage.get(key) || { page: 1 };
    let page = current.page;

    if (action === 'next') page++;
    if (action === 'prev') page--;
    if (page < 1) page = 1;

    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const leaderboard = await client.levelManager.getLeaderboard(
            interaction.guild.id, type, limit, offset
        );
        const stats = await client.levelManager.getStats(interaction.guild.id);
        const totalPages = Math.max(1, Math.ceil(stats.totalUsers / limit));
        if (page > totalPages) page = totalPages;

        const embed = command.createLeaderboardEmbed(leaderboard, type, page, stats, interaction.guild);
        const buttons = command.createNavigationButtons(page, totalPages, type);
        command.currentPage.set(key, { page, type });

        await interaction.editReply({
            embeds: [embed],
            components: totalPages > 1 ? [buttons] : []
        });

    } catch (error) {
        client.logger.error('[Leaderboard Button Handler] Error:', error);
        await interaction.editReply({
            content: '❌ Ocurrió un error al actualizar el leaderboard.',
            components: [],
            flags: 64
        });
    }

    return true;
}


// ================================
// ❌ ERROR HANDLER
// ================================
function handleInteractionError(interaction, error) {
    if (error.code === 10062 || error.code === 40060) return;

    const payload = {
        content: '❌ Ocurrió un error al procesar la interacción.',
        flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
        interaction.followUp(payload).catch(() => {});
    } else {
        interaction.reply(payload).catch(() => {});
    }
}

function buildJobEmbed(job, page, total) {
    const cooldownMin = Math.floor(job.cooldown / 60000);

    const taxRate = job.taxes?.rate
        ? `${job.taxes.rate * 100}%`
        : 'Ninguno';

    const taxCurrencies = job.taxes?.appliesTo?.length
        ? job.taxes.appliesTo.map(c => c.toUpperCase()).join(', ')
        : '—';

    const evasionChance = job.taxEvasion?.chance
        ? `${job.taxEvasion.chance * 100}%`
        : '—';

    const evasionReduction = job.taxEvasion?.reduction
        ? `${job.taxEvasion.reduction * 100}%`
        : '—';

    return new EmbedBuilder()
        .setColor(job.illegal ? '#E74C3C' : '#2ECC71')
        .setTitle(`\`${job.name.toUpperCase()}\``)
        .setDescription(
            `<:flechaderecha:1455684486938362010> \`${job.description.toUpperCase()}\`\n` +
            `\`ESTADO\`: ${job.illegal
                ? '<:rechazado:1453073959842091008> **Ilegal**'
                : '<:verificado:1453073955467563008> **Legal**'}\n\n` +

            `<:expediente:1466915123967820022> \`INFORMACIÓN\`\n` +
            `• \`PROB DE FALLAR:\` **${job.failChance * 100}%**\n` +
            `• \`COOLDOWN:\` **${cooldownMin} MINUTOS**\n\n` +

            `<:expediente:1466915123967820022> \`IMPUESTOS\`\n` +
            `• \`TASA:\` **${taxRate}**\n` +
            `• \`APLICA A:\` **${taxCurrencies}**\n\n` +

            `<:expediente:1466915123967820022> \`EVASIÓN FISCAL\`\n` +
            `• \`PROBABILIDAD:\` **${evasionChance}**\n` +
            `• \`REDUCCIÓN:\` **${evasionReduction}**\n\n` +

            `<:recompensa:1456812362815373396> \`RECOMPENSAS\`\n` +
            `<:dinero:1451695904351457330> \`MONEDAS:\` **${job.rewards.coins.min} – ${job.rewards.coins.max}**\n` +
            `<:xp:1453078768687255845> \`XP:\` **${job.rewards.xp.min} – ${job.rewards.xp.max}**`
        )
        .setFooter({ text: `Trabajo ${page + 1} de ${total}` });
}


