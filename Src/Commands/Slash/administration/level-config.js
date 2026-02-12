import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import GuildConfigLevel from '../../../LevelSystem/Models/GuildConfig.js';
import { buildSinglePanel } from '../../../LevelSystem/Managers/LevelPanelBuilder.js';

export default class LevelAdminCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('levels-admin-config')
                .setDescription('Configura el sistema de niveles')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(sub =>
                    sub
                        .setName('panel')
                        .setDescription('Abrir panel de configuración')
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

        const { options } = interaction;
        const subcommand = options.getSubcommand();

        try {
            switch (subcommand) {
                case 'panel':
                    return await this.handlePanel(client, interaction);
            }
        } catch (error) {
            console.error('Error en levels-admin:', error);
            return interaction.reply({
                content: '❌ Ocurrió un error al procesar el comando.',
                flags: MessageFlags.Ephemeral
            });
        }
    }

    async handlePanel(client, interaction) {
        const guildId = interaction.guild.id;

        const config = await GuildConfigLevel.findOneAndUpdate(
            { guildId },
            {},
            { upsert: true, new: true }
        );

        return interaction.reply({
            content:
                '🛠️ **Panel avanzado del sistema de niveles**\n\n' +
                `Estado: **${config.enabled ? '🟢 ACTIVO' : '🔴 INACTIVO'}**`,
            components: buildSinglePanel(config),
            flags: MessageFlags.Ephemeral
        });
    }

}