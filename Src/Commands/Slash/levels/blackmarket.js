import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';

export default class BlackMarketSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('blackmarket')
                .setDescription('🕶️ Mercado negro y actividades ilegales')

                // INFO
                .addSubcommand(sub =>
                    sub
                        .setName('info')
                        .setDescription('Ve tu estado en el mercado negro')
                )

                // GAMBLE
                .addSubcommand(sub =>
                    sub
                        .setName('gamble')
                        .setDescription('Realizar una apuesta ilegal')
                        .addIntegerOption(opt =>
                            opt
                                .setName('amount')
                                .setDescription('Cantidad a apostar')
                                .setRequired(true)
                                .setMinValue(5000)
                        )
                        .addStringOption(opt =>
                            opt
                                .setName('currency')
                                .setDescription('Moneda a usar')
                                .addChoices(
                                    { name: 'Monedas', value: 'coins' },
                                    { name: 'Tokens', value: 'tokens' }
                                )
                        )
                )

                // HEAT
                .addSubcommand(sub =>
                    sub
                        .setName('heat')
                        .setDescription('Revisa tu nivel de sospecha policial')
                )

                // BAIL
                .addSubcommand(sub =>
                    sub
                        .setName('bail')
                        .setDescription('Paga la fianza si estás en la cárcel')
                )

                // STATS
                .addSubcommand(sub =>
                    sub
                        .setName('stats')
                        .setDescription('Ver estadísticas criminales')
                )

                // LAUNDER
                .addSubcommand(sub =>
                    sub
                        .setName('launder')
                        .setDescription('Lava dinero para reducir tu sospecha policial')
                ),

            cooldown: 5,
            category: 'illegal'
        });
    }

    /**
     * Obtiene el nombre de display del usuario
     * @private
     */
    _getUserDisplayName(user) {
        return user.globalName?.toUpperCase() || user.username.toUpperCase();
    }

    /**
     * URL del thumbnail del mercado negro
     * @private
     */
    _getThumbnailUrl() {
        return "https://cdn.discordapp.com/attachments/1261326873237913711/1469344647875789004/ilegal.png?ex=69875157&is=6985ffd7&hm=43ce236a6bf02b072482da76aaf99cfcb5709c27d6fffd446b28149294ba2a1a&";
    }

    /**
     * Convierte fecha a timestamp de Discord
     * @private
     */
    _toDiscordTimestamp(date, format = 'R') {
        if (!(date instanceof Date)) return 'DESCONOCIDO';
        return `<t:${Math.floor(date.getTime() / 1000)}:${format}>`;
    }


    /**
     * Calcula el nivel de riesgo según el heat
     * @private
     */
    _getRiskLevel(heat) {
        if (heat >= 85) return '<:84242faceit10lvl:1452459342036078813> EXTREMO';
        if (heat >= 60) return '<:60848faceit9level:1452459336487010374> ALTO';
        if (heat >= 30) return '<:68460faceit6lvl:1452459340782108996> MEDIO';
        return '<:35622faceit3lvl:1452459330984214674> BAJO';
    }

    /**
     * Crea un embed base con configuración común
     * @private
     */
    _createBaseEmbed(user, title) {
        return new EmbedBuilder()
            .setTitle(`<:flechaizq:1469346308455272640> \`${title.toUpperCase()} DE: ${this._getUserDisplayName(user)}\``)
            .setThumbnail(this._getThumbnailUrl());
    }

    /**
     * Maneja la respuesta de error
     * @private
     */
    _handleError(interaction, message = 'Ocurrió un error en el mercado negro.') {
        return interaction.reply({
            content: `<:cancelar:1469343007554928641> ${message}`,
            flags: 64
        });
    }

    /**
     * Formatea el nombre de la moneda
     * @private
     */
    _formatCurrency(currency) {
        return currency === 'coins' ? 'monedas' : 'tokens';
    }

    /**
     * Maneja el subcomando INFO
     * @private
     */
    async _handleInfo(interaction, bm, userId, guildId) {
        const data = await bm.getStatus(userId, guildId);

        const embed = this._createBaseEmbed(interaction.user, 'ESTADO CRIMINAL')
            .setColor('#2C2F33')
            .setDescription(
                `\`SOSPECHA:\` **${data.heat}/100**\n` +
                `\`EN CÁRCEL:\` **${data.jailed ? 'SÍ' : 'NO'}**\n` +
                `\`BANEADO:\` **${data.bannedUntil ? this._toDiscordTimestamp(data.bannedUntil) : 'NO'}**`
            );

        if (data.jailed && data.jailUntil) {
            embed.addFields({
                name: '<:carcel:1469342726830161950> \`CÁRCEL:\`',
                value: `**Sales en: ${this._toDiscordTimestamp(data.jailUntil)}**`
            });
        }

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja el subcomando HEAT
     * @private
     */
    async _handleHeat(interaction, bm, userId, guildId) {
        const { heat } = await bm.getStatus(userId, guildId);
        const risk = this._getRiskLevel(heat);

        const embed = this._createBaseEmbed(interaction.user, 'NIVEL DE SOSPECHA')
            .setColor('#E67E22')
            .setDescription(
                `\`SOSPECHA:\` **${heat}/100**\n` +
                `\`RIESGO DE REDADA:\` **${risk}**`
            );

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja el subcomando GAMBLE
     * @private
     */
    async _handleGamble(interaction, bm, userId, guildId) {
        const amount = interaction.options.getInteger('amount');
        const currency = interaction.options.getString('currency') || 'coins';

        // Validación de mínimo (aunque Discord ya lo valida con minValue)
        if (currency === 'coins' && amount < 5000) {
            return this._handleError(interaction, 'La apuesta mínima con **MONEDAS** es **5000**.');
        }

        const result = await bm.gamble(userId, guildId, amount, currency);

        // Manejar errores
        if (!result.success) {
            return this._handleGambleError(interaction, result);
        }

        // Crear embed según resultado
        return this._handleGambleSuccess(interaction, result, amount, currency);
    }

    /**
     * Maneja los errores del gamble
     * @private
     */
    _handleGambleError(interaction, result) {
        const errorMessages = {
            jailed: `Estás en la cárcel hasta ${this._toDiscordTimestamp(result.until)}`,
            banned: `Estás baneado del mercado negro hasta ${this._toDiscordTimestamp(result.until)}`,
            insufficient_funds: 'No tienes suficientes fondos.',
            error: result.message || 'No puedes apostar ahora.'
        };

        const message = errorMessages[result.reason] || 'No puedes apostar ahora.';
        return this._handleError(interaction, message);
    }

    /**
     * Maneja el resultado exitoso del gamble
     * @private
     */
    async _handleGambleSuccess(interaction, result, amount, currency) {
        const embed = this._createBaseEmbed(interaction.user, 'APUESTA ILEGAL');

        // GANANCIA
        if (result.result.win) {
            embed
                .setColor('#2ECC71')
                .setDescription(`<:trebol:1468313419299164343> \`GANASTE:\` **${result.result.win} ${this._formatCurrency(currency)}**`);
        }

        // PÉRDIDA
        if (result.result.lose) {
            embed
                .setColor('#E74C3C')
                .setDescription(`<:hacker:1466444191771918357> \`PERDISTE:\` **${result.result.lose} ${this._formatCurrency(currency)}**`);
        }

        // ROBO
        if (result.result.robbery) {
            const stolen = result.result.robbery.stolen || 0;
            const totalLost = amount + stolen;

            embed
                .setColor('#34495E')
                .setDescription(
                    `<:ladron:1465517221240504452> \`ROBO EN EL MERCADO NEGRO\`\n\n` +
                    `__APUESTA PERDIDA:__\n` +
                    `<:dinero:1451695904351457330> **-${amount} ${this._formatCurrency(currency)}**\n\n` +
                    `__UN LADRÓN TE ASALTÓ:__\n` +
                    `<:dinero:1451695904351457330> **-${stolen} monedas**\n\n` +
                    `__PÉRDIDA TOTAL:__ **-${totalLost}**\n` +
                    `El mercado negro no es un lugar seguro.`
                );
        }

        // RAID
        if (result.result.raid) {
            const coinsLost = result.result.raid.coinsLost || 0;
            const tokensLost = result.result.raid.tokensLost || 0;
            const totalLost = amount + coinsLost + tokensLost;

            embed
                .setColor('#8E44AD')
                .setDescription(
                    `<:poli:1469342386109808858> \`REDADA POLICIAL\`\n\n` +
                    `__APUESTA PERDIDA:__\n` +
                    `<:dinero:1451695904351457330> **-${amount} ${this._formatCurrency(currency)}**\n\n` +
                    `__CONFISCADO POR LA POLICÍA:__\n` +
                    `<:dinero:1451695904351457330> **-${coinsLost} monedas**\n` +
                    `<:tokens:1451695903080579192> **-${tokensLost} tokens**\n\n` +
                    `__PÉRDIDA TOTAL:__ **-${totalLost}**\n` +
                    `Has sido enviado a la cárcel.`
                );
        }

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja el subcomando BAIL
     * @private
     */
    async _handleBail(interaction, bm, userId, guildId) {
        const result = await bm.payBail(userId, guildId);

        if (!result.success) {
            const errorMessages = {
                not_jailed: 'No estás en la cárcel.',
                insufficient_funds: `No tienes suficientes monedas. Necesitas **${result.cost}** monedas.`,
                error: result.message || 'No puedes pagar fianza.'
            };

            const message = errorMessages[result.reason] || 'No puedes pagar fianza.';
            return this._handleError(interaction, message);
        }

        const embed = this._createBaseEmbed(interaction.user, 'FIANZA PAGADA')
            .setColor('#2ECC71')
            .setDescription(
                `<:dinero:1451695904351457330> \`PAGASTE:\` **${result.cost} MONEDAS**\n\n` +
                `__Has quedado libre.__`
            );

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja el subcomando STATS
     * @private
     */
    async _handleStats(interaction, bm, userId, guildId) {
        const { stats } = await bm.getStatus(userId, guildId);

        const embed = this._createBaseEmbed(interaction.user, 'ESTADÍSTICAS CRIMINALES')
            .setColor('#9B59B6')
            .setDescription(
                `\`APUESTAS:\` **${stats.bets}**\n` +
                `\`VECES ATRAPADO:\` **${stats.caught}**\n` +
                `\`VECES ROBADO:\` **${stats.robbed}**\n`
            );

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja el subcomando LAUNDER
     * @private
     */
    async _handleLaunder(interaction, bm, userId, guildId) {
        const result = await bm.launder(userId, guildId);

        if (!result.success) {
            return this._handleLaunderError(interaction, result);
        }

        const embed = this._createBaseEmbed(interaction.user, 'LAVADO DE DINERO')
            .setColor('#1ABC9C')
            .setDescription(
                `<:hacker:1466444191771918357> \`PERDISTE:\` **${result.lostCoins} MONEDAS**\n\n` +
                `\`SOSPECHA ANTES:\` \`${result.heatBefore}/100\`\n` +
                `\`SOSPECHA AHORA:\` \`${result.heatAfter}/100\`\n\n` +
                `__Has bajado el perfil ante la policía.__`
            );

        return interaction.reply({ embeds: [embed] });
    }

    /**
     * Maneja los errores del launder
     * @private
     */
    _handleLaunderError(interaction, result) {
        const errorMessages = {
            jailed: `Estás en la cárcel.\nSaldrás ${this._toDiscordTimestamp(result.until)}`,
            banned: `Estás baneado del mercado negro hasta ${this._toDiscordTimestamp(result.until)}`,
            low_heat: `Tu nivel de sospecha es demasiado bajo.\nNecesitas al menos **${result.required}**.`,
            no_coins: 'No tienes monedas para lavar.',
            cooldown: `Ya lavaste dinero recientemente.\nInténtalo ${this._toDiscordTimestamp(new Date(Date.now() + result.remaining))}`,
            error: result.message || 'No puedes lavar dinero ahora mismo.'
        };

        const message = errorMessages[result.reason] || 'No puedes lavar dinero ahora mismo.';
        return this._handleError(interaction, message);
    }

    async execute(client, interaction) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const bm = client.levelManager.blackMarketManager;

        try {
            // Enrutamiento de subcomandos
            switch (sub) {
                case 'info':
                    return await this._handleInfo(interaction, bm, userId, guildId);

                case 'heat':
                    return await this._handleHeat(interaction, bm, userId, guildId);

                case 'gamble':
                    return await this._handleGamble(interaction, bm, userId, guildId);

                case 'bail':
                    return await this._handleBail(interaction, bm, userId, guildId);

                case 'stats':
                    return await this._handleStats(interaction, bm, userId, guildId);

                case 'launder':
                    return await this._handleLaunder(interaction, bm, userId, guildId);

                default:
                    return this._handleError(interaction, 'Subcomando no reconocido.');
            }

        } catch (err) {
            client.logger.error('Error en /blackmarket:', err);
            return this._handleError(interaction);
        }
    }
}