import {
    MessageFlags,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';

import UserLevel from '../Models/UserLevel.js';

export default async function handleLootboxInteraction(client, interaction) {
    try {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false;

        // 🎯 Reclamar caja spawneada
        if (interaction.isButton() && interaction.customId.startsWith('lootbox_claim_')) {
            return await handleLootBoxClaim(client, interaction);
        }

        // 🎁 Comprar caja (mostrar confirmación)
        if (interaction.isButton() && interaction.customId.startsWith('lootbox_buy_')) {
            return await handleLootBoxBuy(client, interaction);
        }

        // ✅ Confirmar compra
        if (interaction.isButton() && interaction.customId.startsWith('lootbox_confirm_buy_')) {
            return await handleLootBoxConfirmBuy(client, interaction);
        }

        if (interaction.isButton() && interaction.customId.startsWith('daily_open_')) {
            return await handleDailyBoxOpen(client, interaction);
        }

        // 📦 Selector de tipo de caja
        if (interaction.isStringSelectMenu() && interaction.customId === 'lootbox_select') {
            return await handleLootBoxSelect(client, interaction);
        }

        return false;

    } catch (error) {
        console.error('❌ Error en LootboxInteractions:', error);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '<:rechazado:1453073959842091008> Error en el sistema de lootboxes.',
                flags: 64
            }).catch(() => { });
        }

        return true;
    }
}

async function handleLootBoxClaim(client, interaction) {
    const lootBoxManager = client.levelManager?.lootBoxManager;
    if (!lootBoxManager) {
        if (!interaction.replied) {
            await interaction.reply({
                content: '<:rechazado:1453073959842091008> Sistema de cajas no disponible.',
                flags: 64
            });
        }
        return true;
    }

    try {
        const handled = await lootBoxManager.handleClaimInteraction(interaction);
        // handled === true significa que ya respondimos
        if (!handled && !interaction.replied) {
            await interaction.reply({
                content: '<:rechazado:1453073959842091008> Esta caja ya no está disponible.',
                flags: 64
            });
        }
    } catch (err) {
        console.error('❌ Error reclamando caja:', err);
        if (!interaction.replied) {
            await interaction.reply({
                content: '<:rechazado:1453073959842091008> Error al reclamar la caja.',
                flags: 64
            });
        }
    }

    return true;
}


async function handleLootBoxBuy(client, interaction) {
    await safeDefer(interaction);

    const boxType = interaction.customId.replace('lootbox_buy_', '');
    const lootBoxManager = client.levelManager?.lootBoxManager;

    if (!lootBoxManager) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Sistema de cajas no disponible.',
            components: []
        });
        return true;
    }

    const boxData = lootBoxManager.boxTypes[boxType];
    if (!boxData) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Tipo de caja inválido.',
            components: []
        });
        return true;
    }

    const user = await UserLevel.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id
    });

    if (!user || user.coins < boxData.cost) {
        await interaction.editReply({
            content: `<:rechazado:1453073959842091008> Necesitas **${boxData.cost} monedas**.`,
            components: []
        });
        return true;
    }

    const embed = new EmbedBuilder()
        .setColor(boxData.color)
        .setTitle(`${boxData.emoji} COMPRAR ${boxData.name}`)
        .setDescription(
            `¿Deseas comprar una **${boxData.name}**?\n\n` +
            `💰 **Precio:** ${boxData.cost} monedas\n` +
            `🎁 **Contenido:** ${lootBoxManager.getBoxContentsPreview(boxData)}`
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`lootbox_confirm_buy_${boxType}`)
            .setLabel('Confirmar compra')
            .setEmoji(boxData.emoji)
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('shop_cancel_purchase')
            .setLabel('Cancelar')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    return true;
}

async function handleLootBoxConfirmBuy(client, interaction) {
    await safeDefer(interaction);

    const boxType = interaction.customId.replace('lootbox_confirm_buy_', '');
    const lootBoxManager = client.levelManager?.lootBoxManager;
    const levelManager = client.levelManager;

    if (!lootBoxManager || !levelManager) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Sistema no disponible.',
            components: []
        });
        return true;
    }

    const boxData = lootBoxManager.boxTypes[boxType];
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    try {
        const user = await UserLevel.findOne({ guildId, userId });
        if (!user) throw new Error('Usuario no encontrado');

        if (user.coins < boxData.cost) {
            throw new Error(`Necesitas ${boxData.cost} monedas`);
        }

        // ❗ Restar monedas en memoria
        user.coins -= boxData.cost;

        const reward = lootBoxManager.selectRandomReward(boxData.rewards);
        let rewardText = '';

        switch (reward.type) {
            case 'coins': {
                const amount = lootBoxManager.getRandomInRange(reward.min, reward.max);
                await levelManager.economyManager.giveCurrency(userId, guildId, 'coins', amount, 'lootbox');
                rewardText = `💰 ${amount} monedas`;
                break;
            }
            case 'tokens': {
                const amount = lootBoxManager.getRandomInRange(reward.min, reward.max);
                await levelManager.economyManager.giveCurrency(userId, guildId, 'tokens', amount, 'lootbox');
                rewardText = `🎫 ${amount} tokens`;
                break;
            }
            case 'boost': {
                await levelManager.boostManager.activateUserBoost(
                    userId,
                    guildId,
                    reward.multiplier,
                    reward.duration / 3600,
                    'Boost de lootbox'
                );
                rewardText = `⚡ Boost x${reward.multiplier} por ${reward.duration / 3600}h`;
                break;
            }
        }

        // ✅ UN SOLO SAVE
        await user.save();

        const embed = new EmbedBuilder()
            .setColor(boxData.color)
            .setTitle(`${boxData.emoji} ¡CAJA ABIERTA!`)
            .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1466092098745794671/tarjeta-de-regalo.png?ex=697b7c2b&is=697a2aab&hm=677111702c7492effde9766d310528b50798300596b706400fb5cbd76b15fdce&")
            .setDescription(`<@${userId}> abrió una **${boxData.name}**\n\n🎁 **Recompensa:** ${rewardText}`);

        await interaction.editReply({ embeds: [embed], components: [] });

    } catch (err) {
        console.error('❌ Error confirmando compra:', err);
        await interaction.editReply({
            content: `<:rechazado:1453073959842091008> ${err.message}`,
            components: []
        });
    }

    return true;
}

