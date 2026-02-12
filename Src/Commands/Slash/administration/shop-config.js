import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    MessageFlags,
    ChannelType, PermissionFlagsBits
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import ShopItem from '../../../LevelSystem/Models/ShopItem.js';
import ShopConfig from '../../../LevelSystem/Models/ShopConfig.js';

const LIMIT = 25;
const safe = (v, max) => String(v ?? '').slice(0, max);

export default class ShopAdminCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('levels-shop-admin')
                .setDescription('Configura y administra la tienda del servidor')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(sub =>
                    sub.setName('config')
                        .setDescription('Configuración del sistema de tienda')
                        .addChannelOption(opt =>
                            opt.setName('logs')
                                .setDescription('Canal para logs del shop-admin')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('panel')
                        .setDescription('Abrir panel de administración del shop')
                ),
            cooldown: 5,
            category: 'administration',
            userPermissions: [
                PermissionFlagsBits.ManageGuild
            ],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'config') {
            const logChannel = interaction.options.getChannel('logs');
            const config = await ShopConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                logChannel ? { logChannelId: logChannel.id } : {},
                { upsert: true, new: true }
            );

            return interaction.reply({
                content: `⚙️ **Configuración de la Tienda**\n\n📄 **Canal de logs:** ${config.logChannelId ? `<#${config.logChannelId}>` : '❌ No configurado'}\n\n💡 Usa \`/shop-admin config logs #canal\` para cambiarlo.`,
                flags: MessageFlags.Ephemeral
            });
        }

        if (sub === 'panel') {
            const page = 0;
            const items = await ShopItem.find({ guildId: interaction.guild.id }).sort({ createdAt: -1 }).skip(page * LIMIT).limit(LIMIT);

            const components = [];
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('shopadmin_create_item').setLabel('Crear Item').setStyle(ButtonStyle.Secondary).setEmoji("<:agregarproducto:1456491535569784922>")
            ));

            if (items.length) {
                components.push(new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder().setCustomId('shopadmin_items_menu').setPlaceholder('📦 Selecciona un item para editar').addOptions(
                        items.map(item => ({
                            label: safe(item.name, 25),
                            description: safe(`${item.price} ${item.currency} • ${item.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}`, 100),
                            value: safe(item.id, 100)
                        }))
                    )
                ));

                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('shopadmin_page_prev').setStyle(ButtonStyle.Secondary).setEmoji("<:flechaizquierda:1456491998335865075>"),
                    new ButtonBuilder().setCustomId('shopadmin_page_next').setStyle(ButtonStyle.Secondary).setEmoji("<:flechaderecha:1455684486938362010>")
                ));
            }

            return interaction.reply({
                content: '🛠️ **Panel de administración de la tienda**',
                components,
                flags: MessageFlags.Ephemeral
            });
        }
    }
}