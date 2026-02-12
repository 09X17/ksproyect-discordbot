const JobsConfig = {

    miner: {
        id: 'miner',
        name: 'Minero',
        description: 'Extrae minerales valiosos de las profundidades.',
        emoji: '<:pico:1465516936439005359>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.01, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.9    // reduce el impuesto un 80%
        },
        failChanceMessage: '¡Tu pico se rompió mientras minabas!',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 100, maxLevel: 20 },
        ranks: [
            { level: 1, name: 'Novato', multiplier: 1 },
            { level: 5, name: 'Aprendiz', multiplier: 1.2 },
            { level: 10, name: 'Experto', multiplier: 1.5 },
            { level: 15, name: 'Maestro', multiplier: 2 }
        ],
        perks: ['faster_cooldown', 'double_xp_chance']
    },
    farmer: {
        id: 'farmer',
        name: 'Granjero',
        description: 'Cultiva y vende productos agrícolas.',
        emoji: '<:trigo:1465517087534481542>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.01, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.9    // reduce el impuesto un 80%
        },
        failChanceMessage: 'Una plaga destruyó tus cultivos.',
        rewards: {
            coins: { min: 75, max: 180 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 90, maxLevel: 25 },
        ranks: [
            { level: 1, name: 'Campesino', multiplier: 1 },
            { level: 7, name: 'Productor', multiplier: 1.3 },
            { level: 14, name: 'Agricultor Experto', multiplier: 1.6 },
            { level: 20, name: 'Terrateniente', multiplier: 2 }
        ],
        perks: ['extra_coins', 'no_fail']
    },
    thief: {
        id: 'thief',
        name: 'Ladrón',
        description: 'Robos rápidos con riesgo de fallar.',
        emoji: '<:ladron:1465517221240504452>',
        illegal: true,
        failChance: 0.3,
        cooldown: 90 * 60 * 1000,
        taxes: { rate: 0.05, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.1    // reduce el impuesto un 80%
        },
        failChanceMessage: 'Te atraparon robando.',
        rewards: {
            coins: { min: 100, max: 200 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 120, maxLevel: 15 },
        ranks: [
            { level: 1, name: 'Ratero', multiplier: 1 },
            { level: 5, name: 'Carterista', multiplier: 1.4 },
            { level: 10, name: 'Ladrón Experto', multiplier: 1.8 }
        ],
        perks: ['lower_fail_chance', 'police_evade']
    },

    blacksmith: {
        id: 'blacksmith',
        name: 'Herrero',
        description: 'Forja armas y armaduras.',
        emoji: '<:herrero:1465517405618049238>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3    // reduce el impuesto un 80%
        },
        failChanceMessage: 'La forja falló.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 110, maxLevel: 20 },
        ranks: [
            { level: 1, name: 'Aprendiz', multiplier: 1 },
            { level: 5, name: 'Oficial', multiplier: 1.3 },
            { level: 10, name: 'Maestro Herrero', multiplier: 1.7 },
            { level: 15, name: 'Gran Forjador', multiplier: 2 }
        ],
        perks: ['extra_coins', 'faster_cooldown']
    },

    fisherman: {
        id: 'fisherman',
        name: 'Pescador',
        description: 'Pesca y vende peces.',
        emoji: '<:pescar:1465517575432568973>',
        illegal: false,
        failChance: 0.3,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3    // reduce el impuesto un 80%
        },
        failChanceMessage: 'El pez escapó.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 80, maxLevel: 30 },
        ranks: [
            { level: 1, name: 'Aprendiz', multiplier: 1 },
            { level: 5, name: 'Pescador', multiplier: 1.2 },
            { level: 12, name: 'Maestro Pescador', multiplier: 1.5 },
            { level: 20, name: 'Experto Acuático', multiplier: 1.8 }
        ],
        perks: ['extra_coins', 'double_xp_chance']
    },
    smuggler: {
        id: 'smuggler',
        name: 'Contrabandista',
        description: 'Transporta mercancía ilegal.',
        emoji: '<:contrabandodelicores:1465517700703981682>',
        illegal: true,
        failChance: 0.2,
        cooldown: 90 * 60 * 1000,
        taxes: { rate: 0.05, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.1    // reduce el impuesto un 80%
        },
        failChanceMessage: 'La policía interceptó el cargamento.',
        rewards: {
            coins: { min: 100, max: 200 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 150, maxLevel: 15 },
        ranks: [
            { level: 1, name: 'Novato', multiplier: 1 },
            { level: 5, name: 'Traficante', multiplier: 1.5 },
            { level: 10, name: 'Maestro Contrabandista', multiplier: 2 }
        ],
        perks: ['lower_fail_chance', 'escape_bonus']
    },

    chef: {
        id: 'chef',
        name: 'Cocinero',
        description: 'Prepara platos deliciosos.',
        emoji: '<:sombrerodecocinero:1465518026135703552>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3   // reduce el impuesto un 80%
        },
        failChanceMessage: 'Arruinaste la receta.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 90, maxLevel: 25 },
        ranks: [
            { level: 1, name: 'Aprendiz', multiplier: 1 },
            { level: 5, name: 'Cocinero', multiplier: 1.3 },
            { level: 12, name: 'Chef Experto', multiplier: 1.6 },
            { level: 20, name: 'Maestro Chef', multiplier: 2 }
        ],
        perks: ['extra_coins', 'faster_cooldown']
    },

    lumberjack: {
        id: 'lumberjack',
        name: 'Leñador',
        description: 'Tala árboles y vende madera.',
        emoji: '<:hacha:1466443513511149661>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,

        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3    // reduce el impuesto un 80%
        },
        failChanceMessage: 'El árbol cayó mal.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 95, maxLevel: 25 },
        ranks: [
            { level: 1, name: 'Novato', multiplier: 1 },
            { level: 6, name: 'Talador', multiplier: 1.3 },
            { level: 14, name: 'Leñador Experto', multiplier: 1.6 },
            { level: 20, name: 'Maestro del Bosque', multiplier: 2 }
        ],
        perks: ['extra_coins', 'faster_cooldown']
    },

    hunter: {
        id: 'hunter',
        name: 'Cazador',
        description: 'Caza animales salvajes.',
        emoji: '<:tiroalarco:1466443659187716096>',
        illegal: false,
        failChance: 0.2,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3   // reduce el impuesto un 80%
        },
        failChanceMessage: 'La presa escapó.',
        rewards: {
            coins: { min: 100, max: 200 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 110, maxLevel: 20 },
        ranks: [
            { level: 1, name: 'Rastreador', multiplier: 1 },
            { level: 7, name: 'Cazador', multiplier: 1.4 },
            { level: 14, name: 'Cazador Experto', multiplier: 1.8 }
        ],
        perks: ['lower_fail_chance', 'double_xp_chance']
    },

    builder: {
        id: 'builder',
        name: 'Constructor',
        description: 'Construye estructuras.',
        emoji: '<:edificiodeoficinas:1466443789479444623>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.05, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3    // reduce el impuesto un 80%
        },
        failChanceMessage: 'La construcción colapsó.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 120, maxLevel: 20 },
        ranks: [
            { level: 1, name: 'Ayudante', multiplier: 1 },
            { level: 6, name: 'Obrero', multiplier: 1.3 },
            { level: 12, name: 'Maestro Constructor', multiplier: 1.7 }
        ],
        perks: ['extra_coins', 'no_fail']
    },
    doctor: {
        id: 'doctor',
        name: 'Doctor',
        description: 'Atiende pacientes.',
        emoji: '<:informemedico:1466443909407445123>',
        illegal: false,
        failChance: 0.05,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.05, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3   // reduce el impuesto un 80%
        },
        failChanceMessage: 'El tratamiento falló.',
        rewards: {
            coins: { min: 100, max: 200 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 140, maxLevel: 20 },
        ranks: [
            { level: 1, name: 'Interno', multiplier: 1 },
            { level: 7, name: 'Médico', multiplier: 1.5 },
            { level: 15, name: 'Cirujano Experto', multiplier: 2 }
        ],
        perks: ['double_xp_chance', 'extra_coins']
    },

    taxi: {
        id: 'taxi',
        name: 'Taxista',
        description: 'Transporta pasajeros.',
        emoji: '<:paradadetaxi:1466444053175337083>',
        illegal: false,
        failChance: 0.1,
        cooldown: 60 * 60 * 1000,
        taxes: { rate: 0.03, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.3    // reduce el impuesto un 80%
        },
        failChanceMessage: 'El cliente canceló.',
        rewards: {
            coins: { min: 75, max: 150 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 70, maxLevel: 30 },
        ranks: [
            { level: 1, name: 'Conductor', multiplier: 1 },
            { level: 10, name: 'Chofer', multiplier: 1.4 },
            { level: 20, name: 'Taxista VIP', multiplier: 1.8 }
        ],
        perks: ['faster_cooldown', 'extra_coins']
    },
    hacker: {
        id: 'hacker',
        name: 'Hacker',
        description: 'Hackea sistemas.',
        emoji: '<:hacker:1466444191771918357>',
        illegal: true,
        failChance: 0.1,
        cooldown: 2 * 60 * 60 * 1000,
        taxes: { rate: 0.05, appliesTo: ['coins'] },
        taxEvasion: {
            chance: 0.5,      // 50% de probabilidad
            reduction: 0.1    // reduce el impuesto un 80%
        },
        failChanceMessage: 'Rastreado por la policía.',
        rewards: {
            coins: { min: 110, max: 220 },
            xp: { min: 0, max: 0}
        },
        weeklySalary: { coins: 1500, tokens: 5 },
        monthlySalary: {
            coins: 3000,
            tokens: 10
        },
        progression: { xpPerLevel: 160, maxLevel: 15 },
        ranks: [
            { level: 1, name: 'Script Kiddie', multiplier: 1 },
            { level: 5, name: 'Hacker', multiplier: 1.6 },
            { level: 10, name: 'Elite Hacker', multiplier: 2 }
        ],
        perks: ['lower_fail_chance', 'police_evade']
    }

};

export default JobsConfig;
