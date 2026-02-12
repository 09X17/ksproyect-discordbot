import { SlashCommandBuilder, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import path from 'path';
import SlashCommand from '../../../Structures/SlashCommand.js';
import { boxTypes } from '../../../LevelSystem/Managers/boxTypesConfig.js';

export default class InventorySlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('inventory')
                .setDescription('Muestra tu inventario, monedas y cajas')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario cuyo inventario ver')
                        .setRequired(false)
                ),
            cooldown: 5,
            category: 'economia'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ content: '<a:lupa:1469424262250106992> Cargando tu inventario...' });

        try {
            const target = interaction.options.getUser('usuario') || interaction.user;
            const guildId = interaction.guild.id;

            if (target.bot) {
                return interaction.editReply({
                    content: '🤖 Los bots no tienen inventario.',
                    flags: 64
                });
            }

            // ✅ OBTENER DATOS FRESCOS DE LA BASE DE DATOS
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);

            // ✅ FILTRAR LOOTBOXES CON CANTIDAD > 0
            const lootboxes = (userLevel.inventory || [])
                .filter(item => item.quantity > 0) // Solo items con cantidad
                .map(item => ({
                    itemName: item.itemName,
                    boxType: item.boxType,
                    quantity: item.quantity,
                    acquiredAt: item.acquiredAt,
                    _id: item._id
                }));

            // Personalización de usuario
            const accentColor = typeof userLevel.customization?.active?.accentColor === 'string' &&
                /^#([0-9A-F]{6})$/i.test(userLevel.customization.active.accentColor)
                ? userLevel.customization.active.accentColor
                : null;

            const backgroundUrl = typeof userLevel.customization?.active?.background === 'string'
                ? userLevel.customization.active.background
                : null;

            // Avatar
            const avatarURL = target.displayAvatarURL({ extension: 'png', size: 512 });

            // Rank y estadísticas
            const rank = await client.levelManager.getUserRank(guildId, target.id);
            const stats = {
                messages: userLevel.messages || 0,
                commands: 0,
                voiceMinutes: userLevel.voiceMinutes || 0,
                games: 0,
                wins: 0,
                activeDays: userLevel.stats?.streakDays || 0,
                reputation: 0,
                streakDays: userLevel.stats?.streakDays || 0,
                rank: rank?.rank || 999,
                totalUsers: rank?.totalUsers || 1,
                boostMultiplier: userLevel.boostMultiplier || 1.0
            };

            // Datos para canvas
            const inventoryData = {
                username: target.username,
                discriminator: target.discriminator,
                avatarURL,
                level: userLevel.level,
                xp: userLevel.xp,
                totalXP: userLevel.totalXP,
                coins: userLevel.coins || 0,
                tokens: userLevel.tokens || 0,
                lootboxes,
                backgroundUrl,
                accentColor,
                stats,
                messages: userLevel.messages || 0,
                voiceMinutes: userLevel.voiceMinutes || 0,
                streakDays: userLevel.stats?.streakDays || 0,
                rank: rank?.rank || 999,
                totalUsers: rank?.totalUsers || 1,
                boostMultiplier: userLevel.boostMultiplier || 1.0,
                guildId
            };

            const { default: InventoryCardGenerator } = await import('../../../LevelSystem/Canvas/InventoryCard.js');
            const cardGenerator = new InventoryCardGenerator({
                customIcons: {
                    coins: 'dinero.png',
                    tokens: 'tokens.png',
                    messages: 'mensajes.png',
                    voice: 'micro.png',
                    streak: 'racha.png',
                    rank: 'rango.png',
                    boost: 'boost.png',
                },
                iconsPath: path.join(process.cwd(), 'Src/LevelSystem/Icons')
            });

            const imageBuffer = await cardGenerator.generate(inventoryData);
            const attachmentName = `inventory_${target.username.replace(/[^a-z0-9]/gi, '_')}.png`;
            const attachment = new AttachmentBuilder(imageBuffer, { name: attachmentName });

            // ✅ CREAR MENÚ SOLO SI HAY CAJAS VÁLIDAS
            const components = [];
            if (target.id === interaction.user.id && lootboxes.length > 0) {
                const menuOptions = lootboxes
                    .slice(0, 25) // Discord límite de 25 opciones
                    .map(b => {
                        const def = boxTypes[b.boxType] ||
                            Object.values(boxTypes).find(box => box.name === b.itemName) || {};

                        return {
                            label: `${def.name || b.itemName} (x${b.quantity})`,
                            value: b.boxType || b._id.toString(),
                            description: `Abrir tu ${def.name || b.itemName}`,
                            emoji: def.emoji || '🎁'
                        };
                    });

                if (menuOptions.length > 0) {
                    const menu = new StringSelectMenuBuilder()
                        .setCustomId(`lootbox_select_${interaction.user.id}`)
                        .setPlaceholder('🎁 Selecciona una caja para abrir')
                        .addOptions(menuOptions);

                    components.push(new ActionRowBuilder().addComponents(menu));
                }
            }

            await interaction.editReply({
                conten: " ",
                files: [attachment],
                components
            });

        } catch (error) {
            client.logger.error('Error en comando inventario:', error.stack);

            // ✅ MEJOR MANEJO DE ERRORES
            const errorMessage = error.message.includes('inventario')
                ? `❌ ${error.message}`
                : '❌ Ocurrió un error al mostrar el inventario. Inténtalo de nuevo.';

            if (interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage,
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: errorMessage,
                    flags: 64
                });
            }
        }
    }
}
