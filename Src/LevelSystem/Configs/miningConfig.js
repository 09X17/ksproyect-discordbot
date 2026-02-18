export const miningConfig = {
    cooldownMs: 60 * 1000, 
    zones: {
        forest_mine: {
            id: "forest_mine",
            name: "Mina del Bosque",
            emoji: "<:hojaseca:1472709274261131295>",
            description: "Zona inicial con minerales básicos.",
            minLevel: 1,
            requiredToolTier: 1,
            baseQuantity: { min: 1, max: 3 },
            durabilityCost: 1,
            drops: [
                { materialId: "stone", weight: 40 },
                { materialId: "coal", weight: 30 },
                { materialId: "copper_ore", weight: 20 },
                { materialId: "iron_ore", weight: 10 }
            ]
        },
        deep_cave: {
            id: "deep_cave",
            name: "Cueva Profunda",
            emoji: "<:cueva:1472709384479178969>",
            description: "Minerales más valiosos y compactos.",
            minLevel: 5,
            requiredToolTier: 2,
            baseQuantity: { min: 2, max: 4 },
            durabilityCost: 2,
            drops: [
                { materialId: "iron_ore", weight: 35 },
                { materialId: "silver_ore", weight: 25 },
                { materialId: "gold_ore", weight: 15 },
                { materialId: "crystal_shard", weight: 10 }
            ]
        },
        frozen_mountain: {
            id: "frozen_mountain",
            name: "Montaña Helada",
            emoji: "<:montaa:1472709541656395929> ",
            description: "Zona fría con minerales raros.",
            minLevel: 10,
            requiredToolTier: 2,
            baseQuantity: { min: 2, max: 5 },
            durabilityCost: 2,
            drops: [
                { materialId: "silver_ore", weight: 30 },
                { materialId: "gold_ore", weight: 20 },
                { materialId: "frost_crystal", weight: 15 },
                { materialId: "mythril_ore", weight: 8 }
            ]
        },
        volcanic_core: {
            id: "volcanic_core",
            name: "Núcleo Volcánico",
            emoji: "<:volcan:1472709689925177583>",
            description: "Minerales de alto riesgo y alto valor.",
            minLevel: 15,
            requiredToolTier: 3,
            baseQuantity: { min: 3, max: 6 },
            durabilityCost: 3,
            drops: [
                { materialId: "obsidian_fragment", weight: 30 },
                { materialId: "mythril_ore", weight: 20 },
                { materialId: "dragon_crystal", weight: 8 },
                { materialId: "arcane_crystal", weight: 4 }
            ]
        },
        arcane_abyss: {
            id: "arcane_abyss",
            name: "Abismo Arcano",
            emoji: "<:galaxiaespiral:1472709902907736214>",
            description: "Zona legendaria con materiales míticos.",
            minLevel: 20,
            requiredToolTier: 4,
            baseQuantity: { min: 4, max: 7 },
            durabilityCost: 4,
            drops: [
                { materialId: "arcane_crystal", weight: 20 },
                { materialId: "void_essence", weight: 10 },
                { materialId: "ancient_core", weight: 5 }
            ]
        }
    }
};
