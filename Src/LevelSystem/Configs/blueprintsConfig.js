
export const BLUEPRINT_CATEGORIES = {
    refine: "refine",
    box: "box",
    economy: "economy",
    special: "special"
};

export const blueprintsConfig = {
    refine_iron_ingot: {
        id: "refine_iron_ingot",
        name: "Refinar Lingote de Hierro",
        emoji: "<:hierro:1472711813517807732>",
        description: "Convierte hierro bruto en lingote refinado.",
        category: "refine",
        requiredLevel: 1,
        successRate: 0.95,
        craftingCostCoins: 5,
        craftingCostTokens: 0,
        requires: [
            { materialId: "iron_ore", quantity: 20 },
            { materialId: "coal", quantity: 15 }
        ],
        result: {
            type: "material",
            materialId: "iron_ingot",
            quantity: 1
        }
    },
    refine_gold_ingot: {
        id: "refine_gold_ingot",
        name: "Refinar Lingote de Oro",
        emoji: "<:oro:1472711503458341059>",
        description: "Refina oro en un lingote valioso.",
        category: "refine",
        requiredLevel: 5,
        successRate: 0.85,
        craftingCostCoins: 20,
        craftingCostTokens: 0,
        requires: [
            { materialId: "gold_ore", quantity: 2 },
            { materialId: "coal", quantity: 1 }
        ],
        result: {
            type: "material",
            materialId: "gold_ingot",
            quantity: 1
        }
    },
    basic_craft_box: {
        id: "basic_craft_box",
        name: "Caja Común",
        emoji: "<:cajaregalocomun:1473075376430383277>",
        description: "Caja común creada con materiales comunes.",
        category: "box",
        requiredLevel: 2,
        successRate: 0.9,
        craftingCostCoins: 25,
        craftingCostTokens: 0,
        requires: [
            { materialId: "iron_ingot", quantity: 4 },
            { materialId: "coal", quantity: 2 }
        ],
        result: {
            type: "lootbox",
            boxType: "common",
            name: "Caja Común",
            quantity: 1
        }
    },
    rare_craft_box: {
        id: "rare_craft_box",
        name: "Caja Rara",
        emoji: "<:cajaregalorara:1473075668945342589>",
        description: "Caja rara con mejores recompensas.",
        category: "box",
        requiredLevel: 6,
        successRate: 0.8,
        craftingCostCoins: 100,
        craftingCostTokens: 5,
        requires: [
            { materialId: "gold_ingot", quantity: 3 },
            { materialId: "iron_ingot", quantity: 5 }
        ],
        result: {
            type: "lootbox",
            boxType: "rare",
            name: "Caja Rara",
            quantity: 1
        }
    },
    epic_craft_box: {
        id: "epic_craft_box",
        name: "Caja Épica",
        emoji: "<:cajaregaloepica:1473075808732975187>",
        description: "Caja épica creada con materiales raros.",
        category: "box",
        requiredLevel: 12,
        successRate: 0.7,
        craftingCostCoins: 200,
        craftingCostTokens: 15,
        requires: [
            { materialId: "gold_ingot", quantity: 5 },
            { materialId: "mythril_ore", quantity: 2 },
            { materialId: "obsidian_fragment", quantity: 2 }
        ],
        result: {
            type: "lootbox",
            boxType: "epic",
            name: "Caja Épica",
            quantity: 1
        }
    },
    legendary_craft_box: {
        id: "legendary_craft_box",
        name: "Caja Legendaria",
        emoji: "<:cajaregalolegendaria:1473075925854715916>",
        description: "Caja Legendaria creada con materiales raros.",
        category: "box",
        requiredLevel: 12,
        successRate: 0.7,
        craftingCostCoins: 200,
        craftingCostTokens: 15,
        requires: [
            { materialId: "gold_ingot", quantity: 8 },
            { materialId: "mythril_ore", quantity: 4 },
            { materialId: "obsidian_fragment", quantity: 3 }
        ],
        result: {
            type: "lootbox",
            boxType: "legendary",
            name: "Caja Legendaria",
            quantity: 1
        }
    },
    mythic_craft_box: {
        id: "mythic_craft_box",
        name: "Caja Mítica",
        emoji: "<:cajaregalomitica:1473076534301692105>",
        description: "Caja Mítica creada con materiales raros.",
        category: "box",
        requiredLevel: 12,
        successRate: 0.7,
        craftingCostCoins: 200,
        craftingCostTokens: 15,
        requires: [
            { materialId: "gold_ingot", quantity: 10 },
            { materialId: "mythril_ore", quantity: 6 },
            { materialId: "obsidian_fragment", quantity: 5 }
        ],
        result: {
            type: "lootbox",
            boxType: "mythic",
            name: "Caja Mítica",
            quantity: 1
        }
    },
    coin_bundle_small: {
        id: "coin_bundle_small",
        name: "Bolsa de Monedas",
        emoji: "<:bolsademonedas:1473079390081519864>",
        description: "Intercambia materiales por monedas.",
        category: "economy",
        requiredLevel: 3,
        successRate: 1.0,
        craftingCostCoins: 0,
        craftingCostTokens: 0,
        requires: [
            { materialId: "iron_ingot", quantity: 3 }
        ],
        result: {
            type: "coins",
            quantity: 350
        }
    },
    token_fragment: {
        id: "token_fragment",
        name: "Fragmentos de Token",
        emoji: "<:bolsadetokens:1473079867439321293>",
        description: "Convierte materiales raros en tokens.",
        category: "economy",
        requiredLevel: 8,
        successRate: 0.85,
        craftingCostCoins: 50,
        craftingCostTokens: 0,
        requires: [
            { materialId: "gold_ingot", quantity: 2 },
            { materialId: "arcane_crystal", quantity: 1 }
        ],
        result: {
            type: "tokens",
            quantity: 300
        }
    },
    coin_bundle_virtual: {
        id: "coin_bundle_virtual",
        name: "Monedas (Crafting)",
        emoji: "🪙",
        rarity: "common",
        weight: 0,
        baseValue: 1,
        xpGain: 0,
        tradeable: false,
        description: "Monedas generadas por crafting.",
        sources: ["crafting"]
    },
    token_fragment_virtual: {
        id: "token_fragment_virtual",
        name: "Tokens (Crafting)",
        emoji: "💎",
        rarity: "rare",
        weight: 0,
        baseValue: 1,
        xpGain: 0,
        tradeable: false,
        description: "Tokens generados por crafting.",
        sources: ["crafting"]
    }


};
