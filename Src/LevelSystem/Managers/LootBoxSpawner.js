export default class LootBoxSpawner {
    constructor(client, lootBoxManager, levelManager, boostManager, eventManager) {
        this.client = client;
        this.lootBoxManager = lootBoxManager;
        this.levelManager = levelManager;
        this.boostManager = boostManager;
        this.eventManager = eventManager;
    }

    async checkForLootBox(message) {
        try {
            if (!message.guild || message.author.bot) return;

            const guildId = message.guild.id;
            const userId = message.author.id;
            const channelId = message.channel.id;

            /* ─────────────── BLOQUEOS ─────────────── */

            // Ya hay caja en el canal
            if (this.lootBoxManager.hasActiveBoxInChannel(guildId, channelId)) {
                return { spawned: false };
            }

            // Cooldown por usuario (30s)
            const lastSpawn = this.lootBoxManager.userCooldowns.get(userId);
            if (lastSpawn && Date.now() - lastSpawn < 30_000) {
                return { spawned: false };
            }

            /* ─────────────── PROBABILIDAD DE SPAWN ─────────────── */

            // REDUCIR la probabilidad base significativamente
            let chance = 0.008; // 0.8% base (antes 2%)

            // Nivel - REDUCIR impacto
            const userLevel = await this.levelManager.getOrCreateUserLevel(guildId, userId);
            chance += Math.min(userLevel.level * 0.0003, 0.01); // máx +1% (antes +2%)

            // Actividad - REDUCIR impacto
            const messagesToday = userLevel.stats?.messagesToday || 0;
            chance += Math.min(messagesToday * 0.0002, 0.008); // máx +0.8% (antes +1.5%)

            // Boost - MENOR multiplicador
            const boostMultiplier = await this.boostManager.getEffectiveBoostMultiplier(userId, guildId);
            if (boostMultiplier > 1) {
                chance *= 1.1; // +10% (antes +20%)
            }

            // Eventos - VERIFICAR que no sean demasiado potentes
            if (this.eventManager) {
                const activeEvents = this.eventManager.getActiveEvents(guildId);

                if (Array.isArray(activeEvents)) {
                    const boxEvent = activeEvents.find(e => e.type === 'box_bonus');
                    if (boxEvent) {
                        // Limitar el multiplicador máximo
                        const multiplier = Math.min(boxEvent.multiplier || 1, 3);
                        chance *= multiplier;
                    }
                }
            }

            // Límite absoluto MUCHO más bajo
            chance = Math.min(chance, 0.15); // Máximo 15% (antes 100%)

            /* ─────────────── RNG FINAL ─────────────── */

            const roll = Math.random();

            // console.log(`[LOOTBOX] Roll=${roll.toFixed(3)} Chance=${(chance * 100).toFixed(2)}%`);

            if (roll > chance) {
                console.log('[LOOTBOX] No spawn → RNG fail');
                return { spawned: false };
            }

            /* ─────────────── TIPO DE CAJA ─────────────── */

            const boxType = this.pickBoxType();

            this.client.logger.info(` 📦 BOX SPAWN → ${boxType} GUILD: ${guildId}/${channelId}`);

            await this.lootBoxManager.spawnBox(
                guildId,
                message.channel,
                boxType,
                message
            );

            this.lootBoxManager.userCooldowns.set(userId, Date.now());

            return {
                spawned: true,
                type: boxType
            };

            this.lootBoxManager.userCooldowns.set(userId, Date.now());
            setTimeout(() => {
                this.lootBoxManager.channelCooldowns?.delete(channelId);
            }, 60_000);

        } catch (error) {
            this.client.logger.error('❌ Error en LootBoxSpawner:', error);
        }
    }

    pickBoxType() {
        const r = Math.random() * 100; // 0 a 100%
        if (r < 0.5) return 'divine';          // 0.5%
        if (r < 1.5) return 'mythic';          // 1%
        if (r < 2.5) return 'fortune';         // 1%
        if (r < 4.5) return 'xp_boost';        // 2%
        if (r < 11.5) return 'mystery';        // 7%
        if (r < 19.5) return 'legendary';      // 8%
        if (r < 31.5) return 'epic';           // 12%
        if (r < 49.5) return 'rare';           // 18%
        if (r < 69.5) return 'uncommon';       // 20%
        return 'common';                        // 30.5%
    }


}
