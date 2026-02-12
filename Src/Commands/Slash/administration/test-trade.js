// test-trade-command.js
import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class TestTradeCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('test-trade')
                .setDescription('Prueba el sistema de trade (solo desarrollo)')
                .setDefaultMemberPermissions('0'),

            cooldown: 0,
            category: 'dev',
            userPermissions: [],
            botPermissions: []
        });
    }

    async execute(client, interaction) {
        try {
            // Solo tú puedes usar este comando (reemplaza con tu ID)
            if (interaction.user.id !== '458083324842213376') {
                return interaction.reply({
                    content: '❌ Solo el desarrollador puede usar este comando.',
                    flags: MessageFlags.Ephemeral
                });
            }
            
            // Crear un trade simulado
            const tradeId = `test_${Date.now()}`;
            const fakeUserId = '123456789012345678'; // ID falso
            
            // Simular el mensaje de trade
            const embed = new EmbedBuilder()
                .setColor('#F4B400')
                .setTitle('🤝 INTERCAMBIO PROPUESTO (PRUEBA)')
                .setDescription(
                    `<@${interaction.user.id}> quiere intercambiar con <@${fakeUserId}>\n\n` +
                    `**📤 OFERTA DE TU_NOMBRE:**\n` +
                    `> ⭐ **1,000 XP**\n\n` +
                    `**🤔 ¿QUÉ QUIERES A CAMBIO?**\n` +
                    `El otro usuario seleccionará qué te dará a cambio.`
                )
                .addFields(
                    {
                        name: '⏰ TIEMPO RESTANTE',
                        value: '`15:00`',
                        inline: true
                    },
                    {
                        name: '📝 ESTADO',
                        value: '`Esperando respuesta...`',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: `ID: ${tradeId.slice(0, 8)} • USO: TEST`
                })
                .setTimestamp();
            
            // Botones de prueba
            const tradeRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`trade_accept_${tradeId}`)
                        .setLabel('Simular aceptar')
                        .setEmoji('✅')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`trade_decline_${tradeId}`)
                        .setLabel('Simular rechazar')
                        .setEmoji('❌')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`trade_view_${tradeId}`)
                        .setLabel('Ver detalles')
                        .setEmoji('📊')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            // Almacenar en cache (simulado)
            if (!client.activeTrades) client.activeTrades = new Map();
            
            client.activeTrades.set(tradeId, {
                id: tradeId,
                initiatorId: interaction.user.id,
                targetId: fakeUserId,
                guildId: interaction.guild.id,
                resourceType: 'xp',
                amount: 1000,
                messageId: 'test_message',
                channelId: interaction.channel.id,
                createdAt: Date.now(),
                status: 'pending',
                initiatorOffer: { type: 'xp', amount: 1000 },
                targetOffer: null,
                expiresAt: Date.now() + (15 * 60 * 1000),
                isTest: true // Marcar como prueba
            });
            
            await interaction.reply({
                content: '✅ **MODO PRUEBA ACTIVADO**\n\nPuedes probar todos los botones del trade. Recuerda que esto es solo una simulación y no afectará tus recursos reales.',
                embeds: [embed],
                components: [tradeRow],
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Error en test-trade:', error);
            return interaction.reply({
                content: '❌ Error en la prueba.',
                flags: MessageFlags.Ephemeral
            });
        }
    }
}