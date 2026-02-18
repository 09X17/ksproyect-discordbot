import { blueprintsConfig } from "../Configs/blueprintsConfig.js";

export default class CraftingManager {

    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
    }

    async craft(user, blueprintId) {

        const blueprint = blueprintsConfig[blueprintId];
        if (!blueprint)
            return { success: false, reason: "invalid_blueprint" };

        /* =========================
           📈 Validar Nivel
        ========================= */

        if (user.level < blueprint.requiredLevel) {
            return {
                success: false,
                reason: "level_required",
                requiredLevel: blueprint.requiredLevel
            };
        }

        /* =========================
           💰 Validar Costos
        ========================= */

        if (user.coins < blueprint.craftingCostCoins)
            return { success: false, reason: "not_enough_coins" };

        if (user.tokens < blueprint.craftingCostTokens)
            return { success: false, reason: "not_enough_tokens" };

        /* =========================
           📦 Validar Materiales
        ========================= */

        if (!user.hasMaterials(blueprint.requires))
            return { success: false, reason: "missing_materials" };

        /* =========================
           🎯 Calcular Probabilidad
        ========================= */

        const qualityBonus = user.getCraftQualityBonus(blueprint.requires);
        const finalSuccessRate = Math.min(
            blueprint.successRate + qualityBonus,
            0.99
        );

        const roll = Math.random();
        const success = roll <= finalSuccessRate;

        /* =========================
           💸 Descontar Costos
        ========================= */

        user.coins -= blueprint.craftingCostCoins;
        user.tokens -= blueprint.craftingCostTokens;

        /* =========================
           🔥 Consumir Materiales
        ========================= */

        user.consumeMaterials(blueprint.requires);

        /* =========================
           🎁 Aplicar Resultado
        ========================= */

        let rewardData = null;

        if (success) {

            rewardData = await this.applyResult(user, blueprint.result);

            user.crafting.stats.craftedItems++;

        } else {
            user.crafting.stats.failedCrafts++;
        }

        user.markModified("crafting");
        await user.save();

        return {
            success: true,
            crafted: success,
            successRate: finalSuccessRate,
            blueprint,
            reward: rewardData
        };
    }

    /* =========================================
       🎁 Aplicar Resultado
    ========================================= */

    async applyResult(user, result) {

        switch (result.type) {

            case "material":
                await user.addMaterial(result.materialId, result.quantity);
                return {
                    type: "material",
                    materialId: result.materialId,
                    quantity: result.quantity
                };

            case "lootbox":
                await user.addLootBoxToInventory(
                    result.boxType,
                    result.name,
                    result.quantity
                );
                return {
                    type: "lootbox",
                    name: result.name,
                    quantity: result.quantity
                };

            case "coins":
                // 🔥 En vez de ir al balance normal,
                // lo agregamos como material especial
                await user.addMaterial(
                    "coin_bundle_virtual",
                    result.quantity,
                    { origin: "crafting" }
                );
                return {
                    type: "coins_inventory",
                    quantity: result.quantity
                };

            case "tokens":
                await user.addMaterial(
                    "token_fragment_virtual",
                    result.quantity,
                    { origin: "crafting" }
                );
                return {
                    type: "tokens_inventory",
                    quantity: result.quantity
                };

            default:
                throw new Error("Resultado no soportado");
        }
    }


    getBlueprint(id) {
        return blueprintsConfig[id] ?? null;
    }

    getAvailableBlueprints(user) {
        return Object.values(blueprintsConfig)
            .filter(bp => user.level >= bp.requiredLevel);
    }

    canCraft(user, blueprintId) {

        const blueprint = blueprintsConfig[blueprintId];
        if (!blueprint)
            return { can: false, reason: "invalid_blueprint" };

        if (user.level < blueprint.requiredLevel)
            return { can: false, reason: "level_required" };

        if (user.coins < blueprint.craftingCostCoins)
            return { can: false, reason: "not_enough_coins" };

        if (user.tokens < blueprint.craftingCostTokens)
            return { can: false, reason: "not_enough_tokens" };

        if (!user.hasMaterials(blueprint.requires))
            return { can: false, reason: "missing_materials" };

        return { can: true };
    }

    async upgradeCraftingCapacity(userId, guildId, amount, cost) {
        const user = await this.getOrCreateUserLevel(guildId, userId);
        return await user.upgradeCraftingCapacity(amount, cost);
    }

}
