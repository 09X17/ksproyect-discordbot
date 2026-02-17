import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    StringSelectMenuBuilder
} from 'discord.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import SlashCommand from '../../../Structures/SlashCommand.js';
import UserLevel from '../../../LevelSystem/Models/UserLevel.js';
import ShopItem from '../../../LevelSystem/Models/ShopItem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKGROUNDS_DIR = path.join(
    __dirname,
    '../../../LevelSystem/Assets/UserBackgrounds'
);

export default class RankBackgroundSet extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('rank-background')
                .setDescription('Personaliza tu rankcard')
                .addSubcommand(sub =>
                    sub
                        .setName('set')
                        .setDescription('Establece un fondo personalizado')
                        .addAttachmentOption(opt =>
                            opt
                                .setName('imagen')
                                .setDescription('Imagen de fondo (PNG / JPG)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('reset')
                        .setDescription('Restablece el fondo por defecto')
                )
                .addSubcommand(sub =>
                    sub
                        .setName('color')
                        .setDescription('Aplica un color comprado en la tienda')
                ),
            cooldown: 10,
            category: 'levels',
            userPermissions: [],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.AttachFiles
            ]
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;

        const userLevel = await UserLevel.findOne({
            guildId,
            userId
        });

        if (!userLevel) {
            return interaction.editReply({
                content: '❌ No se encontró tu perfil.'
            });
        }

        // Seguridad base
        userLevel.customization ??= {};
        userLevel.customization.active ??= {};
        userLevel.customization.permissions ??= {};

        /* ======================================================
           RESET BACKGROUND
        ====================================================== */
        if (sub === 'reset') {
            userLevel.customization.active.background = null;
            await userLevel.save();

            return interaction.editReply({
                content: '🧹 Fondo del rankcard restablecido.'
            });
        }

        /* ======================================================
           COLOR SELECT
        ====================================================== */
        if (sub === 'color') {
            const userPermissions = userLevel.customization.permissions || {};

            // Obtener solo los permisos de color que el usuario posee
            const userColorPermissions = Object.keys(userPermissions).filter(p =>
                p.startsWith('rank_color_') && userPermissions[p] === true
            );

            if (!userColorPermissions.length) {
                return interaction.editReply({
                    content: '🎨 No tienes colores de rankcard comprados.\nCompra uno en `/shop-items`.'
                });
            }

            // Buscar en la DB solo los items correspondientes a esos permisos
            const colorItems = await ShopItem.find({
                guildId,
                type: 'permission',
                'data.permission': {
                    $in: userColorPermissions.map(p => new RegExp(`^${p}$`, 'i'))
                }
            });

            // 🔹 Filtrar los colores que el usuario tiene permiso
            const available = colorItems.filter(item =>
                userLevel.customization.permissions?.[item.data.permission] === true
            );

            if (!available.length) {
                return interaction.editReply({
                    content: '🎨 No tienes colores de rankcard comprados.\nCompra uno en `/shop-items`.'
                });
            }

            console.log(available)

            // Construir menú con todos los disponibles
            const select = new StringSelectMenuBuilder()
                .setCustomId('rankcard_color_select')
                .setPlaceholder('Selecciona un color')
                .addOptions(
                    available.map(item => ({
                        label: item.name,
                        value: item.data.permission,
                        description: item.data.hexColor || 'Sin color definido',
                        emoji: '🎨',
                        default: item.data.hexColor === userLevel.customization.active?.accentColor
                    }))
                );

            //    console.log(options)

            const row = new ActionRowBuilder().addComponents(select);

            return interaction.editReply({
                content:
                    '🎨 **Elige el color para tu rankcard:**\n' +
                    `Color actual: \`${userLevel.customization?.active?.accentColor || 'Por defecto'}\``,
                components: [row]
            });
        }


        /* ======================================================
           SET BACKGROUND
        ====================================================== */

        // 🔒 Permiso obligatorio
        if (!userLevel.customization.permissions.customBackground) {
            return interaction.editReply({
                content:
                    '🔒 No tienes permiso para usar fondos personalizados.\n' +
                    'Compra el **item especial** en la tienda para desbloquear esta función.'
            });
        }

        const attachment = interaction.options.getAttachment('imagen');

        if (!attachment.contentType?.startsWith('image/')) {
            return interaction.editReply({
                content: '❌ El archivo debe ser una imagen válida.'
            });
        }

        const MAX_SIZE = 2 * 1024 * 1024;
        if (attachment.size > MAX_SIZE) {
            return interaction.editReply({
                content: '❌ La imagen no puede superar los 2MB.'
            });
        }

        if (!fs.existsSync(BACKGROUNDS_DIR)) {
            fs.mkdirSync(BACKGROUNDS_DIR, { recursive: true });
        }

        const ext = path.extname(attachment.name).toLowerCase();
        const fileName = `${guildId}_${userId}_${Date.now()}${ext}`;
        const filePath = path.join(BACKGROUNDS_DIR, fileName);

        const response = await fetch(attachment.url);
        const buffer = Buffer.from(await response.arrayBuffer());

        fs.writeFileSync(filePath, buffer);

        userLevel.customization.active.background = fileName;
        await userLevel.save();

        return interaction.editReply({
            content:
                '✅ Fondo personalizado aplicado correctamente.\n' +
                'Usa `/rankcard` para verlo.'
        });
    }
}
