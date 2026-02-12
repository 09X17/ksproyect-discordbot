
export default class BlackMarketManager {
    static CONSTANTS = {
        MAX_HEAT: 100,
        MIN_HEAT: 0,
        HEAT_THRESHOLDS: {
            VERY_LOW: 5000,
            LOW: 10000,
            MEDIUM: 25000,
            HIGH: 50000
        },
        HEAT_GAIN: {
            VERY_LOW: 1,
            LOW: 3,
            MEDIUM: 6,
            HIGH: 10,
            VERY_HIGH: 15
        },
        JAIL_TIME: {
            DEFAULT: 10,
            RAID_DIRECT: 15
        },
        CONFISCATION: {
            DEFAULT: 30,
            RAID_DIRECT: 40,
            HEAT_RAID: 25
        },
        GAMBLE: {
            WIN_CHANCE: 0.50,
            LOSE_CHANCE: 0.50,
            WIN_MULTIPLIER_5K: 0.4,
            WIN_MULTIPLIER_10K: 0.5
        },
        ROBBERY: {
            MIN_AMOUNT: 10000,
            PERCENTAGES: [0.2, 0.3, 0.4],
            MAX_HEAT_CHANCE: 0.6
        },
        RAID: {
            MIN_AMOUNT: 10000,
            MAX_AMOUNT: 10000,
            MAX_CHANCE: 0.8
        },
        LAUNDER: {
            MIN_HEAT: 20,
            HEAT_REDUCTION: 35,
            COIN_LOSS_PERCENT: 0.25,
            COOLDOWN_MS: 45 * 60 * 1000
        },
        JAIL: {
            HEAT_RELEASE_MULTIPLIER: 0.5,
            HEAT_RAID_MULTIPLIER: 0.6,
            MIN_HEAT_AFTER_RAID: 10
        },
        BAIL: {
            BASE_COST: 250,
            HEAT_MULTIPLIER: 5,
            CAUGHT_MULTIPLIER: 100
        },
        CURRENCIES: ['coins', 'tokens']
    };

    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    /**
     * Asegura que el usuario tenga la estructura de blackMarket inicializada
     * @private
     */
    _ensureBM(user) {
        if (!user.blackMarket) {
            user.blackMarket = {};
        }

        const bm = user.blackMarket;

        bm.heat ??= 0;
        bm.jailed ??= false;
        bm.jailUntil ??= null;
        bm.bannedUntil ??= null;
        bm.lastRobbedAt ??= null;
        bm.lastAction ??= null;

        if (!bm.stats) {
            bm.stats = {};
        }

        bm.stats.purchases ??= 0;
        bm.stats.bets ??= 0;
        bm.stats.caught ??= 0;
        bm.stats.robbed ??= 0;
    }

    /**
     * Verifica y libera automáticamente al usuario si cumplió su tiempo de cárcel
     * @private
     */
    _checkAutoRelease(user) {
        const bm = user.blackMarket;
        if (bm.jailed && bm.jailUntil && bm.jailUntil <= new Date()) {
            bm.jailed = false;
            bm.jailUntil = null;
            bm.heat = Math.floor(bm.heat * BlackMarketManager.CONSTANTS.JAIL.HEAT_RELEASE_MULTIPLIER);
            return true;
        }
        return false;
    }

    /**
     * Verifica si el usuario está en la cárcel
     * @private
     */
    _isJailed(user) {
        this._checkAutoRelease(user);
        return user.blackMarket.jailed;
    }

    /**
     * Verifica si el usuario está baneado
     * @private
     */
    _isBanned(user) {
        return (
            user.blackMarket.bannedUntil &&
            user.blackMarket.bannedUntil > new Date()
        );
    }

    /**
     * Añade heat al usuario con un límite máximo
     * @private
     */
    _addHeat(user, amount) {
        user.blackMarket.heat = Math.min(
            BlackMarketManager.CONSTANTS.MAX_HEAT,
            user.blackMarket.heat + amount
        );
    }

    /**
     * Calcula y añade heat basado en la cantidad apostada
     * @private
     */
    _addHeatByBet(user, amount) {
        const { HEAT_THRESHOLDS, HEAT_GAIN } = BlackMarketManager.CONSTANTS;
        let heatGain = 0;

        if (amount < HEAT_THRESHOLDS.VERY_LOW) {
            heatGain = HEAT_GAIN.VERY_LOW;
        } else if (amount < HEAT_THRESHOLDS.LOW) {
            heatGain = HEAT_GAIN.LOW;
        } else if (amount < HEAT_THRESHOLDS.MEDIUM) {
            heatGain = HEAT_GAIN.MEDIUM;
        } else if (amount < HEAT_THRESHOLDS.HIGH) {
            heatGain = HEAT_GAIN.HIGH;
        } else {
            heatGain = HEAT_GAIN.VERY_HIGH;
        }

        this._addHeat(user, heatGain);
    }

