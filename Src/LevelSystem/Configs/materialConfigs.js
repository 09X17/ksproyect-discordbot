export const MATERIAL_RARITIES = {
    common: {
        label: "Común",
        color: "#9CA3AF",
        multiplier: 1
    },
    uncommon: {
        label: "Poco Común",
        color: "#22C55E",
        multiplier: 1.5
    },
    rare: {
        label: "Raro",
        color: "#3B82F6",
        multiplier: 2.5
    },
    epic: {
        label: "Épico",
        color: "#A855F7",
        multiplier: 4
    },
    legendary: {
        label: "Legendario",
        color: "#F59E0B",
        multiplier: 7
    },
    mythic: {
        label: "Mítico",
        color: "#EF4444",
        multiplier: 12
    }
};

export const materialsConfig = {
    iron_ore: {
        id: "iron_ore",
        name: "Mena de Hierro",
        emoji: "<:mineraldehierro:1473072443273777294>",
        rarity: "common",
        weight: 2,
        baseValue: 10,
        xpGain: 5,
        minLevel: 1,
        tradeable: true,
        refinableInto: "iron_ingot",
        description: "Mineral básico usado para fabricar lingotes.",
        sources: ["mining_job", "basic_lootbox"]
    },
    copper_ore: {
        id: "copper_ore",
        name: "Mena de Cobre",
        emoji: "<:mineraldecobre:1473072841036529797>",
        rarity: "common",
        weight: 2,
        baseValue: 8,
        xpGain: 4,
        minLevel: 1,
        tradeable: true,
        refinableInto: "copper_ingot",
        description: "Mineral ligero usado en crafting básico.",
        sources: ["mining_job"]
    },
    silver_ore: {
        id: "silver_ore",
        name: "Mena de Plata",
        emoji: "<:mineraplata:1473084429424529540>",
        rarity: "common",
        weight: 2,
        baseValue: 8,
        xpGain: 4,
        minLevel: 1,
        tradeable: true,
        refinableInto: "copper_ingot",
        description: "Mineral ligero usado en crafting básico.",
        sources: ["mining_job"]
    },
    coal: {
        id: "coal",
        name: "Mena de Carbón",
        emoji: "<:mineraldecarbon:1473073130019885238>",
        rarity: "common",
        weight: 1,
        baseValue: 6,
        xpGain: 3,
        minLevel: 1,
        tradeable: true,
        description: "Combustible esencial para refinado.",
        sources: ["mining_job"]
    },
    stone: {
        id: "stone",
        name: "Piedra",
        emoji: "<:roca:1473072620353355980>",
        rarity: "common",
        weight: 3,
        baseValue: 4,
        xpGain: 2,
        minLevel: 1,
        tradeable: true,
        description: "Material básico de construcción.",
        sources: ["mining_job"]
    },
    gold_ore: {
        id: "gold_ore",
        name: "Mena de Oro",
        emoji: "<:mineraldeoro:1473072441889652969>",
        rarity: "rare",
        weight: 2,
        baseValue: 50,
        xpGain: 15,
        minLevel: 5,
        tradeable: true,
        refinableInto: "gold_ingot",
        description: "Mineral valioso con alto valor económico.",
        sources: ["mining_job", "rare_lootbox"]
    },
    obsidian_fragment: {
        id: "obsidian_fragment",
        name: "Fragmento de Obsidiana",
        emoji: "<:mineraldeobsidiana:1473073412942336013>",
        rarity: "epic",
        weight: 3,
        baseValue: 120,
        xpGain: 25,
        minLevel: 10,
        tradeable: true,
        description: "Material volcánico usado en objetos oscuros.",
        sources: ["black_market", "epic_lootbox"]
    },
    mythril_ore: {
        id: "mythril_ore",
        name: "Ore de Mythril",
        emoji: "<:mineraldemythril:1473073754010554388>",
        rarity: "epic",
        weight: 2,
        baseValue: 150,
        xpGain: 30,
        minLevel: 10,
        tradeable: true,
        description: "Metal mágico extremadamente resistente.",
        sources: ["high_mining_job", "epic_lootbox"]
    },
    crystal_shard: {
        id: "crystal_shard",
        name: "Fragmento de Cristal",
        emoji: "<:fragmentodecristal:1473084823655546961>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    frost_crystal: {
        id: "frost_crystal",
        name: "Cristal Helado",
        emoji: "<:cristalhelado:1473085442759852245>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    dragon_crystal: {
        id: "dragon_crystal",
        name: "Fragmento Cristal de Dragón",
        emoji: "<:fragmentodedragon:1473086119791952014>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    arcane_crystal: {
        id: "arcane_crystal",
        name: "Cristal Arcano",
        emoji: "<:cristalarcano:1473074508989727032>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    ancient_core: {
        id: "ancient_core",
        name: "Fragmento Antiguo",
        emoji: "<:ancient_core:1473087373205180516>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    void_essence: {
        id: "void_essence",
        name: "Esencia del Vacio",
        emoji: "<:void_essence:1473087379593236541>",
        rarity: "legendary",
        weight: 1,
        baseValue: 300,
        xpGain: 50,
        minLevel: 10,
        tradeable: false,
        description: "Cristal mágico usado en crafting avanzado.",
        sources: ["legendary_lootbox", "event_reward"]
    },
    iron_ingot: {
        id: "iron_ingot",
        name: "Lingote de Hierro",
        emoji: "<:hierro:1472711813517807732>",
        rarity: "uncommon",
        weight: 2,
        baseValue: 25,
        xpGain: 10,
        minLevel: 2,
        tradeable: true,
        description: "Lingote refinado de hierro.",
        sources: ["refining"]
    },
    gold_ingot: {
        id: "gold_ingot",
        name: "Lingote de Oro",
        emoji: "<:oro:1472711503458341059>",
        rarity: "rare",
        weight: 2,
        baseValue: 100,
        xpGain: 25,
        minLevel: 6,
        tradeable: true,
        description: "Lingote refinado de oro.",
        sources: ["refining"]
    }

};

export function getMaterialByRarity(rarity) {
    return Object.values(materialsConfig)
        .filter(mat => mat.rarity === rarity);
}

export function getRandomMaterialBySource(source) {
    const pool = Object.values(materialsConfig)
        .filter(mat => mat.sources?.includes(source));

    if (!pool.length) return null;

    return pool[Math.floor(Math.random() * pool.length)];
}
