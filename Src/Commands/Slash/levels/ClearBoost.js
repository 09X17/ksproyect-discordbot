
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import UserLevel from '../../../LevelSystem/Models/UserLevel.js';
import ShopItem from '../../../LevelSystem/Models/ShopItem.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class CleanBoostsSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('limpiar-boosts')
                .setDescription('🧹 Limpia todos los boosts de un usuario')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario a limpiar')
                        .setRequired(true)
                )
                .addBooleanOption(option =>
                    option
                        .setName('confirmar')
                        .setDescription('Confirmar limpieza (irreversible)')
                ),
            cooldown: 5,
            category: 'admin'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });
        
        const usuario = interaction.options.getUser('usuario');
        const confirmar = interaction.options.getBoolean('confirmar');
        
        if (!confirmar) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Confirmar Limpieza de Boosts')
                .setDescription(`¿Limpiar TODOS los boosts de ${usuario.username}?`)
                .addFields({
                    name: '⚠️ ADVERTENCIA',
                    value: 'Esta acción:\n• Elimina TODOS los boosts\n• Es IRREVERSIBLE\n• No afecta XP/monedas\n• Solo elimina boosts activos',
                    inline: false
                })
                .setFooter({ text: 'Usa /limpiar-boosts confirmar:true para confirmar' });
            
            await interaction.editReply({ embeds: [embed] });
            return;
        }
        
        try {
            const userLevel = await UserLevel.findOne({
                guildId: interaction.guild.id,
                userId: usuario.id
            });
            
            if (!userLevel) {
                await interaction.editReply({
                    content: `❌ ${usuario.username} no tiene datos de nivel`
                });
                return;
            }
            
            // Contar boosts antes
            const boostsAntes = userLevel.activeItems.filter(item => 
                item.itemType.includes('boost')
            ).length;
            
            // Limpiar
            userLevel.activeItems = userLevel.activeItems.filter(item => 
                !item.itemType.includes('boost')
            );
            userLevel.boostMultiplier = 1.0;
            userLevel.boostExpires = null;
            
            await userLevel.save();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Boosts Limpiados')
                .setDescription(`**${usuario.username}** - Boosts eliminados`)
                .addFields(
                    {
                        name: '📊 Resultados',
                        value: [
                            `**Boosts eliminados:** ${boostsAntes}`,
                            `**Multiplicador reset:** 1.0x`,
                            `**Items restantes:** ${userLevel.activeItems.length}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🔄 Siguientes pasos',
                        value: [
                            '1. El usuario puede comprar nuevos boosts',
                            '2. Usar `/boosts ver` para verificar',
                            '3. Los boosts nuevos funcionarán correctamente'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setFooter({ text: `Limpiado por ${interaction.user.username}` })
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error limpiando boosts:', error);
            await interaction.editReply({
                content: `❌ Error: ${error.message}`
            });
        }
    }
}