    /**
     * Calcula el porcentaje de robo aleatorio
     * @private
     */
    _calculateRobbery(amount) {
        const roll = Math.random();
        const { PERCENTAGES } = BlackMarketManager.CONSTANTS.ROBBERY;

        if (roll < 0.33) return PERCENTAGES[0];
        if (roll < 0.66) return PERCENTAGES[1];
        return PERCENTAGES[2];
    }

    /**
     * Determina si debe ocurrir un raid basado en heat y cantidad
     * @private
     */
    _shouldRaid(user, amount) {
        const { MIN_AMOUNT, MAX_AMOUNT, MAX_CHANCE } = BlackMarketManager.CONSTANTS.RAID;

        if (amount < MIN_AMOUNT) return false;

        const heat = user.blackMarket.heat;
        const amountFactor = Math.min((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT), 1);
        const chance = heat * amountFactor * MAX_CHANCE;

        return Math.random() * 100 < chance;
    }

    /**
     * Determina si debe ocurrir un robo
     * @private
     */
    _shouldRob(user, amount) {
        const { MIN_AMOUNT, MAX_HEAT_CHANCE } = BlackMarketManager.CONSTANTS.ROBBERY;
        const { MAX_AMOUNT } = BlackMarketManager.CONSTANTS.RAID;

        if (amount < MIN_AMOUNT) return false;

        const heatFactor = user.blackMarket.heat / BlackMarketManager.CONSTANTS.MAX_HEAT;
        const amountFactor = Math.min((amount - MIN_AMOUNT) / (MAX_AMOUNT - MIN_AMOUNT), 1);
        const chance = heatFactor * amountFactor * MAX_HEAT_CHANCE;

        return Math.random() < chance;
    }

    /**
     * Ejecuta un robo y actualiza las estadísticas
     * @private
     */
    _executeRobbery(user, userId, guildId, currency, amount) {
        const percent = this._calculateRobbery(amount);
        const stolen = Math.max(1, Math.floor(amount * percent));

        user[currency] = Math.max(0, user[currency] - stolen);

        user.blackMarket.lastRobbedAt = new Date();
        user.blackMarket.stats.robbed++;

        return {
            percent,
            stolen
        };
    }

    /**
     * Confisca monedas o tokens del usuario
     * @private
     */
    _confiscate(user, amount, currency, percent) {
        let coinsLost = 0;
        let tokensLost = 0;

        if (currency === 'coins') {
            coinsLost = Math.min(
                user.coins || 0,
                Math.floor(amount * percent / 100)
            );
            user.coins -= coinsLost;
        }

        if (currency === 'tokens') {
            tokensLost = Math.min(
                user.tokens || 0,
                Math.floor(amount * percent / 100)
            );
            user.tokens -= tokensLost;
        }

        return { coinsLost, tokensLost };
    }

    /**
     * Envía al usuario a la cárcel con confiscación opcional
     * @private
     */
    _sendToJail(user, amount, currency, minutes = 10, confiscation = 30) {
        const bm = user.blackMarket;

        bm.jailed = true;
        bm.jailUntil = new Date(Date.now() + minutes * 60 * 1000);
        bm.stats.caught++;

        const confiscated = this._confiscate(user, amount, currency, confiscation);

        bm.heat = Math.max(
            BlackMarketManager.CONSTANTS.JAIL.MIN_HEAT_AFTER_RAID,
            Math.floor(bm.heat * BlackMarketManager.CONSTANTS.JAIL.HEAT_RAID_MULTIPLIER)
        );

        return confiscated;
    }

    /**
     * Calcula el costo de la fianza basado en estadísticas del usuario
     * @private
     */
    _calculateBail(user) {
        const bm = user.blackMarket;
        const { BASE_COST, HEAT_MULTIPLIER, CAUGHT_MULTIPLIER } = BlackMarketManager.CONSTANTS.BAIL;

        return BASE_COST + (bm.heat * HEAT_MULTIPLIER) + (bm.stats.caught * CAUGHT_MULTIPLIER);
    }

    /**
     * Valida los parámetros básicos de una operación
     * @private
     */
    _validateParams(userId, guildId, amount, currency) {
        if (!userId || !guildId) {
            throw new Error('Invalid userId or guildId');
        }

        if (typeof amount !== 'number' || isNaN(amount)) {
            throw new Error('Invalid amount');
        }

        if (!BlackMarketManager.CONSTANTS.CURRENCIES.includes(currency)) {
            throw new Error('Invalid currency type');
        }
    }

