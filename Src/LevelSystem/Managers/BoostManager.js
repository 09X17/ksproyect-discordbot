import UserLevel from '../Models/UserLevel.js';
import GuildConfigLevel from '../Models/GuildConfig.js';

export default class BoostManager {
    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    calculateXPWithBoosts(userLevel, baseXP, source = 'unknown') {
        const now = new Date();
        let personalMultiplier = userLevel.boostMultiplier || 1.0;
        const boostExpires = userLevel.boostExpires ? new Date(userLevel.boostExpires) : null;

        if (personalMultiplier > 1 && boostExpires && boostExpires < now) {
            personalMultiplier = 1.0;
        }

        const activeBoosts = (userLevel.activeItems || []).filter(item =>
            ['boost_user', 'boost_server'].includes(item.itemType) &&
            item.active &&
            (!item.expiresAt || new Date(item.expiresAt) > now)
        );

        for (const boost of activeBoosts) {
            const mult = boost.multiplier || 1.5;
            if (mult > personalMultiplier) personalMultiplier = mult;
        }

        const boostedXP = Math.floor((baseXP || 0) * personalMultiplier);

        return {
            baseXP: baseXP || 0,
            boostedXP,
            multiplier: personalMultiplier,
            source
        };
    }

    async addXP(userId, guildId, amount, source = 'unknown') {
        try {
            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);

            const boostMultiplier = await this.getEffectiveBoostMultiplier(userId, guildId);
            let boostedAmount = boostMultiplier > 1 ? Math.floor(amount * boostMultiplier) : amount;

            let finalAmount = boostedAmount;
            let eventBonus = 0;
            let eventMultiplier = 1.0;

            if (this.levelManager?.eventManager) {
                const eventResult = await this.levelManager.eventManager.applyEventRewards(
                    userId,
                    guildId,
                    boostedAmount,
                    'xp',
                    source
                );
                finalAmount = eventResult.amount;
                eventBonus = eventResult.bonus || 0;
                eventMultiplier = eventResult.multiplier || 1.0;
            }

            const result = await userLevel.addXP(finalAmount, source);

            await userLevel.save();

            if (!userLevel.username) {
                const user = await this.client.users.fetch(userId).catch(() => null);
                userLevel.username = user?.username || 'Usuario desconocido';
                await userLevel.save();
            }

            const logs = [];
            if (boostMultiplier > 1) {
                logs.push(`B P: ${boostMultiplier}x`);
                await this.logBoostApplication(userId, guildId, boostMultiplier, amount, boostedAmount, source);
            }
            if (eventMultiplier > 1.0) logs.push(`E A: ${eventMultiplier}x`);
            if (eventBonus > 0) logs.push(`B E: +${eventBonus} XP`);

            if (logs.length > 0) {
                this.client.logger.info(`XP B: ${userId}@${guildId}: ${amount} → ${finalAmount} XP | ${logs.join(' | ')}`);
            }

            await this.logXPTransaction(userId, guildId, finalAmount, source);

            return {
                ...result,
                xpBase: amount,
                xpFinal: finalAmount,
                xpGained: finalAmount,
                modifiers: {
                    personalBoost: boostMultiplier,
                    eventMultiplier,
                    eventBonus,
                    totalMultiplier: (boostMultiplier * eventMultiplier).toFixed(2)
                }
            };

        } catch (error) {
            this.client.logger.error('❌ Error añadiendo XP:', error);
            throw error;
        }
    }

    async activateUserBoost(userId, guildId, multiplier, durationHours, boostName = 'Boost manual') {
        const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + durationHours * 3600000);

        const existing = await this.getUserActiveBoost(userId, guildId);
        if (existing && existing.multiplier >= multiplier) {
            return {
                success: false,
                reason: 'Ya tienes un boost igual o mejor activo'
            };
        }

        userLevel.activeItems.push({
            itemId: null,
            itemName: boostName,
            itemType: 'boost_user',
            purchasedAt: now,
            expiresAt,
            active: true,
            multiplier,
            durationHours
        });

        userLevel.boostMultiplier = multiplier;
        userLevel.boostExpires = expiresAt;

        return {
            success: true,
            multiplier,
            durationHours,
            expiresAt
        };
    }

    async clearUserBoosts(userId, guildId) {
        const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);

        userLevel.activeItems = userLevel.activeItems.filter(
            item => !['boost_user', 'boost_server'].includes(item.itemType)
        );

        userLevel.boostMultiplier = 1.0;
        userLevel.boostExpires = null;

        return { success: true };
    }

    async getUserActiveBoost(userId, guildId) {
        const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        const now = new Date();

        const activeBoosts = userLevel.activeItems.filter(item =>
            ['boost_user', 'boost_server'].includes(item.itemType) &&
            item.active &&
            (!item.expiresAt || item.expiresAt > now)
        );

        let bestMultiplier = 1.0;
        let bestBoost = null;

        if (userLevel.boostMultiplier > 1 && userLevel.boostExpires > now) {
            bestMultiplier = userLevel.boostMultiplier;
            bestBoost = {
                multiplier: userLevel.boostMultiplier,
                expiresAt: userLevel.boostExpires,
                source: 'traditional'
            };
        }

        for (const boost of activeBoosts) {
            const mult = boost.multiplier || 1.5;
            if (mult > bestMultiplier) {
                bestMultiplier = mult;
                bestBoost = boost;
            }
        }

        return bestBoost;
    }

    async getEffectiveBoostMultiplier(userId, guildId) {
        const boost = await this.getUserActiveBoost(userId, guildId);
        return boost?.multiplier || 1.0;
    }

    async getUserBoosts(userId, guildId) {
        const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
        const now = new Date();

        return userLevel.activeItems
            .filter(item =>
                ['boost_user', 'boost_server'].includes(item.itemType) &&
                item.active &&
                (!item.expiresAt || item.expiresAt > now)
            )
            .map(item => ({
                name: item.itemName,
                type: item.itemType,
                multiplier: item.multiplier || 1.5,
                expiresAt: item.expiresAt,
                purchasedAt: item.purchasedAt
            }));
    }

    async checkBoostStatus(userId, guildId) {
        const boosts = await this.getUserBoosts(userId, guildId);
        const personalMultiplier = await this.getEffectiveBoostMultiplier(userId, guildId);

        let eventMultiplier = 1.0;
        if (this.levelManager?.eventManager) {
            eventMultiplier =
                this.levelManager.eventManager.getActiveEventMultiplier('xp').multiplier;
        }

        return {
            hasBoost: personalMultiplier > 1,
            personalMultiplier,
            eventMultiplier,
            totalMultiplier: personalMultiplier * eventMultiplier,
            activeBoosts: boosts
        };
    }

    async cleanupExpiredBoosts() {
        const now = new Date();

        await UserLevel.updateMany(
            {
                'activeItems.expiresAt': { $lt: now },
                'activeItems.active': true
            },
            {
                $set: { 'activeItems.$[elem].active': false }
            },
            {
                arrayFilters: [{
                    'elem.expiresAt': { $lt: now },
                    'elem.active': true
                }]
            }
        );

        await UserLevel.updateMany(
            { boostExpires: { $lt: now } },
            { $set: { boostMultiplier: 1.0, boostExpires: null } }
        );
    }

    async logBoostApplication(userId, guildId, multiplier, baseXP, finalXP, source) {
        try {
            this.client.logger.info(`BOOST: ${userId}@${guildId} | ${multiplier}x | ${baseXP} → ${finalXP} XP | Source: ${source}`);
        } catch (error) {
            this.client.logger.error('❌ Error registrando boost:', error);
        }
    }

    async logXPTransaction(userId, guildId, amount, source) {
        try {
            this.client.logger.info(`XP: ${userId}@${guildId} | ${amount} XP | Source: ${source}`);
        } catch (error) {
            this.client.logger.error('❌ Error registrando transacción de XP:', error);
        }
    }

    async getEventMultiplierForXP(guildId) {
        try {
            if (!this.levelManager?.eventManager) return 1.0;

            const eventMultipliers = this.levelManager.eventManager.getActiveEventMultiplier('xp');
            return eventMultipliers.multiplier;
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo multiplicador de evento:', error);
            return 1.0;
        }
    }

    async verificarBoostEnTiempoReal(userId, guildId, xpBase = 0, xpFinal = 0) {
        try {
            if (!userId || !guildId) {
                this.client.logger.error('❌ Error verificando boost: guildId o userId no definidos');
                return null;
            }

            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            const now = new Date();

            const boostsActivos = userLevel.activeItems.filter(item =>
                (item.itemType === 'boost_user' || item.itemType === 'boost_server') &&
                item.active === true &&
                (!item.expiresAt || new Date(item.expiresAt) > now)
            );

            const boostTradicionalActivo = userLevel.boostMultiplier > 1 &&
                userLevel.boostExpires > now;

            let multiplicadorEfectivo = 1.0;
            let boostsDetectados = [];

            if (boostTradicionalActivo) {
                multiplicadorEfectivo = Math.max(multiplicadorEfectivo, userLevel.boostMultiplier);
                boostsDetectados.push({
                    tipo: 'tradicional',
                    multiplicador: userLevel.boostMultiplier
                });
            }

            if (boostsActivos.length > 0) {
                const mejorBoost = boostsActivos.reduce((mejor, actual) => {
                    const multActual = actual.multiplier || 1.5;
                    const multMejor = mejor.multiplier || 1.5;
                    return multActual > multMejor ? actual : mejor;
                }, { multiplier: 0 });

                multiplicadorEfectivo = Math.max(multiplicadorEfectivo, mejorBoost.multiplier || 1.5);

                boostsActivos.forEach(boost => {
                    boostsDetectados.push({
                        tipo: 'tienda',
                        multiplicador: boost.multiplier || 1.5,
                        nombre: boost.itemName,
                        expira: boost.expiresAt
                    });
                });
            }

            let eventMultiplier = 1.0;
            let eventBonus = 0;
            let eventosActivos = [];

            if (this.levelManager?.eventManager) {
                const eventResult = this.levelManager.eventManager.getActiveEventMultiplier('xp');
                eventMultiplier = eventResult.multiplier;

                const activeEvents = this.levelManager.eventManager.getActiveEvents();
                activeEvents.forEach(event => {
                    if (event.type === 'xp_multiplier') {
                        eventosActivos.push({
                            nombre: event.name,
                            multiplicador: event.multiplier
                        });
                    }
                });
            }

            const totalMultiplier = multiplicadorEfectivo * eventMultiplier;
            let xpConBoost = Math.floor(xpBase * totalMultiplier);
            let xpCalculado = xpConBoost + eventBonus;

            const calculoCorrecto = xpCalculado === xpFinal;

            return {
                boostsActivos: boostsDetectados.length,
                eventosActivos: eventosActivos.length,
                multiplicadorPersonal: multiplicadorEfectivo,
                multiplicadorEvento: eventMultiplier,
                multiplicadorTotal: totalMultiplier,
                bonusEvento: eventBonus,
                xpBase,
                xpConBoostPersonal: Math.floor(xpBase * multiplicadorEfectivo),
                xpConEvento: Math.floor(xpBase * totalMultiplier),
                xpCalculado,
                xpFinal,
                calculoCorrecto,
                boostsDetectados,
                eventosDetectados: eventosActivos,
                boostTradicionalActivo,
                mensaje: calculoCorrecto ?
                    `✅ Boost aplicado correctamente: ${xpBase} → ${xpFinal} XP` :
                    `❌ Error en cálculo: Esperado ${xpCalculado}, Obtenido ${xpFinal}`
            };

        } catch (error) {
            this.client.logger.error('❌ Error verificando boost:', error);
            return {
                error: error.message,
                boostsActivos: 0,
                eventosActivos: 0,
                multiplicadorTotal: 1.0
            };
        }
    }

    async getBoostHistory(userId, guildId, limit = 10) {
        try {
            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);

            const allBoosts = userLevel.activeItems.filter(item =>
                item.itemType === 'boost_user' || item.itemType === 'boost_server'
            );

            allBoosts.sort((a, b) => new Date(b.purchasedAt) - new Date(a.purchasedAt));

            return allBoosts.slice(0, limit).map(boost => ({
                name: boost.itemName,
                type: boost.itemType === 'boost_user' ? 'Personal' : 'Servidor',
                multiplier: boost.multiplier || 1.5,
                purchasedAt: boost.purchasedAt,
                expiresAt: boost.expiresAt,
                active: boost.active,
                durationHours: boost.durationHours || 24
            }));

        } catch (error) {
            this.client.logger.error('❌ Error obteniendo historial de boosts:', error);
            return [];
        }
    }

    async applyEventMultipliers(userId, guildId, amount, type = 'xp') {
        try {
            if (!this.levelManager?.eventManager) {
                return {
                    baseAmount: amount,
                    finalAmount: amount,
                    multiplier: 1.0,
                    bonus: 0
                };
            }

            const eventResult = await this.levelManager.eventManager.applyEventRewards(
                userId, guildId, amount, type, 'event_multiplier'
            );

            return {
                baseAmount: amount,
                finalAmount: eventResult.amount,
                multiplier: eventResult.multiplier || 1.0,
                bonus: eventResult.bonus
            };
        } catch (error) {
            this.client.logger.error('❌ Error aplicando multiplicadores de evento:', error);
            return {
                baseAmount: amount,
                finalAmount: amount,
                multiplier: 1.0,
                bonus: 0
            };
        }
    }
}