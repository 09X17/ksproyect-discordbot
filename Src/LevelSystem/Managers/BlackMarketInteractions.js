import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';

export default async function handleBlackMarketInteraction(client, interaction) {
    try {
        if (!interaction.isButton()) return false;

        // ================= GAMBLE =================
        if (interaction.customId.startsWith('bm_gamble_')) {
            return await handleGambleButton(client, interaction);
        }

        // ================= BAIL CONFIRM =================
        if (interaction.customId.startsWith('bm_bail_confirm_')) {
            return await handleBailConfirm(client, interaction);
        }

        if (interaction.customId === 'bm_bail_cancel') {
            await interaction.deferUpdate();
            await interaction.editReply({
                content: '❌ Pago de fianza cancelado.',
                components: []
            });
            return true;
        }

        return false;

    } catch (err) {
        console.error('❌ Error en blackmarket.interactions:', err);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: '❌ Error en el mercado negro.',
                flags: MessageFlags.Ephemeral
            }).catch(() => { });
        }
        return true;
    }

    async function handleGambleButton(client, interaction) {
        const [_, __, ownerId, action] = interaction.customId.split('_');

        // 🔒 Seguridad
        if (interaction.user.id !== ownerId) {
            return interaction.reply({
                content: '⛔ Este juego no es tuyo.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferUpdate();

        const state = interaction.message.bmState;
        if (!state || state.finished) return true;

        const bm = client.levelManager.blackMarketManager;

        // 🔁 DOBLAR
        if (action === 'double') {
            state.amount *= 2;
            state.round++;

            const result = await bm.gamble(
                interaction.user.id,
                interaction.guild.id,
                state.amount,
                state.currency
            );

            if (result.result?.raid) {
                state.finished = true;

                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#8E44AD')
                            .setTitle('🚨 REDADA POLICIAL')
                            .setDescription(
                                `💸 Confiscado:\n` +
                                `• Monedas: **-${result.result.raid.coinsLost}**\n` +
                                `• Tokens: **-${result.result.raid.tokensLost}**\n\n` +
                                `🚔 Has sido enviado a la cárcel.`
                            )
                    ],
                    components: []
                });
            }

            return updateGambleUI(interaction, state);
        }

        // 💰 RETIRARSE
        if (action === 'cashout') {
            state.finished = true;

            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#2ECC71')
                        .setTitle('💰 TE RETIRASTE')
                        .setDescription(
                            `Cobraste **${state.amount} ${state.currency}**\n` +
                            `🔥 Rondas jugadas: **${state.round}**`
                        )
                ],
                components: []
            });
        }
    }

    function updateGambleUI(interaction, state) {
        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🎲 APUESTA ILEGAL')
            .setDescription(
                `💸 **Apuesta actual:** ${state.amount} ${state.currency}\n` +
                `🔥 **Ronda:** ${state.round}\n\n` +
                `¿Quieres doblar o retirarte?`
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`bm_gamble_${state.userId}_double`)
                .setLabel('Doblar')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId(`bm_gamble_${state.userId}_cashout`)
                .setLabel('Retirarse')
                .setEmoji('💰')
                .setStyle(ButtonStyle.Success)
        );

        interaction.message.bmState = state;

        return interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }


}