    /**
     * Valida si el usuario puede realizar una apuesta
     * @private
     */
    _validateGambleRequest(user, amount, currency) {
        if (this._isJailed(user)) {
            return {
                valid: false,
                reason: 'jailed',
                until: user.blackMarket.jailUntil
            };
        }

        if (this._isBanned(user)) {
            return {
                valid: false,
                reason: 'banned',
                until: user.blackMarket.bannedUntil
            };
        }

        if ((user[currency] || 0) < amount || amount <= 0) {
            return {
                valid: false,
                reason: 'insufficient_funds'
            };
        }

        return { valid: true };
    }

    /**
     * Determina el tipo de resultado de la apuesta
     * @private
     */
    _determineGambleOutcome(amount) {
        const roll = Math.random();
        const { WIN_CHANCE, LOSE_CHANCE } = BlackMarketManager.CONSTANTS.GAMBLE;

        if (roll < WIN_CHANCE) return { type: 'win', roll };
        if (roll < LOSE_CHANCE) return { type: 'lose', roll };
        return { type: 'raid', roll };
    }

    /**
     * Calcula la cantidad ganada en una apuesta exitosa
     * @private
     */
    _calculateWinAmount(betAmount) {
        const { WIN_MULTIPLIER_5K, WIN_MULTIPLIER_10K } = BlackMarketManager.CONSTANTS.GAMBLE;
        const { VERY_LOW, LOW } = BlackMarketManager.CONSTANTS.HEAT_THRESHOLDS;

        let winAmount = betAmount;

        if (betAmount >= VERY_LOW) {
            winAmount = Math.floor(winAmount * WIN_MULTIPLIER_5K);
        }
        if (betAmount >= LOW) {
            winAmount = Math.floor(winAmount * WIN_MULTIPLIER_10K);
        }

        return winAmount;
    }

    /**
     * Procesa el resultado de una apuesta según su tipo
     * @private
     */
    async _processGambleOutcome(user, userId, guildId, amount, currency, outcomeType) {
        const outcome = {};

        switch (outcomeType.type) {
            case 'win':
                const winAmount = this._calculateWinAmount(amount);
                const totalReturn = amount + winAmount;            
                await this.levelManager.giveCurrency(
                    userId,
                    guildId,
                    currency,
                    totalReturn,
                    'bm_gamble_win'
                );
                outcome.win = totalReturn;
                break;


            case 'lose':
                await this.levelManager.takeCurrency(
                    userId,
                    guildId,
                    currency,
                    amount,
                    'bm_gamble_lose'
                );
                outcome.lose = amount;
                break;

            case 'raid':
                await this.levelManager.takeCurrency(
                    userId,
                    guildId,
                    currency,
                    amount,
                    'bm_gamble_raid_bet'
                );

                const confiscated = this._sendToJail(
                    user,
                    amount,
                    currency,
                    BlackMarketManager.CONSTANTS.JAIL_TIME.RAID_DIRECT,
                    BlackMarketManager.CONSTANTS.CONFISCATION.RAID_DIRECT
                );

                outcome.raid = confiscated;
                break;
        }

        return outcome;
    }

    /**
     * Maneja eventos posteriores a la apuesta (robos y raids por heat)
     * @private
     */
    async _handlePostGambleEvents(user, userId, guildId, amount, currency, outcome) {
        // Robo (si no hubo raid)
        if (!outcome.raid && this._shouldRob(user, amount)) {
            const robbery = this._executeRobbery(
                user,
                userId,
                guildId,
                currency,
                amount
            );
            outcome.robbery = robbery;
        }

        // Raid por heat (si no hubo raid directo)
        if (!outcome.raid && this._shouldRaid(user, amount)) {
            await this.levelManager.takeCurrency(
                userId,
                guildId,
                currency,
                amount,
                'bm_gamble_heat_raid'
            );

            const confiscated = this._sendToJail(
                user,
                amount,
                currency,
                BlackMarketManager.CONSTANTS.JAIL_TIME.DEFAULT,
                BlackMarketManager.CONSTANTS.CONFISCATION.HEAT_RAID
            );

            outcome.raid = confiscated;
        }
    }

    /**
     * Verifica el cooldown de una acción
     * @private
     */
    _checkCooldown(lastAction, cooldownMs) {
        if (!lastAction) return { ready: true };

        const now = new Date();
        const timePassed = now - lastAction;

        if (timePassed < cooldownMs) {
            return {
                ready: false,
                remaining: cooldownMs - timePassed
            };
        }

        return { ready: true };
    }

    /**
     * Registra una acción en el log (para auditoría)
     * @private
     */
    _logAction(userId, guildId, action, details) {
        console.log(`[BlackMarket] ${action}`, {
            userId,
            guildId,
            timestamp: new Date().toISOString(),
            ...details
        });
    }

    /**
     * Maneja errores de forma consistente
     * @private
     */
    _handleError(action, error) {
        console.error(`[BlackMarket] Error in ${action}:`, error);
        return {
            success: false,
            reason: 'error',
            message: error.message
        };
    }

