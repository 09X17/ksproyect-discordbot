import { miningConfig } from "../Configs/miningConfig.js";
import { materialsConfig } from "../Configs/materialConfigs.js";

export default class MiningManager {

    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    /* =========================================
       🎲 Weighted Roll
    ========================================= */

    rollWeighted(pool) {
        const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const item of pool) {
            roll -= item.weight;
            if (roll <= 0) return item;
        }

        return pool[0];
    }

    /* =========================================
       ⛏️ Mine (Sistema por Zonas)
    ========================================= */

    async mine(user) {

        const now = new Date();

        /* =============================
           ⏳ Cooldown
        ============================= */

        const cdCheck = user.canMine();

        if (!cdCheck.allowed) {
            return {
                success: false,
                reason: "cooldown",
                cooldownRemaining: cdCheck.remaining
            };
        }

        /* =============================
           🌍 Obtener Zona Activa
        ============================= */

        const zoneId = user.crafting?.activeZone || "forest_mine";
        const zone = miningConfig.zones[zoneId];

        if (!zone) {
            return { success: false, reason: "invalid_zone" };
        }

        /* =============================
           📈 Validar Nivel
        ============================= */

        if (user.level < zone.minLevel) {
            return {
                success: false,
                reason: "level_required",
                requiredLevel: zone.minLevel
            };
        }

        /* =============================
           🛠 Obtener herramienta equipada
        ============================= */

        const equippedTool = user.crafting?.tools?.find(
            t => t.toolId === user.crafting.equippedToolId
        );

        if (!equippedTool) {
            return {
                success: false,
                reason: "no_tool_equipped"
            };
        }

        if (equippedTool.tier < zone.requiredToolTier) {
            return {
                success: false,
                reason: "tool_tier_required",
                requiredTier: zone.requiredToolTier
            };
        }

        if (equippedTool.durability <= 0) {
            return {
                success: false,
                reason: "tool_broken"
            };
        }

        /* =============================
           📦 Drop Pool de la Zona
        ============================= */

        let dropPool = [...zone.drops];

        /* =============================
           ⚒ Bonus por Job Minero
        ============================= */

        const activeJob = user.getActiveJob?.();

        if (activeJob?.jobId === "miner") {
            dropPool = dropPool.map(drop => ({
                ...drop,
                weight: drop.weight + 5
            }));
        }

        /* =============================
           🎲 Seleccionar Material
        ============================= */

        let selected = this.rollWeighted(dropPool);
        let materialConfig = materialsConfig[selected.materialId];

        /* =============================
           📦 Cantidad Base Zona
        ============================= */

        let quantity = Math.floor(
            Math.random() *
            (zone.baseQuantity.max - zone.baseQuantity.min + 1)
            + zone.baseQuantity.min
        );

        let quality = Math.floor(Math.random() * 31) + 70; // 70–100

        /* =============================
           🛠 Aplicar Bonus Herramienta
        ============================= */

        if (equippedTool.bonus?.quantityMultiplier) {
            quantity = Math.floor(
                quantity * equippedTool.bonus.quantityMultiplier
            );
        }

        // Bonus rare chance
        if (equippedTool.bonus?.rareChanceBonus > 0) {

            const extraRoll = Math.random();

            if (extraRoll < equippedTool.bonus.rareChanceBonus) {

                const rarePool = zone.drops
                    .filter(d => d.weight < 15); // simple lógica de rare

                if (rarePool.length > 0) {
                    const forcedRare = this.rollWeighted(rarePool);
                    selected = forcedRare;
                    materialConfig = materialsConfig[selected.materialId];
                }
            }
        }

        // Bonus calidad
        if (equippedTool.bonus?.qualityBonus) {
            quality += equippedTool.bonus.qualityBonus;
            if (quality > 100) quality = 100;
        }

        /* =============================
           🔻 Reducir Durabilidad
        ============================= */

        equippedTool.durability -= zone.durabilityCost;

        let toolBroken = false;

        if (equippedTool.durability <= 0) {
            equippedTool.durability = 0;
            user.crafting.equippedToolId = null;
            toolBroken = true;
        }

        /* =============================
           📦 Añadir Material
        ============================= */

        try {
            await user.addMaterial(selected.materialId, quantity, {
                origin: zoneId,
                quality
            });
        } catch (err) {
            return {
                success: false,
                reason: "inventory_full"
            };
        }

        /* =============================
           📊 Actualizar Estadísticas
        ============================= */

        user.crafting.stats.minedMaterials += quantity;
        user.crafting.stats.miningSessions += 1;

        const tierCooldownMap = {
            1: 5, // 5 minutos
            2: 4,
            3: 3,
            4: 2
        };

        const minutes = tierCooldownMap[equippedTool.tier] ?? 5;

        await user.applyMiningCooldown(minutes);

        /* =============================
           💾 Guardar
        ============================= */

        user.markModified("crafting");
        await user.save();

        /* =============================
           📤 Resultado Final
        ============================= */

        return {
            success: true,
            zone: {
                id: zone.id,
                name: zone.name
            },
            material: {
                id: selected.materialId,
                name: materialConfig?.name,
                emoji: materialConfig?.emoji,
                rarity: materialConfig?.rarity
            },
            quantity,
            quality,
            toolUsed: {
                id: equippedTool.toolId,
                name: equippedTool.name,
                rarity: equippedTool.rarity,
                durability: equippedTool.durability,
                maxDurability: equippedTool.maxDurability
            },
            toolBroken
        };
    }

    async setMiningZone(user, zoneId) {

        const zone = miningConfig.zones[zoneId];

        if (!zone) {
            return {
                success: false,
                reason: "invalid_zone"
            };
        }

        /* =============================
           📈 Validar Nivel
        ============================= */

        if (user.level < zone.minLevel) {
            return {
                success: false,
                reason: "level_required",
                requiredLevel: zone.minLevel
            };
        }

        /* =============================
           🛠 Validar Herramienta
        ============================= */

        const equippedTool = user.crafting?.tools?.find(
            t => t.toolId === user.crafting.equippedToolId
        );


        if (!equippedTool) {
            return {
                success: false,
                reason: "no_tool_equipped"
            };
        }

        if (equippedTool.tier < zone.requiredToolTier) {
            return {
                success: false,
                reason: "tool_tier_required",
                requiredTier: zone.requiredToolTier
            };
        }

        /* =============================
           🔄 Cambiar Zona
        ============================= */

        user.crafting.activeZone = zoneId;

        user.markModified("crafting");
        await user.save();

        return {
            success: true,
            zone: {
                id: zone.id,
                name: zone.name,
                minLevel: zone.minLevel,
                requiredToolTier: zone.requiredToolTier
            }
        };
    }

}
