export const TOOL_RARITIES = {
    common: {
        label: "Común",
        color: "#9CA3AF",
        repairMultiplier: 1
    },
    uncommon: {
        label: "Poco Común",
        color: "#22C55E",
        repairMultiplier: 1.2
    },
    rare: {
        label: "Raro",
        color: "#3B82F6",
        repairMultiplier: 1.5
    },
    epic: {
        label: "Épico",
        color: "#A855F7",
        repairMultiplier: 2
    },
    legendary: {
        label: "Legendario",
        color: "#F59E0B",
        repairMultiplier: 3
    }
};

export const toolsConfig = {
    basic_pickaxe: {
        id: "basic_pickaxe",
        name: "Pico Básico",
        emoji: "<:basic_pick:1472708132042965062>",
        rarity: "common",
        minLevel: 1,
        maxDurability: 100,
        tradeable: true,
        description: "Una herramienta básica para comenzar a minar.",
        bonus: {
            quantityMultiplier: 1.05,
            rareChanceBonus: 0,
            qualityBonus: 0
        },
        repair: {
            baseCostCoins: 50,
            materialCost: []
        }
    },
    reinforced_pickaxe: {
        id: "reinforced_pickaxe",
        name: "Pico Reforzado",
        emoji: "<:reinforced_pick:1472708131057434624>",
        rarity: "uncommon",
        minLevel: 5,
        maxDurability: 150,
        tradeable: true,
        description: "Un pico más resistente con mejor rendimiento.",
        bonus: {
            quantityMultiplier: 1.1,
            rareChanceBonus: 0.02,
            qualityBonus: 3
        },
        repair: {
            baseCostCoins: 120,
            materialCost: [
                { materialId: "iron_ingot", quantity: 2 }
            ]
        }
    },
    golden_pickaxe: {
        id: "golden_pickaxe",
        name: "Pico Dorado",
        emoji: "<:golden_pick:1472708129459408906>",
        rarity: "rare",
        minLevel: 10,
        maxDurability: 200,
        tradeable: true,
        description: "Un pico elegante con alta eficiencia.",
        bonus: {
            quantityMultiplier: 1.15,
            rareChanceBonus: 0.05,
            qualityBonus: 5
        },
        repair: {
            baseCostCoins: 300,
            materialCost: [
                { materialId: "gold_ingot", quantity: 2 }
            ]
        }
    },
    mythic_pickaxe: {
        id: "mythic_pickaxe",
        name: "Pico Místico",
        emoji: "<:mythic_pick:1472708128524079230>",
        rarity: "epic",
        minLevel: 15,
        maxDurability: 250,
        tradeable: false,
        description: "Un pico imbuido con energía arcana.",
        bonus: {
            quantityMultiplier: 1.25,
            rareChanceBonus: 0.1,
            qualityBonus: 8
        },
        repair: {
            baseCostCoins: 600,
            materialCost: [
                { materialId: "mythril", quantity: 1 },
                { materialId: "arcane_crystal", quantity: 1 }
            ]
        }
    },
    celestial_pickaxe: {
        id: "celestial_pickaxe",
        name: "Pico Celestial",
        emoji: "<:celestial_pick:1472708127446269952>",
        rarity: "legendary",
        minLevel: 25,
        maxDurability: 300,
        tradeable: false,
        description: "Una herramienta divina capaz de extraer lo imposible.",
        bonus: {
            quantityMultiplier: 1.35,
            rareChanceBonus: 0.15,
            qualityBonus: 12
        },
        repair: {
            baseCostCoins: 1200,
            materialCost: [
                { materialId: "arcane_crystal", quantity: 2 }
            ]
        }
    }

};


export function getToolConfig(toolId) {
    return toolsConfig[toolId] || null;
}

export function getToolsByRarity(rarity) {
    return Object.values(toolsConfig)
        .filter(tool => tool.rarity === rarity);
}
