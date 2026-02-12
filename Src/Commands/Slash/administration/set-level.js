import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class SetLevelSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('set-level')
                .setDescription('Establece el nivel de un usuario.')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario al que establecer nivel')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('nivel')
                        .setDescription('Nivel a establecer')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón por la que se establece el nivel')
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
            const targetLevel = interaction.options.getInteger('nivel');
            const reason = interaction.options.getString('razon') || 'Administrador';

            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ No puedes establecer nivel a bots.',
                    flags: 64
                });
            }

            const guildId = interaction.guild.id;

            const currentLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);
            const oldLevel = currentLevel.level;

            const result = await client.levelManager.setLevel(target.id, guildId, targetLevel);
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);
            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('✅ Nivel Establecido Exitosamente')
                .setDescription(`Nivel de ${target.toString()} establecido a **${targetLevel}**`)
                .addFields(
                    {
                        name: '📊 Cambios Realizados',
                        value: [
                            `**Nivel anterior:** ${oldLevel}`,
                            `**Nivel nuevo:** ${userLevel.level}`,
                            `**XP establecido:** ${userLevel.xp.toLocaleString()}`,
                            `**XP total:** ${userLevel.totalXP.toLocaleString()}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📝 Información',
                        value: [
                            `**Administrador:** ${interaction.user.tag}`,
                            `**Razón:** ${reason}`,
                            `**Diferencia:** ${targetLevel > oldLevel ? '+' : ''}${targetLevel - oldLevel} niveles`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${target.id}` });

            await interaction.editReply({ embeds: [embed] });

            if (targetLevel > oldLevel) {
                await client.levelManager.handleLevelUp(guildId, target.id, oldLevel, targetLevel, null);
            }

        } catch (error) {
            client.logger.error('❌ Error en comando set-level:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al establecer el nivel.',
                flags: 64
            });
        }
    }
}