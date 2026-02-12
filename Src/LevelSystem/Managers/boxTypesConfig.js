export const boxTypes = {
    common: {
        name: 'Caja Común',
        color: '#7289DA',
        emoji: '<:cajacomun:1457160969921888420>',
        spawnChance: 0.05,
        duration: 30000,
        cost: 100,
        lucky: {
            chance: 0.03,
            minMultiplier: 1,
            maxMultiplier: 2
        },
        extraDrops: {
            chance: 0.10,
            maxExtra: 1
        },
        rewards: [
            { type: 'coins', min: 25, max: 35, weight: 50 },
            { type: 'tokens', min: 4, max: 8, weight: 40 }
        ]
    },

    uncommon: {
        name: 'Caja Poco Común',
        color: '#2ECC71',
        emoji: '<:pococomun:1461837881915215994>',
        spawnChance: 0.03,
        duration: 35000,
        cost: 150,
        lucky: {
            chance: 0.05,
            minMultiplier: 1,
            maxMultiplier: 2
        },

        extraDrops: {
            chance: 0.15,
            maxExtra: 1
        },
        rewards: [
            { type: 'coins', min: 35, max: 45, weight: 50 },
            { type: 'tokens', min: 8, max: 12, weight: 40 }
        ]
    },

    rare: {
        name: 'Caja Rara',
        color: '#9B59B6',
        emoji: '<:cajarara:1457161230837092444>',
        spawnChance: 0.02,
        duration: 45000,
        cost: 250,
        lucky: {
            chance: 0.08,
            minMultiplier: 1,
            maxMultiplier: 2
        },
        extraDrops: {
            chance: 0.20,
            maxExtra: 2
        },
        pity: {
            threshold: 5,
            upgradeTo: 'epic'
        },
        rewards: [
            { type: 'coins', min: 45, max: 55, weight: 50 },
            { type: 'tokens', min: 12, max: 16, weight: 40 }
        ]
    },

    epic: {
        name: 'Caja Épica',
        color: '#E056FD',
        emoji: '<:epica:1461838026064924702>',
        spawnChance: 0.01,
        duration: 50000,
        cost: 400,
        lucky: {
            chance: 0.10,
            minMultiplier: 1,
            maxMultiplier: 2
        },
        extraDrops: {
            chance: 0.25,
            maxExtra: 2
        },
        jackpot: {
            chance: 0.01,
            reward: { type: 'tokens', amount: 25 }
        },
        rewards: [
            { type: 'coins', min: 60, max: 80, weight: 45 },
            { type: 'tokens', min: 16, max: 20, weight: 50 }
        ]
    },

    legendary: {
        name: 'Caja Legendaria',
        color: '#F1C40F',
        emoji: '<:cajalegendaria:1457160442924503083>',
        spawnChance: 0.005,
        duration: 60000,
        cost: 500,
        lucky: {
            chance: 0.15,
            minMultiplier: 1,
            maxMultiplier: 2
        },
        extraDrops: {
            chance: 0.30,
            maxExtra: 3
        },
        jackpot: {
            chance: 0.02,
            reward: { type: 'tokens', amount: 50 }
        },
        rewards: [
            { type: 'coins', min: 80, max: 120, weight: 40 },
            { type: 'tokens', min: 20, max: 30, weight: 45 }
        ]
    },
    mystery: {
        name: 'Caja Misteriosa',
        color: '#1ABC9C',
        emoji: '<:cajasorpresa:1457160106553643059>',
        spawnChance: 0.01,
        duration: 40000,
        cost: 150,
        rewards: [
            { type: 'random_box', boxes: ['common', 'uncommon', 'rare', 'epic', 'legendary'], weight: 100 }
        ]
    },
    fortune: {
        name: 'Caja de la Fortuna',
        color: '#F39C12',
        emoji: '<:fortune:1461838419931172994>',
        spawnChance: 0.003,
        duration: 60000,
        cost: 600,
        lucky: {
            chance: 0.15,
            minMultiplier: 1,
            maxMultiplier: 2
        },

        extraDrops: {
            chance: 0.30,
            maxExtra: 3
        },

        jackpot: {
            chance: 0.02,
            reward: { type: 'tokens', amount: 110 }
        },
        rewards: [
            { type: 'coins', min: 120, max: 180, weight: 45 },
            { type: 'tokens', min: 20, max: 40, weight: 50 }
        ]
    },
    xp_boost: {
        name: 'Caja de Experiencia',
        color: '#3498DB',
        emoji: '<:boxxp:1461838586931318815>',
        spawnChance: 0.02,
        duration: 40000,
        cost: 200,
        rewards: [
            { type: 'xp', min: 0, max: 0, weight: 100 }
        ]
    },
    mythic: {
        name: 'Caja Mítica',
        color: '#C0392B',
        emoji: '<:mitica:1461839063823941825>',
        spawnChance: 0.001,
        duration: 70000,
        cost: 1000,
        lucky: {
            chance: 0.25,
            minMultiplier: 3,
            maxMultiplier: 3
        },
        extraDrops: {
            chance: 0.40,
            maxExtra: 3
        },
        jackpot: {
            chance: 0.05,
            reward: { type: 'tokens', amount: 100 }
        },
        pity: {
            threshold: 3,
            upgradeTo: 'divine'
        },
        rewards: [
            { type: 'coins', min: 200, max: 300, weight: 40 },
            { type: 'tokens', min: 30, max: 40, weight: 45 }
        ]
    },

    divine: {
        name: 'Caja Divina',
        color: '#FFFFFF',
        emoji: '<:divinabox:1461839246179565801>',
        spawnChance: 0.0005,
        duration: 90000,
        cost: 2000,
        lucky: {
            chance: 0.40,
            minMultiplier: 3,
            maxMultiplier: 4
        },
        extraDrops: {
            chance: 0.50,
            maxExtra: 4
        },
        jackpot: {
            chance: 0.10,
            reward: { type: 'tokens', amount: 100 }
        },
        rewards: [
            { type: 'coins', min: 300, max: 350, weight: 30 },
            { type: 'tokens', min: 30, max: 60, weight: 40 }
        ]
    },

    divine_2: {
        name: 'Caja del Juicio Divino',
        color: '#FFFFFF',
        emoji: '<:divinabox:1461839246179565801>',
        spawnChance: 0.0005,
        duration: 90000,
        cost: 2000,

        lucky: {
            chance: 0.40,
            minMultiplier: 3,
            maxMultiplier: 4
        },

        extraDrops: {
            chance: 0.50,
            maxExtra: 4
        },

        jackpot: {
            chance: 0.10,
            reward: {
                type: 'tokens',
                amount: 100
            }
        },

        rewards: [
            {
                type: 'coins',
                min: 350,
                max: 650,
                weight: 30
            },
            {
                type: 'tokens',
                min: 80,
                max: 120,
                weight: 40
            }
        ]
    }
};

export function getRandomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}