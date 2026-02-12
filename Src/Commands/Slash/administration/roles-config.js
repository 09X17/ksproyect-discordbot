import {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js';

import SlashCommand from '../../../Structures/SlashCommand.js';
import LevelRole from '../../../LevelSystem/Models/LevelRole.js';

export default class LevelRolesSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('levels-role-config')
                .setDescription('Configura roles por nivel')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(sub =>
                    sub
                        .setName('add')
                        .setDescription('Añadir o actualizar un rol por nivel')
                        .addRoleOption(opt =>
                            opt.setName('role')
                                .setDescription('Rol a otorgar')
                                .setRequired(true)
                        )
                        .addIntegerOption(opt =>
                            opt.setName('level')
                                .setDescription('Nivel requerido')
                                .setMinValue(1)
                                .setRequired(true)
                        )
                        .addBooleanOption(opt =>
                            opt.setName('remove_previous')
                                .setDescription('Remover roles anteriores')
                        )
                        .addBooleanOption(opt =>
                            opt.setName('stackable')
                                .setDescription('Se acumula con otros roles')
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('remove')
                        .setDescription('Eliminar un rol por nivel')
                        .addRoleOption(opt =>
                            opt.setName('role')
                                .setDescription('Rol a eliminar')
                                .setRequired(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName('list')
                        .setDescription('Listar roles por nivel')
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
        const guildId = interaction.guildId;
        const sub = interaction.options.getSubcommand();

        try {

            if (sub === 'add') {
                const role = interaction.options.getRole('role');
                const level = interaction.options.getInteger('level');
                const removePrevious =
                    interaction.options.getBoolean('remove_previous') ?? false;
                const stackable =
                    interaction.options.getBoolean('stackable') ?? false;

                await LevelRole.findOneAndUpdate(
                    { guildId, level },
                    {
                        guildId,
                        level,
                        roleId: role.id,
                        name: role.name,
                        color: role.hexColor,
                        permissions: {
                            autoRemove: removePrevious,
                            stackable
                        },
                        metadata: {
                            updatedBy: interaction.user.id,
                            updatedAt: new Date()
                        }
                    },
                    { upsert: true, new: true }
                );

                const embed = new EmbedBuilder()
                    .setColor(role.color || '#5865F2')
                    .setTitle('🏆 Rol por Nivel Configurado')
                    .setDescription(
                        `${role} se otorgará al alcanzar el **nivel ${level}**`
                    )
                    .addFields({
                        name: '⚙️ Opciones',
                        value:
                            `• Remover anteriores: ${removePrevious ? '✅ Sí' : '❌ No'}\n` +
                            `• Acumulable: ${stackable ? '✅ Sí' : '❌ No'}`
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            if (sub === 'remove') {
                const role = interaction.options.getRole('role');

                const deleted = await LevelRole.findOneAndDelete({
                    guildId,
                    roleId: role.id
                });

                if (!deleted) {
                    return interaction.reply({
                        content: '❌ Ese rol no está configurado.',
                        flags: 64
                    });
                }

                return interaction.reply({
                    content: `🗑️ Rol ${role} eliminado del sistema de niveles.`,
                    flags: 64
                });
            }

            if (sub === 'list') {
                const roles = await LevelRole
                    .find({ guildId })
                    .sort({ level: 1 });

                if (roles.length === 0) {
                    return interaction.reply({
                        content: '📭 No hay roles por nivel configurados.',
                        flags: 64
                    });
                }

                const list = roles.map(r =>
                    `• <@&${r.roleId}> → **Nivel ${r.level}**` +
                    `${r.permissions.autoRemove ? ' (🔄 remueve anteriores)' : ''}` +
                    `${r.permissions.stackable ? ' (📚 acumulable)' : ''}`
                ).join('\n');

                const embed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('📋 Roles por Nivel')
                    .setDescription(list)
                    .setFooter({ text: `Total: ${roles.length} roles` })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }

        } catch (error) {
            client.logger.error('❌ Error en level-roles:', error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: '❌ Ocurrió un error inesperado.',
                    flags: 64
                });
            }
        }
    }
}
