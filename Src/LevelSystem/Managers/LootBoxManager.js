import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from 'discord.js';
import UserLevel from '../Models/UserLevel.js';
import { boxTypes } from './boxTypesConfig.js';

export default class LootBoxManager {
    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
        this.activeBoxes = new Map();
        this.userCooldowns = new Map();
        this.boxCooldown = 30000;
        this.boxTypes = boxTypes;
    }

    async spawnBox(guildId, channel, boxType, triggerMessage) {
        try {
            const boxData = this.boxTypes[boxType];
            const isDivineJudgment = boxType === 'divine_2';

            if (!boxData) return;

            const boxId = `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const embed = isDivineJudgment
                ? new EmbedBuilder()
                    .setColor('#FFFFFF')
                    .setTitle('<:divino:1468758685017837588> `EL JUICIO DIVINO HA DESCENDIDO` ⚖️')
                    .setDescription(
                        `<:luna:1468314641934451022> **Una fuerza superior observa este canal…**\n\n` +
                        `<:cajaderegalo:1457062998374879293> **CAJA:** ${boxData.name.toUpperCase()}\n` +
                        `<:relojdearena:1457064155067449364> **DURACIÓN:** ${boxData.duration / 1000}s\n`
                    )
                    .setThumbnail('https://cdn.discordapp.com/attachments/1058474621835411526/1468759265350127748/luna.png?ex=69853029&is=6983dea9&hm=797a5282a5e823683e07f17a9ad69cb2aa7fbaf0d5f9adab506c7aae5a8b8976&')
                : new EmbedBuilder()
                    .setColor(boxData.color)
                    .setTitle(`${boxData.emoji} \`¡APARECIÓ UNA CAJA!\``)
                    .setDescription(`<:flechaderecha:1455684486938362010> \`TIPO DE CAJA:\` **${boxData.name.toUpperCase()}**`)
                    .addFields(
                        { name: '**```CONTENIDO POTENCIAL```**', value: this.getBoxContentsPreview(boxData), inline: false },
                        { name: '**```TIEMPO RESTANTE```**', value: `\`${boxData.duration / 1000}s\``, inline: false }
                    );


            const claimButton = new ButtonBuilder()
                .setCustomId(`lootbox_claim_${boxId}`)
                .setLabel('¡RECLAMAR CAJA!')
                .setStyle(ButtonStyle.Success)
                .setEmoji('<:cajaderegalo:1457062998374879293>');

            const row = new ActionRowBuilder().addComponents(claimButton);

            const boxMessage = await channel.send({
                embeds: [embed],
                components: [row]
            });

            this.activeBoxes.set(guildId, {
                boxId,
                messageId: boxMessage.id,
                channelId: channel.id,
                boxType,
                boxData,
                claimedBy: null,
                spawnTime: Date.now(),
                expiresAt: Date.now() + boxData.duration,
                triggerUserId:
                    triggerMessage?.author?.id ??
                    triggerMessage?.user?.id ??
                    'system'

            });

            setTimeout(() => {
                this.handleBoxExpiration(guildId, boxId, channel);
            }, boxData.duration);

            this.startCountdownUpdate(guildId, boxId, boxMessage, embed);

            this.client.logger.info(`BOX: ${boxType} | SPAWN: ${guildId}/${channel.id}`);

        } catch (error) {
            this.client.logger.error('❌ Error spawnando caja:', error.stack);
        }
    }

    getBoxContentsPreview(boxData) {
        const previews = [];

        boxData.rewards.forEach(reward => {
            let preview = '';
            switch (reward.type) {
                case 'coins':
                    preview = `<:dinero:1451695904351457330> **${reward.min}-${reward.max} MONEDAS**`;
                    break;
                case 'tokens':
                    preview = `<:tokens:1451695903080579192> **${reward.min}-${reward.max} TOKENS**`;
                    break;
                case 'badge':
                    preview = `🏆 ${reward.name || 'Insignia especial'}`;
                    break;
                case 'role':
                    preview = `👑 ${reward.name || 'Rol exclusivo'}`;
                    break;
                case 'small_boost':
                case 'medium_boost':
                case 'legendary_boost':
                    preview = `⚡ Boost x${reward.multiplier} por ${reward.duration / 3600}h`;
                    break;
            }
            if (preview) previews.push(preview);
        });

        return previews.slice(0, 5).join('\n') + (previews.length > 5 ? '\n ...y más!' : '');
    }

    startCountdownUpdate(guildId, boxId, message, originalEmbed) {
        const updateInterval = setInterval(async () => {
            const boxInfo = this.activeBoxes.get(guildId);
            if (!boxInfo || boxInfo.boxId !== boxId) {
                clearInterval(updateInterval);
                return;
            }

            const timeLeft = Math.max(0, boxInfo.expiresAt - Date.now());
            const secondsLeft = Math.ceil(timeLeft / 1000);

            if (secondsLeft <= 0 || boxInfo.claimedBy) {
                clearInterval(updateInterval);
                return;
            }

            const updatedEmbed = EmbedBuilder.from(originalEmbed.data);
            updatedEmbed.spliceFields(1, 1, {
                name: '**```TIEMPO RESTANTE```**',
                value: `\`${secondsLeft}s\``,
                inline: true
            });

            try {
                await message.edit({ embeds: [updatedEmbed] });
            } catch (error) {
                clearInterval(updateInterval);
            }
        }, 5000);
    }

    async handleClaimInteraction(interaction) {
        if (!interaction.isButton()) return false;

        const customId = interaction.customId;
        if (!customId.startsWith('lootbox_claim_')) return false;

        const boxId = customId.replace('lootbox_claim_', '');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const boxInfo = this.activeBoxes.get(guildId);
        if (!boxInfo || boxInfo.boxId !== boxId) {
            await interaction.reply({
                content: '❌ Esta caja ya no está disponible.',
                flags: 64
            });
            return true;
        }

        if (boxInfo.claimedBy) {
            await interaction.reply({
                content: `⚠️ Esta caja ya fue reclamada por <@${boxInfo.claimedBy}>`,
                flags: 64
            });
            return true;
        }

        // Marcar como reclamada
        boxInfo.claimedBy = userId;

        // Procesar recompensa (ignora el inventario porque es una caja del chat)
        await this.giveBoxReward(interaction, boxInfo, true);

        return true;
    }

    async giveBoxReward(interaction, boxInfo, ignoreInventory = false) {
        try {
            const userId = boxInfo.claimedBy;
            const guildId = interaction.guild.id;
            const boxType = boxInfo.boxType;
            const boxData = boxInfo.boxData;

            // Obtener usuario
            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);

            // ================== ABRIR CAJA (AHORA ES ASYNC) ==================
            let openResult;
            try {
                openResult = await userLevel.openLootBox(boxType, this.levelManager, ignoreInventory);
            } catch (error) {
                return interaction.reply({
                    content: `❌ ${error.message}`,
                    flags: 64
                });
            }

            // ================== PROCESAR RECOMPENSAS ==================
            let rewardDescriptions = [];
            let totalValue = 0;

            for (const [rewardType, amount] of Object.entries(openResult.rewards)) {
                switch (rewardType) {
                    case 'coins': {
                        await this.levelManager.giveCurrency(
                            userId, guildId, 'coins', amount, 'lootbox'
                        );
                        rewardDescriptions.push(
                            `<:dinero:1451695904351457330> **${amount} MONEDAS**`
                        );
                        totalValue += amount;
                        break;
                    }

                    case 'tokens': {
                        await this.levelManager.giveCurrency(
                            userId, guildId, 'tokens', amount, 'lootbox'
                        );
                        rewardDescriptions.push(
                            `<:tokens:1451695903080579192> **${amount} TOKENS**`
                        );
                        totalValue += amount * 100;
                        break;
                    }

                    case 'random_box': {
                        rewardDescriptions.push(
                            `<:cajaderegalo:1457062998374879293> **Caja ${amount.toUpperCase()} adicional**`
                        );

                        // Spawn la caja adicional después de 10 segundos
                        setTimeout(() => {
                            const nextBoxType = Object.keys(this.boxTypes).find(
                                key => this.boxTypes[key].name === amount
                            );
                            if (nextBoxType) {
                                this.spawnBox(guildId, interaction.channel, nextBoxType, interaction);
                            }
                        }, 10000);
                        break;
                    }
                }
            }

            // ================== EMBED DE RESULTADO ==================
            const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                .setTitle('<:cajaderegalo:1457062998374879293> `¡CAJA ABIERTA!`')
                .setThumbnail(
                    'https://cdn.discordapp.com/attachments/1261326873237913711/1466092098745794671/tarjeta-de-regalo.png'
                )
                .setDescription(
                    `<:flechaderecha:1455684486938362010> <@${userId}> abrió **${boxData.name.toUpperCase()}**`
                )
                .spliceFields(0, 2, {
                    name: '<:recompensa:1456812362815373396> `RECOMPENSAS OBTENIDAS:`',
                    value: rewardDescriptions.join('\n') || 'Sin recompensas',
                    inline: false
                });

            // ================== DESACTIVAR BOTONES ==================
            const components = interaction.message.components?.[0]?.components || [];
            const row = new ActionRowBuilder({
                components: components.map(btn =>
                    ButtonBuilder.from(btn).setDisabled(true)
                )
            });

            await interaction.update({
                embeds: [updatedEmbed],
                components: [row]
            });

            // ================== STATS ==================
            //     await this.recordBoxStats(guildId, userId, boxType, totalValue);

            // Limpiar del mapa de cajas activas
            setTimeout(() => {
                this.activeBoxes.delete(guildId);
            }, 30000);

        } catch (error) {
            this.client.logger.error('❌ Error dando recompensa de caja:', error.stack);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: `❌ Error procesando la recompensa`,
                    flags: 64
                });
            }
        }
    }

    selectRandomReward(rewards) {
        const pool = rewards.filter(r => typeof r.weight === 'number' && r.weight > 0);
        if (!pool.length) return null;

        const totalWeight = pool.reduce((a, b) => a + b.weight, 0);
        let random = Math.random() * totalWeight;

        for (const reward of pool) {
            random -= reward.weight;
            if (random <= 0) return reward;
        }

        return pool[pool.length - 1];
    }


    getTotalWeight(rewards) {
        return rewards.reduce((sum, reward) => sum + (reward.weight || 1), 0);
    }

    getRandomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async handleBoxExpiration(guildId, boxId, channel) {
        const boxInfo = this.activeBoxes.get(guildId);
        if (!boxInfo || boxInfo.boxId !== boxId || boxInfo.claimedBy) return;

        const expiredEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('<:cajaderegalo:1457062998374879293> \`CAJA EXPIRADA\`')
            .setDescription(`<:flechaderecha:1455684486938362010> La **${boxInfo.boxData.name.toUpperCase()}** Ha expirado sin ser reclamada.`)


        try {
            const message = await channel.messages.fetch(boxInfo.messageId).catch(() => null);
            if (message) {
                await message.edit({
                    content: '<:relojdearena:1457064155067449364> **¡TIEMPO AGOTADO!**',
                    embeds: [expiredEmbed],
                    components: []
                });
            }

            // Eliminar después de un tiempo
            setTimeout(() => {
                if (message) message.delete().catch(() => { });
            }, 30000);

        } catch (error) {
            // Ignorar errores de mensaje no encontrado
        }

        this.activeBoxes.delete(guildId);
    }

    async isOnCooldown(userId, guildId, config) {
        try {
            const userLevel = await UserLevel.findOne({ guildId, userId }).select('xpCooldown');

            if (!userLevel || !userLevel.xpCooldown) {
                return false;
            }

            const now = Date.now();
            const cooldownEnd = new Date(userLevel.xpCooldown).getTime() +
                (config.levelSettings.messageXP.cooldown * 1000);

            if (now < cooldownEnd) {
                const remainingSeconds = Math.ceil((cooldownEnd - now) / 1000);
                return {
                    onCooldown: true,
                    remainingSeconds: remainingSeconds,
                    cooldownEnd: new Date(cooldownEnd)
                };
            }

            await UserLevel.updateOne(
                { guildId, userId },
                { $set: { xpCooldown: null } }
            );

            return false;

        } catch (error) {
            this.client.logger.error('❌ Error en isOnCooldown:', error);
            return false;
        }
    }


    isUserOnCooldown(userId) {
        const last = this.userCooldowns.get(userId);
        if (!last) return false;
        return Date.now() - last < this.boxCooldown;
    }

    setUserCooldown(userId) {
        this.userCooldowns.set(userId, Date.now());
    }

    hasActiveBoxInChannel(guildId, channelId) {
        const boxInfo = this.activeBoxes.get(guildId);
        if (!boxInfo) return false;

        return boxInfo.channelId === channelId;
    }


    async recordBoxStats(guildId, userId, boxType, value = 0) {
        try {
            const UserLevel = mongoose.model('UserLevel');
            await UserLevel.updateOne(
                { guildId, userId },
                {
                    $inc: {
                        'stats.boxes.opened': 1,
                        [`stats.boxes.${boxType}`]: 1,
                        'stats.boxes.totalValue': value
                    },
                    $setOnInsert: {
                        'stats.boxes': {
                            opened: 0,
                            common: 0,
                            rare: 0,
                            epic: 0,
                            legendary: 0,
                            mystery: 0,
                            mythic: 0,
                            divine: 0,
                            totalValue: 0
                        }
                    }
                },
                { upsert: true }
            );
        } catch (error) {
            this.client.logger.error('❌ Error registrando stats de lootbox:', error);
        }
    }

    async getBoxStats(userId, guildId) {
        try {
            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            const boxStats = userLevel.stats?.boxes || {};

            return {
                totalOpened: boxStats.opened || 0,
                byType: {
                    common: boxStats.common || 0,
                    rare: boxStats.rare || 0,
                    legendary: boxStats.legendary || 0,
                    mystery: boxStats.mystery || 0
                },
                totalValue: boxStats.totalValue || 0,
                luckPercentage: this.calculateLuckPercentage(boxStats)
            };
        } catch (error) {
            return { error: 'No se pudieron obtener estadísticas' };
        }
    }

    calculateLuckPercentage(boxStats) {
        if (!boxStats.opened || boxStats.opened < 10) return 50;

        const expectedLegendary = boxStats.opened * 0.005;
        const actualLegendary = boxStats.legendary || 0;

        if (expectedLegendary === 0) return 50;

        const luck = (actualLegendary / expectedLegendary) * 100;
        return Math.min(Math.max(luck, 0), 200);
    }

    async spawnBoxCommand(interaction, boxType = null) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '❌ Solo administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const type = boxType || this.determineBoxType();
        await this.spawnBox(interaction.guild.id, interaction.channel, type, interaction);

        return interaction.reply({
            content: `✅ Caja **${this.boxTypes[type].name}** aparecida manualmente.`,
            flags: MessageFlags.Ephemeral
        });
    }

    resolveLoot(boxData, userStats = {}) {
        const results = {
            rewards: [],
            luckyMultiplier: 1,
            isLucky: false,
            isJackpot: false,
            pityUpgrade: null
        };

        // 🍀 LUCKY STRIKE
        if (boxData.lucky && Math.random() < boxData.lucky.chance) {
            results.isLucky = true;
            results.luckyMultiplier = this.getRandomInRange(
                boxData.lucky.minMultiplier,
                boxData.lucky.maxMultiplier
            );
        }

        // 🎁 EXTRA DROPS
        let drops = 1;
        if (boxData.extraDrops && Math.random() < boxData.extraDrops.chance) {
            drops += this.getRandomInRange(1, boxData.extraDrops.maxExtra);
        }

        // 🎲 DROPS NORMALES
        for (let i = 0; i < drops; i++) {
            results.rewards.push(
                this.selectRandomReward(boxData.rewards)
            );
        }

        // 💎 JACKPOT
        if (boxData.jackpot && Math.random() < boxData.jackpot.chance) {
            results.isJackpot = true;
            results.rewards.push({
                ...boxData.jackpot.reward,
                jackpot: true
            });
        }

        // 😈 PITY (evolución)
        if (boxData.pity && userStats.failedOpens >= boxData.pity.threshold) {
            results.pityUpgrade = boxData.pity.upgradeTo;
        }

        return results;
    }

}