    /**
     * Obtiene el estado actual del black market del usuario
     * @public
     */
    async getStatus(userId, guildId) {
        try {
            const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            this._ensureBM(user);
            this._checkAutoRelease(user);

            return {
                heat: user.blackMarket.heat,
                jailed: user.blackMarket.jailed,
                jailUntil: user.blackMarket.jailUntil,
                bannedUntil: user.blackMarket.bannedUntil,
                stats: user.blackMarket.stats
            };
        } catch (error) {
            return this._handleError('getStatus', error);
        }
    }

    /**
     * Realiza una apuesta en el mercado negro
     * @public
     */
    async gamble(userId, guildId, amount, currency = 'coins') {
        try {
            // Validar parámetros
            this._validateParams(userId, guildId, amount, currency);

            const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            this._ensureBM(user);

            // Validar estado del usuario
            const validation = this._validateGambleRequest(user, amount, currency);
            if (!validation.valid) {
                return { success: false, ...validation };
            }

            const bm = user.blackMarket;
            bm.stats.bets++;

            // Añadir heat por la apuesta
            this._addHeatByBet(user, amount);

            // Determinar y procesar resultado
            const outcomeType = this._determineGambleOutcome(amount);
            const outcome = await this._processGambleOutcome(
                user,
                userId,
                guildId,
                amount,
                currency,
                outcomeType
            );

            // Manejar eventos post-apuesta
            await this._handlePostGambleEvents(
                user,
                userId,
                guildId,
                amount,
                currency,
                outcome
            );

            // Guardar cambios
            bm.lastAction = new Date();
            user.markModified('blackMarket');
            await user.save();

            // Log de la acción
            this._logAction(userId, guildId, 'gamble', {
                amount,
                currency,
                outcomeType: outcomeType.type,
                heat: bm.heat
            });

            return { success: true, result: outcome };

        } catch (error) {
            return this._handleError('gamble', error);
        }
    }

    /**
     * Paga la fianza para salir de la cárcel
     * @public
     */
    async payBail(userId, guildId) {
        try {
            const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            this._ensureBM(user);
            this._checkAutoRelease(user);

            if (!user.blackMarket.jailed) {
                return { success: false, reason: 'not_jailed' };
            }

            const cost = this._calculateBail(user);

            if ((user.coins || 0) < cost) {
                return { success: false, reason: 'insufficient_funds', cost };
            }

            user.coins -= cost;
            user.blackMarket.jailed = false;
            user.blackMarket.jailUntil = null;

            user.markModified('blackMarket');
            await user.save();

            this._logAction(userId, guildId, 'payBail', { cost });

            return { success: true, cost };

        } catch (error) {
            return this._handleError('payBail', error);
        }
    }

    /**
     * Lava dinero para reducir el heat
     * @public
     */
    async launder(userId, guildId) {
        try {
            const user = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            this._ensureBM(user);

            const bm = user.blackMarket;
            const { MIN_HEAT, HEAT_REDUCTION, COIN_LOSS_PERCENT, COOLDOWN_MS } =
                BlackMarketManager.CONSTANTS.LAUNDER;

            // Validaciones de estado
            if (this._isJailed(user)) {
                return { success: false, reason: 'jailed', until: bm.jailUntil };
            }

            if (this._isBanned(user)) {
                return { success: false, reason: 'banned', until: bm.bannedUntil };
            }

            if (bm.heat < MIN_HEAT) {
                return { success: false, reason: 'low_heat', required: MIN_HEAT };
            }

            // Verificar cooldown
            const cooldownCheck = this._checkCooldown(bm.lastAction, COOLDOWN_MS);
            if (!cooldownCheck.ready) {
                return {
                    success: false,
                    reason: 'cooldown',
                    remaining: cooldownCheck.remaining
                };
            }

            // Verificar fondos
            const coins = user.coins || 0;
            if (coins <= 0) {
                return { success: false, reason: 'no_coins' };
            }

            // Calcular pérdida de monedas
            const lostCoins = Math.max(1, Math.floor(coins * COIN_LOSS_PERCENT));

            await this.levelManager.takeCurrency(
                userId,
                guildId,
                'coins',
                lostCoins,
                'bm_launder'
            );

            // Reducir heat
            const heatBefore = bm.heat;
            bm.heat = Math.max(
                BlackMarketManager.CONSTANTS.MIN_HEAT,
                bm.heat - HEAT_REDUCTION
            );
            bm.lastAction = new Date();

            user.markModified('blackMarket');
            await user.save();

            this._logAction(userId, guildId, 'launder', {
                lostCoins,
                heatBefore,
                heatAfter: bm.heat
            });

            return {
                success: true,
                lostCoins,
                heatBefore,
                heatAfter: bm.heat
            };

        } catch (error) {
            return this._handleError('launder', error);
        }
    }
}