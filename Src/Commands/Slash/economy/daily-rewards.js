import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class DailySlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('daily-rewards')
                .setDescription('Reclama tu recompensa diaria de monedas y una caja sorpresa'),
            cooldown: 0,
            category: 'economy',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;
            const result = await client.levelManager.giveDailyReward(userId, guildId);

            if (!result.success) {
                const nextReward = new Date(result.nextReward);
                const unix = Math.floor(nextReward.getTime() / 1000);
                return interaction.editReply({
                    content: `<:relojdearena:1457064155067449364> __Ya recibiste tu recompensa diaria hoy!__ \`|\` Disponible nuevamente <t:${unix}:R>`,
                    flags: 64
                });

            }

            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, userId);
            const totalCoins = userLevel.coins ?? 0;

            const lootBoxManager = client.levelManager?.lootBoxManager;
            if (!lootBoxManager) {
                return interaction.editReply({
                    content: '❌ El sistema de cajas no está disponible actualmente.',
                    flags: 64
                });
            }
            const boxTypes = lootBoxManager.boxTypes;
            const availableBoxes = Object.keys(boxTypes);

            const extendedBoxes = {
                ...boxTypes,
                'bronze': {
                    name: 'Caja de Bronce',
                    color: '#CD7F32',
                    emoji: '<:regalo4:1460112965863739443>',
                    cost: 50,
                    rewards: [
                        { type: 'coins', min: 150, max: 200, weight: 60 },
                        { type: 'tokens', min: 30, max: 35, weight: 10 }
                    ]
                },
                'silver': {
                    name: 'Caja de Plata',
                    color: '#C0C0C0',
                    emoji: '<:regalo3:1460112967696777440>',
                    cost: 150,
                    rewards: [
                        { type: 'coins', min: 200, max: 250, weight: 50 },
                        { type: 'tokens', min: 35, max: 45, weight: 15 },
                    ]
                },
                'gold': {
                    name: 'Caja de Oro',
                    color: '#FFD700',
                    emoji: '<:regalo5:1460113503053414421>',
                    cost: 300,
                    rewards: [
                        { type: 'coins', min: 250, max: 350, weight: 40 },
                        { type: 'tokens', min: 45, max: 55, weight: 20 },
                    ]
                }
            };

            lootBoxManager.boxTypes = extendedBoxes;
            const allBoxTypes = Object.keys(extendedBoxes);

            const dailyBoxProbabilities = {
                'bronze': 45,   // 30%
                'common': 1,   // 25%
                'silver': 45,   // 20%
                'rare': 1,     // 12%
                'gold': 45,      // 7%
                'legendary': 1, // 4%
            };

            const boxType = this.selectBoxByProbability(dailyBoxProbabilities);
            const boxData = extendedBoxes[boxType];

            const nextDaily = new Date();
            nextDaily.setDate(nextDaily.getDate() + 1);
            const nextUnix = Math.floor(nextDaily.getTime() / 1000);


            const embed = new EmbedBuilder()
                .setColor('#B3F7FF')
                .setTitle('<:cajaderegalo:1457062998374879293> `RECOMPENSA DIARIA`')
                .setThumbnail("https://cdn.discordapp.com/attachments/1261326873237913711/1460116217321885706/recompensa.png?ex=6965beb1&is=69646d31&hm=b599b02e63898b65d391237644760be9463f4d72609d259e0ed333849dfb2b8c&")
                .setDescription(
                    `<:informacion:1456828988361146490> \`RECIBISTE:\` **${(result.totalAmount ?? 0).toLocaleString()}** <:dinero:1451695904351457330> **MONEDAS**\n` +
                    `<:cajasorpresa:1457160106553643059> \`CAJA DIARIA:\` ${boxData.emoji} | **${boxData.name.toUpperCase()}**`
                )
                .addFields(
                    {
                        name: '**```DETALLES DE LA RECOMPENSA```**',
                        value: [
                            `<:flechaderecha:1455684486938362010> **Base:** \`${(result.base ?? 0).toLocaleString()}\` <:dinero:1451695904351457330>`,
                            `<:fuego:1451696461413744640> **Bonus por racha (${result.streakDays} Días):** \`${(result.streakBonus ?? 0).toLocaleString() || "0"}\` <:dinero:1451695904351457330>`,
                            `<:flechaderecha:1455684486938362010> **Total monedas:** \`${(result.amount ?? 0).toLocaleString()}\` <:dinero:1451695904351457330>`,
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '**```TU PROGRESO```**',
                        value: [
                            `<:fuego:1451696461413744640> **Racha actual:** \`${result.streakDays} Días\``,
                            `<:flechaderecha:1455684486938362010> **Monedas totales:** \`${totalCoins.toLocaleString()}\` <:dinero:1451695904351457330>`,
                            `<:flechaderecha:1455684486938362010> **Próxima recompensa:** <t:${nextUnix}:R>`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '**```CONTENIDO DE LA CAJA```**',
                        value: lootBoxManager.getBoxContentsPreview(boxData),
                        inline: false
                    },
                )

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`daily_open_${userId}_${boxType}_${Date.now()}`)
                    .setLabel(`ABRIR CAJA`)
                    .setEmoji(boxData.emoji)
                    .setStyle(ButtonStyle.Secondary));

            await interaction.editReply({
                embeds: [embed],
                components: [row],
                content: '<:verificado:1453073955467563008> **¡Recompensa diaria reclamada con éxito!**'
            });

            this.storeUserDailyBox(userId, guildId, boxType, boxData);

        } catch (error) {
            client.logger.error('❌ Error en slash daily-rewards:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al reclamar tu recompensa diaria.',
                flags: 64
            });
        }
    }

    selectBoxByProbability(probabilities) {
        const total = Object.values(probabilities).reduce((a, b) => a + b, 0);
        let random = Math.random() * total;

        for (const [boxType, probability] of Object.entries(probabilities)) {
            random -= probability;
            if (random <= 0) return boxType;
        }

        return 'common';
    }

    storeUserDailyBox(userId, guildId, boxType, boxData) {
        if (!global.dailyBoxes) global.dailyBoxes = new Map();

        const key = `${userId}_${guildId}`;
        global.dailyBoxes.set(key, {
            boxType,
            boxData,
            claimedAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        });
    }
}