async function handleLootBoxSelect(client, interaction) {
    await safeDefer(interaction);

    const boxType = interaction.values[0];
    const lootBoxManager = client.levelManager?.lootBoxManager;

    if (!lootBoxManager || !lootBoxManager.boxTypes[boxType]) {
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Caja inválida.',
            components: []
        });
        return true;
    }

    const box = lootBoxManager.boxTypes[boxType];

    const embed = new EmbedBuilder()
        .setColor(box.color)
        .setTitle(`${box.emoji} ${box.name}`)
        .setDescription(box.description || 'Caja misteriosa')
        .addFields(
            { name: '💰 Precio', value: `${box.cost} monedas`, inline: true },
            { name: '🎲 Probabilidad', value: `${(box.spawnChance * 100).toFixed(2)}%`, inline: true },
            { name: '🎁 Recompensas', value: lootBoxManager.getBoxContentsPreview(box), inline: false }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`lootbox_buy_${boxType}`)
            .setLabel('Comprar')
            .setEmoji(box.emoji)
            .setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    return true;
}

async function handleDailyBoxOpen(client, interaction) {
    //  await safeDefer(interaction);
    await interaction.deferUpdate();


    const [, , targetUserId, boxType] = interaction.customId.split('_');

    if (interaction.user.id !== targetUserId) {
        return interaction.reply({
            content: '<:rechazado:1453073959842091008> Esta caja no es tuya.',
            flags: 64
        }).catch(() => { });
    }

    const lootBoxManager = client.levelManager?.lootBoxManager;
    const levelManager = client.levelManager;

    if (!lootBoxManager || !levelManager) {
        return interaction.editReply({
            content: '<:rechazado:1453073959842091008> Sistema no disponible.',
            components: []
        });
    }

    const boxData = lootBoxManager.boxTypes[boxType];
    if (!boxData) {
        return interaction.editReply({
            content: '<:rechazado:1453073959842091008> Caja inválida.',
            components: []
        });
    }

    try {
        const user = await UserLevel.findOne({ guildId: interaction.guild.id, userId: interaction.user.id });
        if (!user) throw new Error('Usuario no encontrado');

        const reward = lootBoxManager.selectRandomReward(boxData.rewards);
        let rewardText = '';

        switch (reward.type) {
            case 'coins': {
                const amount = lootBoxManager.getRandomInRange(reward.min, reward.max);
                await levelManager.economyManager.giveCurrency(user.id, interaction.guild.id, 'coins', amount, 'daily_box');
                rewardText = `<:dinero:1451695904351457330>  \`${amount} MONEDAS \``;
                break;
            }
            case 'tokens': {
                const amount = lootBoxManager.getRandomInRange(reward.min, reward.max);
                await levelManager.economyManager.giveCurrency(user.id, interaction.guild.id, 'tokens', amount, 'daily_box');
                rewardText = `<:tokens:1451695903080579192>  \`${amount} TOKENS \``;
                break;
            }
            case 'boost': {
                await levelManager.boostManager.activateUserBoost(
                    user.id,
                    interaction.guild.id,
                    reward.multiplier,
                    reward.duration / 3600,
                    'Boost diario'
                );
                rewardText = `⚡ Boost x${reward.multiplier} por ${reward.duration / 3600}h`;
                break;
            }
        }

        await user.save();

        const embed = new EmbedBuilder()
            .setColor(boxData.color)
            .setTitle(`${boxData.emoji} \`¡CAJA DIARIA ABIERTA!\``)
            .setDescription(`<:flechaderecha:1455684486938362010> <@${interaction.user.id}> **RECIBIÓ:** ${rewardText}`)
            .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1464064059497517249/recompensa.png?ex=69741b68&is=6972c9e8&hm=4798bf8a9146506c919f7ea11aa17c3bfb6463493b0ca0e562451aa20a614873&");

        await interaction.message.edit({
            components: []
        }).catch(() => { });

        await interaction.followUp({
            embeds: [embed]
        });

        global.dailyBoxes?.delete(`${interaction.user.id}_${interaction.guild.id}`);

    } catch (error) {
        console.error('❌ Error caja diaria:', error);
        await interaction.editReply({
            content: '<:rechazado:1453073959842091008> Error al abrir la caja.',
            components: []
        });
    }

    return true;
}

async function safeDefer(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate().catch(() => { });
    }
}
