import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import UserPerk from '../../../LevelSystem/Models/UserPerk.js';

export default class ActivateSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('activar-perk')
                .setDescription('Activa uno de tus perks')
                .addStringOption(option =>
                    option
                        .setName('perk')
                        .setDescription('Perk a activar')
                        .setRequired(true)
                        .setAutocomplete(true)
                ),
            cooldown: 3,
            category: 'niveles'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const perkName = interaction.options.getString('perk');
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            const perk = await UserPerk.findOne({
                userId,
                guildId,
                name: new RegExp(`^${perkName}$`, 'i'),
                active: true
            });

            if (!perk) {
                return interaction.editReply({
                    content: '❌ No se encontró el perk especificado o no está disponible.',
                    flags: 64
                });
            }

            // Verificar si puede activarse
            if (!perk.canActivate()) {
                let reason = 'No se puede activar en este momento';
                if (perk.expiresAt && perk.expiresAt < new Date()) {
                    reason = 'Este perk ha expirado';
                } else if (perk.limitations.maxActivations > 0 &&
                    perk.stats.activations >= perk.limitations.maxActivations) {
                    reason = `Límite de usos alcanzado (${perk.limitations.maxActivations})`;
                } else if (perk.limitations.cooldown > 0 && perk.stats.lastActivated) {
                    const cooldownEnd = new Date(perk.stats.lastActivated);
                    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + perk.limitations.cooldown);
                    if (cooldownEnd > new Date()) {
                        const minutesLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60));
                        reason = `En enfriamiento (${minutesLeft} minutos restantes)`;
                    }
                }

                return interaction.editReply({
                    content: `❌ ${reason}.`,
                    flags: 64
                });
            }

            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, userId);

            const confirmEmbed = this.createConfirmationEmbed(perk, userLevel);

            const confirmMenu = this.createConfirmationMenu(perk._id.toString());

            await interaction.editReply({
                embeds: [confirmEmbed],
                components: [confirmMenu]
            });

        } catch (error) {
            client.logger.error('Error en comando activar-perk:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al activar el perk.',
                flags: 64
            });
        }
    }

    createConfirmationEmbed(perk, userLevel) {
        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('⚡ Confirmar Activación')
            .setDescription(`Estás a punto de activar **${perk.name}**`)
            .addFields(
                {
                    name: '📋 Detalles del Perk',
                    value: [
                        `**Nombre:** ${perk.name}`,
                        `**Descripción:** ${perk.description}`,
                        `**Tier:** ${perk.tier}`,
                        `**Rareza:** ${perk.metadata.rarity}`,
                        `**Tipo:** ${perk.type}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚡ Efectos',
                    value: this.getEffectsDescription(perk.effects),
                    inline: true
                },
                {
                    name: '📊 Estadísticas',
                    value: [
                        `**Usos actuales:** ${perk.stats.activations}`,
                        `**Límite de usos:** ${perk.limitations.maxActivations === -1 ? 'Ilimitado' : perk.limitations.maxActivations}`,
                        `**Duración:** ${perk.limitations.duration ? `${perk.limitations.duration} horas` : 'Permanente'}`,
                        `**Enfriamiento:** ${perk.limitations.cooldown ? `${perk.limitations.cooldown} minutos` : 'Ninguno'}`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();

        // Mostrar tiempo restante si tiene expiración
        if (perk.expiresAt) {
            const timeLeft = this.getTimeUntil(perk.expiresAt);
            embed.addFields({
                name: '⏰ Tiempo Restante',
                value: timeLeft,
                inline: false
            });
        }

        return embed;
    }

    createConfirmationMenu(perkId) {
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`activate_confirm_${perkId}`)
                    .setPlaceholder('Selecciona una opción')
                    .addOptions([
                        {
                            label: '✅ Confirmar activación',
                            description: 'Activar este perk',
                            value: 'confirm',
                            emoji: '⚡'
                        },
                        {
                            label: '❌ Cancelar',
                            description: 'No activar este perk',
                            value: 'cancel',
                            emoji: '❌'
                        }
                    ])
            );

        return row;
    }

    getEffectsDescription(effects) {
        let description = '';

        if (effects.xpMultiplier && effects.xpMultiplier !== 1.0) {
            description += `• Multiplicador de XP: ${effects.xpMultiplier}x\n`;
        }

        if (effects.xpFlatBonus && effects.xpFlatBonus > 0) {
            description += `• Bonus de XP: +${effects.xpFlatBonus}\n`;
        }

        if (effects.currencyMultiplier && effects.currencyMultiplier !== 1.0) {
            description += `• Multiplicador de monedas: ${effects.currencyMultiplier}x\n`;
        }

        if (effects.cooldownReduction && effects.cooldownReduction > 0) {
            description += `• Reducción de enfriamiento: ${effects.cooldownReduction}%\n`;
        }

        if (effects.specialAbility) {
            description += `• Habilidad especial: ${effects.specialAbility}\n`;
        }

        return description || 'Sin efectos especiales';
    }

    getTimeUntil(date) {
        const seconds = Math.floor((new Date(date) - new Date()) / 1000);

        if (seconds <= 0) return 'Expirado';

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    // Autocompletar para nombres de perks
    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused();
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            // Buscar perks del usuario que coincidan
            const perks = await UserPerk.find({
                userId,
                guildId,
                name: new RegExp(focusedValue, 'i'),
                active: true
            })
                .limit(25)
                .select('name tier metadata.rarity')
                .lean();

            const choices = perks.map(perk => ({
                name: `${perk.name} (Tier ${perk.tier}) [${perk.metadata.rarity}]`,
                value: perk.name
            }));

            await interaction.respond(choices);

        } catch (error) {
            client.logger.error('Error en autocomplete de activar-perk:', error);
        }
    }
}