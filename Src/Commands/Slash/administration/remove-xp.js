import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class RemoveXPSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('remove-xp')
                .setDescription('Quita XP a un usuario (Solo administradores)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario al que quitar XP')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('cantidad')
                        .setDescription('Cantidad de XP a quitar')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón por la que se quita XP')
                        .setRequired(false)
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
        await interaction.deferReply({ flags: 64 });

        try {
            const target = interaction.options.getUser('usuario');
            const amount = interaction.options.getInteger('cantidad');
            const reason = interaction.options.getString('razon') || 'Administrador';

            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ No puedes quitar XP a bots.',
                    flags: 64
                });
            }

            const guildId = interaction.guild.id;

            // Quitar XP
            const result = await client.levelManager.removeXP(
                target.id,
                guildId,
                amount,
                reason
            );

            // Obtener nivel actualizado
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);

            // Crear embed de confirmación
            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('✅ XP Removido Exitosamente')
                .setDescription(`Se han removido **${amount.toLocaleString()} XP** de ${target.toString()}`)
                .addFields(
                    {
                        name: '📊 Nuevas Estadísticas',
                        value: [
                            `**Nivel:** ${userLevel.level}`,
                            `**XP Actual:** ${userLevel.xp.toLocaleString()}`,
                            `**XP Total:** ${userLevel.totalXP.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📝 Información',
                        value: [
                            `**Administrador:** ${interaction.user.tag}`,
                            `**Razón:** ${reason}`,
                            `**XP removido:** ${result.xpRemoved.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${target.id}` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Error en comando remove-xp:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al quitar XP.',
                flags: 64
            });
        }
    }
}