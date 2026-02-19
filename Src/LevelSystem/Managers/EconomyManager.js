import UserLevel from '../Models/UserLevel.js';
import ShopItem from '../Models/ShopItem.js';

export default class EconomyManager {
    static CURRENCIES = ['coins', 'tokens', 'xp'];
    static MAX_DAILY_CLAIMS = 1;
    static DAILY_BASE_REWARD = 150;
    static DAILY_STREAK_BONUS = 30;
    static STREAK_MILESTONES = {
        3: { coins: 100 },
        7: { coins: 250, tokens: 20 },
        14: { coins: 500, tokens: 30 },
        30: { coins: 1500, tokens: 40 },
        60: { coins: 3000, tokens: 50 }
    };
    static MILESTONE_BONUSES = {
        5: { coins: 50, tokens: 1 },
        10: { coins: 100, tokens: 2 },
        25: { coins: 250, tokens: 5 },
        50: { coins: 500, tokens: 10 },
        100: { coins: 1000, tokens: 20 }
    };

    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
        this.dailyRewards = new Map();
        this.shopItemsCache = new Map();
        this.lastCacheUpdate = new Map();
        this.CACHE_TTL = 5 * 60 * 1000;
    }

    _isValidCurrency(currency) {
        return EconomyManager.CURRENCIES.includes(currency);
    }

    _isValidAmount(amount) {
        return typeof amount === 'number' && amount > 0 && !isNaN(amount) && isFinite(amount);
    }

    async _applyEventBonuses(userId, guildId, amount, currency, source) {
        if (!this.levelManager.eventManager) {
            return {
                finalAmount: amount,
                baseAmount: amount,
                bonus: 0,
                multiplier: 1.0
            };
        }

        try {
            const eventResult = await this.levelManager.eventManager.applyEventRewards(
                userId, guildId, amount, currency, source
            );

            return {
                finalAmount: eventResult.amount,
                baseAmount: amount,
                bonus: eventResult.bonus,
                multiplier: eventResult.multiplier || 1.0
            };
        } catch (error) {
            this.client.logger.error('⚠️ Error aplicando eventos, usando valores base:', error);
            return {
                finalAmount: amount,
                baseAmount: amount,
                bonus: 0,
                multiplier: 1.0
            };
        }
    }

    _getActiveSaleEvent() {
        if (!this.levelManager?.eventManager) return null;

        try {
            const activeEvents = this.levelManager.eventManager.getActiveEvents();
            return activeEvents.find(e => e.type === 'sale') || null;
        } catch (error) {
            this.client.logger.error('⚠️ Error obteniendo eventos de venta:', error);
            return null;
        }
    }

    _calculateFinalPrice(basePrice, quantity) {
        const totalPrice = basePrice * quantity;
        const saleEvent = this._getActiveSaleEvent();

        if (!saleEvent || !saleEvent.discount) {
            return {
                finalPrice: totalPrice,
                originalPrice: totalPrice,
                discount: 0,
                saleEvent: null
            };
        }

        const discount = Math.floor(totalPrice * saleEvent.discount);
        return {
            finalPrice: totalPrice - discount,
            originalPrice: totalPrice,
            discount,
            saleEvent: saleEvent.name,
            discountPercentage: Math.round((discount / totalPrice) * 100)
        };
    }

    async _getUserLevel(guildId, userId) {
        try {
            return await this.levelManager.getOrCreateUserLevel(guildId, userId);
        } catch (error) {
            this.client.logger.error(`❌ Error obteniendo UserLevel ${userId}@${guildId}:`, error);
            throw new Error('No se pudo obtener los datos del usuario');
        }
    }

    async _getMember(guildId, userId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return null;

            return await guild.members.fetch(userId).catch(() => null);
        } catch (error) {
            this.client.logger.error(`⚠️ Error obteniendo member ${userId}:`, error);
            return null;
        }
    }

    _isCacheValid(guildId, cacheKey) {
        const lastUpdate = this.lastCacheUpdate.get(`${guildId}-${cacheKey}`);
        if (!lastUpdate) return false;

        return (Date.now() - lastUpdate) < this.CACHE_TTL;
    }

    async giveCurrency(userId, guildId, currency, amount, source = 'system') {
        try {
            console.log('🔍 [giveCurrency] Inicio:', { userId, guildId, currency, amount, source });

            // Validar moneda y cantidad
            if (!this._isValidCurrency(currency)) {
                console.log('❌ Moneda no válida:', currency);
                return { success: false, reason: 'Moneda no válida' };
            }

            if (!this._isValidAmount(amount)) {
                console.log('❌ Cantidad inválida:', amount);
                return { success: false, reason: 'Cantidad inválida' };
            }

            // Aplicar bonuses/eventos
            console.log('⚙️ Aplicando bonuses...');
            const eventResult = await this._applyEventBonuses(
                userId,
                guildId,
                amount,
                currency,
                source
            );
            console.log('📊 Event result:', eventResult);

            // Obtener documento completo
            console.log('🔍 Buscando usuario...');
            const userLevel = await UserLevel.findOne({ guildId, userId });

            if (!userLevel) {
                console.log('❌ Usuario no encontrado');
                return { success: false, reason: 'Usuario no encontrado' };
            }

            console.log(`💰 Balance ANTES: ${currency} = ${userLevel[currency]}`);

            const finalAmount = eventResult.finalAmount;
            console.log(`➕ Sumando: ${finalAmount}`);

            // Usar método directo según la moneda
            if (currency === 'coins') {
                const oldCoins = userLevel.coins;
                userLevel.coins += finalAmount;
                console.log(`💰 Coins: ${oldCoins} → ${userLevel.coins}`);
            } else if (currency === 'tokens') {
                const oldTokens = userLevel.tokens;
                userLevel.tokens += finalAmount;
                console.log(`🎟️ Tokens: ${oldTokens} → ${userLevel.tokens}`);
            } else if (currency === 'xp') {
                const result = await userLevel.addXP(finalAmount, source);
                console.log('✨ XP result:', result);
            }

            console.log(`💾 Guardando cambios...`);
            const saved = await userLevel.save();
            console.log(`✅ Guardado exitoso. Balance DESPUÉS: ${saved[currency]}`);

            return {
                success: true,
                amount: finalAmount,
                baseAmount: eventResult.baseAmount,
                bonus: eventResult.bonus,
                multiplier: eventResult.multiplier,
                currency,
                newBalance: saved[currency]
            };

        } catch (error) {
            console.error('❌ [giveCurrency] ERROR:', error);
            console.error('Stack:', error.stack);
            this.client.logger.error(`❌ Error dando ${currency} a ${userId}:`, error);
            return {
                success: false,
                reason: error.message || 'Error interno'
            };
        }
    }

    async takeCurrency(userId, guildId, currency, amount, reason = 'purchase') {
        try {
            if (!this._isValidCurrency(currency)) {
                return { success: false, reason: 'Moneda no válida' };
            }

            if (!this._isValidAmount(amount)) {
                return { success: false, reason: 'Cantidad inválida' };
            }

            const userLevel = await this._getUserLevel(guildId, userId);

            if (currency === 'coins') {
                if (userLevel.coins < amount) {
                    return { success: false, reason: 'Monedas insuficientes' };
                }
                userLevel.coins -= amount;
            }
            else if (currency === 'tokens') {
                if (userLevel.tokens < amount) {
                    return { success: false, reason: 'Tokens insuficientes' };
                }
                userLevel.tokens -= amount;
            }
            else if (currency === 'xp') {
                if (userLevel.xp < amount) {
                    return { success: false, reason: 'XP insuficiente' };
                }
                userLevel.xp -= amount;
            }

            await userLevel.save();

            return {
                success: true,
                amount,
                currency,
                newBalance:
                    currency === 'coins' ? userLevel.coins :
                        currency === 'tokens' ? userLevel.tokens :
                            userLevel.xp
            };
        } catch (error) {
            this.client.logger.error(`❌ Error quitando ${currency} a ${userId}:`, error);
            return { success: false, reason: error.message || 'Error interno' };
        }
    }

    async transferCurrency(fromUserId, toUserId, guildId, currency, amount, reason = 'transfer') {
        try {
            if (fromUserId === toUserId) {
                return { success: false, reason: 'No puedes transferir a ti mismo' };
            }

            const takeResult = await this.takeCurrency(
                fromUserId,
                guildId,
                currency,
                amount,
                `transferencia_a_${toUserId}`
            );

            if (!takeResult.success) {
                return takeResult;
            }

            const giveResult = await this.giveCurrency(
                toUserId,
                guildId,
                currency,
                amount,
                `transferencia_de_${fromUserId}`
            );

            if (!giveResult.success) {
                await this.giveCurrency(fromUserId, guildId, currency, amount, 'revert_transfer');
                return { success: false, reason: 'Error al dar moneda al destinatario' };
            }

            return {
                success: true,
                amount,
                currency,
                fromUser: fromUserId,
                toUser: toUserId,
                reason
            };
        } catch (error) {
            this.client.logger.error('❌ Error en transferencia:', error);
            return { success: false, reason: error.message || 'Error interno' };
        }
    }

    async giveDailyReward(userId, guildId) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            const now = new Date();

            if (!userLevel.stats) userLevel.stats = {};
            if (!userLevel.stats.streakDays) userLevel.stats.streakDays = 0;

            const lastDaily = userLevel.stats.lastDailyReward
                ? new Date(userLevel.stats.lastDailyReward)
                : null;

            if (lastDaily && lastDaily.toDateString() === now.toDateString()) {
                return {
                    success: false,
                    reason: 'Ya reclamaste tu recompensa diaria',
                    nextReward: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                };
            }

            const yesterday = new Date(now.getTime() - 86400000);
            const hadStreakYesterday =
                userLevel.stats.lastStreak &&
                new Date(userLevel.stats.lastStreak).toDateString() === yesterday.toDateString();

            userLevel.stats.streakDays = hadStreakYesterday
                ? userLevel.stats.streakDays + 1
                : 1;

            const streakDays = userLevel.stats.streakDays;

            const base = EconomyManager.DAILY_BASE_REWARD;

            const streakBonus = Math.floor(
                EconomyManager.DAILY_STREAK_BONUS *
                Math.log2(streakDays + 1)
            );

            const streakMultiplier = 1 + Math.min(streakDays / 100, 0.5);

            const levelScaling = 1 + (userLevel.level * 0.02);

            let totalAmount = Math.floor(
                (base + streakBonus) *
                streakMultiplier *
                levelScaling
            );

            const effectiveMultiplier = userLevel.getEffectiveBoostMultiplier();
            totalAmount = Math.floor(totalAmount * effectiveMultiplier);

            const eventResult = await this._applyEventBonuses(
                userId,
                guildId,
                totalAmount,
                'coins',
                'daily_reward'
            );

            totalAmount = eventResult.finalAmount;

            let luckyBonus = 0;
            if (Math.random() < 0.10) {
                luckyBonus = Math.floor(totalAmount * 0.5);
                totalAmount += luckyBonus;
            }

            let milestoneReward = null;
            const milestone = EconomyManager.STREAK_MILESTONES[streakDays];

            if (milestone) {
                milestoneReward = milestone;

                if (milestone.coins) {
                    userLevel.coins += milestone.coins;
                }

                if (milestone.tokens) {
                    userLevel.tokens += milestone.tokens;
                }
            }

            userLevel.stats.lastDailyReward = now;
            userLevel.stats.lastStreak = now;

            userLevel.coins += totalAmount;

            await userLevel.save();

            return {
                success: true,
                base,
                streakBonus,
                streakMultiplier,
                levelScaling,
                boostMultiplier: effectiveMultiplier,
                eventBonus: eventResult.bonus,
                luckyBonus,
                milestoneReward,
                totalAmount,
                streakDays,
                newBalance: userLevel.coins
            };

        } catch (error) {
            this.client.logger.error(`❌ Error dando daily a ${userId}:`, error);
            return { success: false, reason: error.message || 'Error interno' };
        }
    }

    async getDailyRewardStatus(userId, guildId) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            const now = new Date();

            if (!userLevel.stats) userLevel.stats = {};

            const lastDaily = userLevel.stats.lastDailyReward || new Date(0);
            const streakDays = userLevel.stats.streakDays || 0;

            const canClaim = lastDaily.toDateString() !== now.toDateString();

            let nextDailyMultiplier = 1.0;
            let nextDailyBonus = 0;

            if (this.levelManager?.eventManager) {
                const coinEvent = this.levelManager.eventManager.getActiveEventMultiplier('coins');
                nextDailyMultiplier = coinEvent.multiplier;
                nextDailyBonus = coinEvent.bonus;
            }

            const simulatedStreak = canClaim ? streakDays + 1 : streakDays;

            const base = EconomyManager.DAILY_BASE_REWARD;

            const streakBonus = Math.floor(
                EconomyManager.DAILY_STREAK_BONUS *
                Math.log2(simulatedStreak + 1)
            );

            const streakMultiplier = 1 + Math.min(simulatedStreak / 100, 0.5);
            const levelScaling = 1 + (userLevel.level * 0.02);
            const boostMultiplier = userLevel.getEffectiveBoostMultiplier();

            let estimatedReward = Math.floor(
                (base + streakBonus) *
                streakMultiplier *
                levelScaling *
                boostMultiplier *
                nextDailyMultiplier
            ) + nextDailyBonus;

            return {
                canClaim,
                lastClaimed: lastDaily,
                streakDays,
                nextAvailable: canClaim
                    ? now
                    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
                estimatedReward,
                nextBonusInfo: {
                    multiplier: nextDailyMultiplier,
                    bonus: nextDailyBonus,
                    hasEvent: nextDailyMultiplier > 1.0 || nextDailyBonus > 0
                }
            };

        } catch (error) {
            this.client.logger.error('❌ Error obteniendo daily status:', error);
            return {
                canClaim: true,
                lastClaimed: null,
                streakDays: 0,
                estimatedReward: EconomyManager.DAILY_BASE_REWARD,
                nextBonusInfo: { hasEvent: false }
            };
        }
    }

    async handleLevelUpBonus(userId, guildId, newLevel) {
        try {
            const levelUpCoins = newLevel * 10;
            const coinResult = await this._applyEventBonuses(
                userId, guildId, levelUpCoins, 'coins', 'level_up_bonus'
            );

            await this.giveCurrency(
                userId,
                guildId,
                'coins',
                coinResult.finalAmount,
                'level_up_bonus'
            );

            if (newLevel % 10 === 0) {
                const tokensBonus = Math.floor(newLevel / 10);
                const tokenResult = await this._applyEventBonuses(
                    userId, guildId, tokensBonus, 'tokens', 'level_milestone'
                );

                await this.giveCurrency(
                    userId,
                    guildId,
                    'tokens',
                    tokenResult.finalAmount,
                    'level_milestone'
                );
            }

            const milestone = EconomyManager.MILESTONE_BONUSES[newLevel];
            if (milestone) {
                const coinMilestone = await this._applyEventBonuses(
                    userId, guildId, milestone.coins, 'coins', 'level_milestone_extra'
                );

                const tokenMilestone = await this._applyEventBonuses(
                    userId, guildId, milestone.tokens, 'tokens', 'level_milestone_extra'
                );

                await this.giveCurrency(userId, guildId, 'coins', coinMilestone.finalAmount, 'level_milestone_extra');
                await this.giveCurrency(userId, guildId, 'tokens', tokenMilestone.finalAmount, 'level_milestone_extra');
            }

            return { success: true };
        } catch (error) {
            this.client.logger.error('❌ Error en handleLevelUpBonus:', error);
            return { success: false, reason: error.message };
        }
    }


    async purchaseItem(userId, guildId, itemId, quantity = 1) {
        try {
            if (quantity < 1 || quantity > 100) {
                throw new Error('Cantidad inválida (1-100)');
            }

            const userLevel = await this._getUserLevel(guildId, userId);
            const item = await ShopItem.findOne({ _id: itemId, guildId, active: true });

            if (!item) {
                throw new Error('Item no encontrado o no disponible');
            }

            if (item.stock !== -1 && item.stock < quantity) {
                throw new Error(`Stock insuficiente (disponible: ${item.stock})`);
            }

            const canPurchase = await this.canUserPurchase(userId, guildId, item);
            if (!canPurchase.canBuy) {
                throw new Error(canPurchase.reason);
            }

            const priceInfo = this._calculateFinalPrice(item.price, quantity);

            userLevel.purchaseItem(item, quantity);

            if (item.stock !== -1) {
                item.stock -= quantity;
            }

            item.stats = item.stats || { purchases: 0, totalRevenue: 0 };
            item.stats.purchases += quantity;
            item.stats.totalRevenue += priceInfo.finalPrice;
            item.stats.lastPurchase = new Date();
            await item.save();

            await this.applyItemEffects(userId, guildId, item);

            this.shopItemsCache.delete(`${guildId}-shop-all`);
            this.shopItemsCache.delete(`${guildId}-shop-${item.category}`);

            return {
                success: true,
                item: item.name,
                quantity,
                price: priceInfo.finalPrice,
                originalPrice: priceInfo.originalPrice,
                discount: priceInfo.discount,
                currency: item.currency,
                newBalance:
                    item.currency === 'coins' ? userLevel.coins :
                        item.currency === 'tokens' ? userLevel.tokens :
                            userLevel.xp
            };
        } catch (error) {
            this.client.logger.error(`❌ Error comprando item ${itemId}:`, error);
            throw error;
        }
    }

    async applyItemEffects(userId, guildId, item) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            const member = await this._getMember(guildId, userId);

            switch (item.type) {
                case 'role':
                    if (member && item.data?.roleId) {
                        try {
                            await member.roles.add(item.data.roleId);
                        } catch (err) {
                            this.client.logger.error('❌ Error asignando rol:', err);
                        }
                    }
                    break;

                case 'boost':
                    if (item.data?.multiplier && item.data?.duration) {
                        let finalMultiplier = item.data.multiplier;

                        if (this.levelManager?.eventManager) {
                            const boostEvent = this.levelManager.eventManager
                                .getActiveEvents()
                                .find(e => e.type === 'xp_multiplier');

                            if (boostEvent) {
                                finalMultiplier *= boostEvent.multiplier;
                            }
                        }

                        userLevel.boostMultiplier = finalMultiplier;
                        userLevel.boostExpires = new Date(
                            Date.now() + (item.data.duration * 1000)
                        );
                    }
                    break;
            }

            if (item.effects?.xpBonus && item.effects.xpBonus > 0) {
                const xpResult = await this._applyEventBonuses(
                    userId,
                    guildId,
                    item.effects.xpBonus,
                    'xp',
                    'item_purchase'
                );

                userLevel.xp += xpResult.finalAmount;
            }

        } catch (error) {
            this.client.logger.error('❌ Error aplicando efectos del item:', error);
        }
    }

    async getShopItems(guildId, category = 'all') {
        try {
            const cacheKey = `shop-${category}`;

            if (this._isCacheValid(guildId, cacheKey)) {
                const cached = this.shopItemsCache.get(`${guildId}-${cacheKey}`);
                if (cached) return cached;
            }

            const query = { guildId, active: true };
            if (category !== 'all') {
                query.category = category;
            }

            const items = await ShopItem.find(query)
                .sort({ category: 1, price: 1 })
                .limit(50)
                .lean();

            const saleEvent = this._getActiveSaleEvent();
            const result = {
                items,
                eventDiscounts: saleEvent ? {
                    hasSale: true,
                    discount: saleEvent.discount || 0.2,
                    saleEvent: saleEvent.name
                } : {}
            };

            this.shopItemsCache.set(`${guildId}-${cacheKey}`, result);
            this.lastCacheUpdate.set(`${guildId}-${cacheKey}`, Date.now());

            return result;
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo shop items:', error);
            return { items: [], eventDiscounts: {} };
        }
    }

    async canUserPurchase(userId, guildId, item) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            const member = await this._getMember(guildId, userId);

            if (!member) {
                return { canBuy: false, reason: 'Usuario no encontrado en el servidor' };
            }

            if (item.requirements?.minLevel > 0 && userLevel.level < item.requirements.minLevel) {
                return { canBuy: false, reason: `Requiere nivel ${item.requirements.minLevel}` };
            }

            if (item.requirements?.maxLevel && userLevel.level > item.requirements.maxLevel) {
                return { canBuy: false, reason: `Máximo nivel ${item.requirements.maxLevel}` };
            }

            const requiredRoles = item.requirements?.requiredRoles || [];
            for (const roleId of requiredRoles) {
                if (!member.roles.cache.has(roleId)) {
                    return { canBuy: false, reason: 'No tienes los roles requeridos' };
                }
            }

            const priceInfo = this._calculateFinalPrice(item.price, 1);

            if (item.currency === 'coins' && userLevel.coins < priceInfo.finalPrice) {
                return { canBuy: false, reason: `Necesitas ${priceInfo.finalPrice} monedas` };
            }

            if (item.currency === 'tokens' && userLevel.tokens < priceInfo.finalPrice) {
                return { canBuy: false, reason: `Necesitas ${priceInfo.finalPrice} tokens` };
            }

            if (item.currency === 'xp' && userLevel.xp < priceInfo.finalPrice) {
                return { canBuy: false, reason: `Necesitas ${priceInfo.finalPrice} XP` };
            }

            return { canBuy: true, reason: '', priceInfo };
        } catch (error) {
            this.client.logger.error('❌ Error verificando compra:', error);
            return { canBuy: false, reason: 'Error al verificar requisitos' };
        }
    }

    async giveItem(userId, guildId, itemId, quantity = 1) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            const item = await ShopItem.findOne({ _id: itemId, guildId, active: true });

            if (!item) {
                throw new Error('Item/caja no encontrado');
            }

            await userLevel.addItemToInventory(item, quantity);
            await userLevel.save();

            return { success: true, item: item.name, quantity };
        } catch (error) {
            this.client.logger.error(`❌ Error dando item ${itemId} a ${userId}:`, error);
            return { success: false, reason: error.message };
        }
    }

    // ============================================
    // CONSULTAS DE USUARIO
    // ============================================

    async getUserEconomy(userId, guildId) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);

            // Info de eventos activos
            let eventBonuses = {};
            if (this.levelManager.eventManager) {
                const activeEvents = this.levelManager.eventManager.getActiveEvents();
                const coinMultiplier = this.levelManager.eventManager.getActiveEventMultiplier('coins');
                const tokenMultiplier = this.levelManager.eventManager.getActiveEventMultiplier('tokens');

                eventBonuses = {
                    activeEvents,
                    coinMultiplier: coinMultiplier.multiplier,
                    tokenMultiplier: tokenMultiplier.multiplier,
                    hasCoinEvent: coinMultiplier.multiplier > 1.0,
                    hasTokenEvent: tokenMultiplier.multiplier > 1.0 || tokenMultiplier.bonus > 0
                };
            }

            return {
                coins: userLevel.coins,
                tokens: userLevel.tokens,
                totalSpent: userLevel.purchaseHistory.reduce((sum, p) => sum + (p.price || 0), 0),
                totalEarned: userLevel.transactions
                    .filter(t => t.type === 'earn' || t.type === 'reward')
                    .reduce((sum, t) => sum + (t.amount || 0), 0),
                recentTransactions: userLevel.transactions.slice(-5),
                activeItems: userLevel.activeItems.filter(item => item.active),
                purchaseHistory: userLevel.purchaseHistory.slice(-10),
                activeBoosts: userLevel.getActiveBoosts(),
                eventBonuses,
                dailyAvailable: await this.getDailyRewardStatus(userId, guildId)
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo economía:', error);
            throw error;
        }
    }

    async getUserBalance(userId, guildId) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);

            let eventMultipliers = {};
            if (this.levelManager?.eventManager) {
                const xpEvent = this.levelManager.eventManager.getActiveEventMultiplier('xp');
                const coinEvent = this.levelManager.eventManager.getActiveEventMultiplier('coins');
                const tokenEvent = this.levelManager.eventManager.getActiveEventMultiplier('tokens');

                eventMultipliers = {
                    xp: xpEvent.multiplier,
                    coins: coinEvent.multiplier,
                    tokens: tokenEvent.multiplier
                };
            }

            return {
                coins: userLevel.coins,
                tokens: userLevel.tokens,
                xp: userLevel.xp,
                level: userLevel.level,
                eventMultipliers,
                hasActiveEvents: Object.values(eventMultipliers).some(m => m > 1.0)
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo balance:', error);
            return {
                coins: 0,
                tokens: 0,
                xp: 0,
                level: 1,
                eventMultipliers: {},
                hasActiveEvents: false
            };
        }
    }

    async getInventory(userId, guildId) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            // Filtrar lootboxes del inventario
            const lootboxes = userLevel.inventory
                .filter(item => item.itemType === 'lootbox')
                .map(item => ({
                    name: item.itemName,
                    quantity: item.quantity,
                    acquiredAt: item.acquiredAt
                }));

            return {
                coins: userLevel.coins,
                tokens: userLevel.tokens,
                xp: userLevel.xp,
                level: userLevel.level,
                lootboxes, // ← aquí añadimos las cajas
                activeItems: userLevel.activeItems.filter(item => item.active),
                purchaseHistory: userLevel.purchaseHistory.slice(-10),
                totalSpent: userLevel.purchaseHistory.reduce((sum, p) => sum + (p.price || 0), 0),
                totalEarned: userLevel.transactions
                    .filter(t => t.type === 'earn' || t.type === 'reward')
                    .reduce((sum, t) => sum + (t.amount || 0), 0),
                activeBoosts: userLevel.getActiveBoosts(),
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo inventario:', error);
            throw error;
        }
    }

    async getRecentTransactions(userId, guildId, limit = 10) {
        try {
            const userLevel = await this._getUserLevel(guildId, userId);
            return userLevel.transactions.slice(-Math.min(limit, 100)).reverse();
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo transacciones:', error);
            return [];
        }
    }

    async getTopRichest(guildId, limit = 10) {
        try {
            const richest = await UserLevel.find({ guildId })
                .sort({ coins: -1 })
                .limit(Math.min(limit, 100))
                .select('userId username coins tokens level')
                .lean();

            return richest.map((user, index) => ({
                rank: index + 1,
                userId: user.userId,
                username: user.username || 'Usuario desconocido',
                coins: user.coins || 0,
                tokens: user.tokens || 0,
                level: user.level || 1
            }));
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo top ricos:', error);
            return [];
        }
    }

    // ============================================
    // SISTEMA DE EVENTOS
    // ============================================

    async getCurrentEventStatus(guildId) {
        try {
            if (!this.levelManager?.eventManager) {
                return {
                    hasActiveEvents: false,
                    events: [],
                    multipliers: {},
                    summary: []
                };
            }

            const activeEvents = this.levelManager.eventManager.getActiveEvents();
            const xpMultiplier = this.levelManager.eventManager.getActiveEventMultiplier('xp');
            const coinMultiplier = this.levelManager.eventManager.getActiveEventMultiplier('coins');
            const tokenMultiplier = this.levelManager.eventManager.getActiveEventMultiplier('tokens');

            return {
                hasActiveEvents: activeEvents.length > 0,
                events: activeEvents,
                multipliers: {
                    xp: xpMultiplier,
                    coins: coinMultiplier,
                    tokens: tokenMultiplier
                },
                summary: activeEvents.map(e => `${e.name}: ${this.getEventDetailsForDisplay(e)}`)
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo eventos:', error);
            return {
                hasActiveEvents: false,
                events: [],
                multipliers: {},
                summary: []
            };
        }
    }

    getEventDetailsForDisplay(event) {
        switch (event.type) {
            case 'xp_multiplier':
                return `XP x${event.multiplier || 1.0}`;
            case 'coin_multiplier':
                return `Monedas x${event.multiplier || 1.0}`;
            case 'token_bonus':
                return `+${event.bonus || 0} tokens`;
            case 'sale':
                return `${Math.round((event.discount || 0.2) * 100)}% descuento`;
            default:
                return 'Recompensas especiales';
        }
    }

    // ============================================
    // MÉTODOS DE LIMPIEZA Y MANTENIMIENTO
    // ============================================

    clearShopCache(guildId = null) {
        if (guildId) {
            // Limpiar solo un guild específico
            for (const [key] of this.shopItemsCache) {
                if (key.startsWith(guildId)) {
                    this.shopItemsCache.delete(key);
                    this.lastCacheUpdate.delete(key);
                }
            }
        } else {
            // Limpiar todo el cache
            this.shopItemsCache.clear();
            this.lastCacheUpdate.clear();
        }
    }

    async cleanupExpiredItems() {
        try {
            const result = await UserLevel.cleanupExpiredItems();
            this.client.logger.info(`🧹 Items expirados limpiados: ${result.modifiedCount || 0} usuarios`);
            return result;
        } catch (error) {
            this.client.logger.error('❌ Error limpiando items expirados:', error);
            return { modifiedCount: 0 };
        }
    }

    async logEconomyTransaction(userId, guildId, currency, amount, source) {
        try {
            this.client.logger.info(`💰 ${userId}@${guildId} | +${amount} ${currency} | ${source}`);
        } catch (error) {
        }
    }


}