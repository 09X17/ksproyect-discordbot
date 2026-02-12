import {
    SlashCommandBuilder,
    EmbedBuilder, PermissionFlagsBits, 
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

const getTipoNombre = (tipo) => {
    const tipos = {
        'xp_multiplier': 'Multiplicador de XP',
        'coin_multiplier': 'Multiplicador de Monedas',
        'token_bonus': 'Bonus de Tokens',
        'sale': 'Rebajas en Tienda',
        'custom': 'Personalizado'
    };
    return tipos[tipo] || tipo;
};

export default class ViewEventsCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('view-events')
                .setDescription('Ve los eventos configurados en el servidor'),
            cooldown: 5,
            category: 'levels',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        try {
            if (!client.levelManager?.eventManager) {
                return interaction.reply({
                    content: '❌ El sistema de eventos no está disponible en este momento.',
                    flags: 64
                });
            }

            const eventManager = client.levelManager.eventManager;
            const guildId = interaction.guild.id;

            const activeEvents = await eventManager.getActiveEvents(guildId);

            let filteredEvents = [];
            if (Array.isArray(activeEvents)) {
                filteredEvents = activeEvents.filter(event =>
                    !event.guildId || event.guildId === guildId
                );
            } else {

                const guildEvents = await eventManager.getGuildEvents(guildId, false);
                filteredEvents = guildEvents.filter(event => event.active);
            }

            if (!filteredEvents || filteredEvents.length === 0) {
                return interaction.reply({
                    content: '📭 No hay eventos activos en este servidor.',
                    flags: 64
                });
            }

            const embed = new EmbedBuilder()
                .setTitle('<:evento:1456812819105321144> `EVENTOS ACTIVOS`')
                .setColor("#CAB3FF")
                .setDescription('<:informacion:1456828988361146490> __¡Participa para ganar recompensas especiales!__\n' + `<:flechaderecha:1455684486938362010> \`TOTAL:\` **${filteredEvents.length} Evento${filteredEvents.length !== 1 ? 's' : ''} Activo${filteredEvents.length !== 1 ? 's' : ''}**`)

            filteredEvents.forEach(event => {
                let benefitText = '';

                switch (event.type) {
                    case 'xp_multiplier':
                        benefitText = `XP x${event.multiplier}`;
                        break;
                    case 'coin_multiplier':
                        benefitText = `Monedas x${event.multiplier}`;
                        break;
                    case 'token_bonus':
                        benefitText = `+${event.bonus} tokens`;
                        break;
                    case 'sale':
                        const discountPercent = Math.round((event.discount || 0.2) * 100);
                        benefitText = `${discountPercent}% descuento`;
                        break;
                    default:
                        benefitText = 'Recompensas especiales';
                }

                let fieldValue = `<:etiqueta:1453099849355493396> __${event.description || 'Sin descripción'}__\n`;
                fieldValue += `<:flechaderecha:1455684486938362010> **Tipo:** \`${getTipoNombre(event.type)}\`\n`;
                fieldValue += `<:flechaderecha:1455684486938362010> **Beneficio:** \`${benefitText}\`\n`;

                if (event.endDate) {
                    const endTimestamp = Math.floor(new Date(event.endDate).getTime() / 1000);
                    fieldValue += `<:relojdearena:1457064155067449364> **Termina:** <t:${endTimestamp}:R>`;
                } else if (event.durationHours) {
                    fieldValue += `**Duración:** ${event.durationHours} horas`;
                }

                if (event.eventId) {
                    fieldValue += `\n**ID:** \`${event.eventId}\``;
                }

                embed.addFields({
                    name: `**\`\`\`${event.name.toUpperCase()}\`\`\`**`,
                    value: fieldValue,
                    inline: false
                });
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error en view-events:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al mostrar los eventos.',
                flags: 64
            });
        }
    }
}