import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class GiveXPSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('give-xp')
                .setDescription('Da XP a un usuario (Solo administradores)')
                 .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario al que dar XP')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('cantidad')
                        .setDescription('Cantidad de XP a dar')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1000000)
                )
                .addStringOption(option =>
                    option
                        .setName('razon')
                        .setDescription('Razón por la que se da XP')
                        .setRequired(false)
                ),
            cooldown: 2,
            category: 'admin',
            permissions: [PermissionFlagsBits.ManageGuild]
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
                    content: '⚠️ No puedes dar XP a bots.',
                    flags: 64
                });
            }
            
            const guildId = interaction.guild.id;

            const result = await client.levelManager.addXP(
                target.id, 
                guildId, 
                amount, 
                `admin_give:${interaction.user.id}:${reason}`
            );
            
            // Obtener nivel actualizado
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);
            const progress = await userLevel.getProgress();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ XP Otorgado Exitosamente')
                .setDescription(`${target.toString()} ha recibido **${amount.toLocaleString()} XP**`)
                .addFields(
                    {
                        name: '📊 Nuevas Estadísticas',
                        value: [
                            `**Nivel:** ${userLevel.level}`,
                            `**XP Total:** ${userLevel.totalXP.toLocaleString()}`,
                            `**Progreso:** ${progress.percentage.toFixed(1)}% al siguiente nivel`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '📝 Información',
                        value: [
                            `**Administrador:** ${interaction.user.tag}`,
                            `**Razón:** ${reason}`,
                            `**Resultado:** ${result.leveledUp ? '¡Subió de nivel! 🎉' : 'No subió de nivel'}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({ text: `ID: ${target.id}` });
            
            await interaction.editReply({ embeds: [embed] });

            try {
                const userEmbed = new EmbedBuilder()
                    .setColor('#FF8B75')
                    .setTitle('`RECIBISTE XP DE NIVEL`')
                    .setDescription(`<:flechaderecha:1455684486938362010> Has recibido **${amount.toLocaleString()} XP** en **${interaction.guild.name}**`)
                    .addFields(
                        {
                            name: '**```PROGRESO ACTUAL```**',
                            value: `<:recompensa:1456812362815373396> \`AHORA TIENES:\` **${userLevel.xp.toLocaleString()} XP**\n<:flechaderecha:1455684486938362010> \`NIVEL:\` **${userLevel.level}**`,
                            inline: false
                        },
                        {
                            name: '**```INFORMACIÓN```**',
                            value: `<:cajaderegalo:1457062998374879293> \`ADMINISTRADOR:\` ${interaction.user.tag}\n<:flechaderecha:1455684486938362010> \`RAZÓN:\` __${reason}__`,
                            inline: false
                        }
                    )
                    .setTimestamp();
                
                await target.send({ embeds: [userEmbed] }).catch(() => {});
            } catch (dmError) {
            } 
            
        } catch (error) {
            client.logger.error('Error en comando give-xp:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al dar XP.',
                flags: 64
            });
        }
    }
}