import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import UserPerk from '../../../LevelSystem/Models/UserPerk.js';
import UserLevel from '../../../LevelSystem/Models/UserLevel.js';

export default class PerksSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('perks')
                .setDescription('Muestra tus perks disponibles')
                .addUserOption(option =>
                    option
                        .setName('usuario')
                        .setDescription('Usuario cuyos perks ver')
                        .setRequired(false)
                ),
            cooldown: 5,
            category: 'niveles'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply();
        
        try {
            const target = interaction.options.getUser('usuario') || interaction.user;
            const guildId = interaction.guild.id;
            
            if (target.bot) {
                return interaction.editReply({
                    content: '⚠️ Los bots no tienen perks.',
                    flags: 64
                });
            }
            
            // Obtener perks del usuario
            const perks = await UserPerk.find({
                userId: target.id,
                guildId: guildId
            }).sort({ tier: -1, 'metadata.rarity': -1 });
            
            // Obtener nivel del usuario para mostrar perks desbloqueables
            const userLevel = await client.levelManager.getOrCreateUserLevel(guildId, target.id);
            
            if (!perks || perks.length === 0) {
                return interaction.editReply({
                    content: `✨ ${target.id === interaction.user.id ? 'No tienes' : `${target.username} no tiene`} perks disponibles.\n¡Sube de nivel para desbloquear perks!`,
                    flags: 64
                });
            }
            
            // Separar perks por estado
            const activePerks = perks.filter(p => p.active);
            const inactivePerks = perks.filter(p => !p.active);
            const expiringSoon = this.getExpiringSoon(perks);
            
            // Crear embed de perks
            const embed = this.createPerksEmbed(activePerks, inactivePerks, expiringSoon, target, userLevel, interaction.guild);
            
            // Crear botones de acción
            const buttons = this.createPerkButtons(perks);
            
            await interaction.editReply({
                embeds: [embed],
                components: buttons ? [buttons] : []
            });
            
        } catch (error) {
            client.logger.error('Error en comando perks:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al mostrar los perks.',
                flags: 64
            });
        }
    }
    
    getExpiringSoon(perks, hours = 24) {
        const now = new Date();
        const threshold = new Date(now.getTime() + hours * 60 * 60 * 1000);
        
        return perks.filter(perk => 
            perk.expiresAt && 
            perk.expiresAt > now && 
            perk.expiresAt <= threshold
        );
    }
    
    createPerksEmbed(activePerks, inactivePerks, expiringSoon, user, userLevel, guild) {
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`✨ Perks de ${user.username}`)
            .setDescription(`Nivel ${userLevel.level} | XP: ${userLevel.totalXP.toLocaleString()}`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setFooter({ text: `Total de perks: ${activePerks.length + inactivePerks.length}` })
            .setTimestamp();
        
        // Perks activos
        if (activePerks.length > 0) {
            let activeText = '';
            activePerks.slice(0, 5).forEach(perk => {
                const rarityEmoji = this.getRarityEmoji(perk.metadata.rarity);
                const timeLeft = perk.expiresAt ? this.getTimeUntil(perk.expiresAt) : 'Permanente';
                
                activeText += `${rarityEmoji} **${perk.name}** (Tier ${perk.tier})\n`;
                activeText += `   ${perk.description}\n`;
                activeText += `   ⏰ ${timeLeft} | 🎯 ${perk.stats.activations} usos\n\n`;
            });
            
            embed.addFields({
                name: `✅ Perks Activos (${activePerks.length})`,
                value: activeText || 'No hay perks activos',
                inline: false
            });
        }
        
        // Perks inactivos
        if (inactivePerks.length > 0) {
            let inactiveText = '';
            inactivePerks.slice(0, 5).forEach(perk => {
                const rarityEmoji = this.getRarityEmoji(perk.metadata.rarity);
                
                inactiveText += `${rarityEmoji} **${perk.name}** (Tier ${perk.tier})\n`;
                inactiveText += `   ${perk.description}\n`;
                inactiveText += `   🔄 Disponible: ${perk.canActivate() ? '✅' : '❌'}\n\n`;
            });
            
            embed.addFields({
                name: `📭 Perks Inactivos (${inactivePerks.length})`,
                value: inactiveText || 'No hay perks inactivos',
                inline: false
            });
        }
        
        // Perks por expirar
        if (expiringSoon.length > 0) {
            let expiringText = '';
            expiringSoon.forEach(perk => {
                const timeLeft = this.getTimeUntil(perk.expiresAt);
                expiringText += `⏰ **${perk.name}** expira ${timeLeft}\n`;
            });
            
            embed.addFields({
                name: '⚠️ Perks por Expirar',
                value: expiringText,
                inline: false
            });
        }
        
        // Estadísticas de perks
        const stats = this.calculatePerkStats(activePerks, inactivePerks);
        embed.addFields({
            name: '📊 Estadísticas de Perks',
            value: [
                `**Multiplicador total:** ${stats.totalMultiplier}x`,
                `**XP ganado por perks:** ${stats.totalXPGained.toLocaleString()}`,
                `**Rarezas:** ${Object.entries(stats.rarities).map(([rarity, count]) => `${this.getRarityEmoji(rarity)} ${count}`).join(' ')}`,
                `**Progreso de colección:** ${stats.collectionProgress}%`
            ].join('\n'),
            inline: false
        });
        
        // Próximos perks a desbloquear
        const nextPerks = this.getNextUnlockablePerks(userLevel.level);
        if (nextPerks.length > 0) {
            let nextText = '';
            nextPerks.forEach(perk => {
                nextText += `🎯 Nivel ${perk.level}: ${perk.name}\n`;
            });
            
            embed.addFields({
                name: '🎁 Próximos Perks a Desbloquear',
                value: nextText,
                inline: false
            });
        }
        
        return embed;
    }
    
    createPerkButtons(perks) {
        const hasActivatable = perks.some(p => p.canActivate());
        const hasExpiring = perks.some(p => p.expiresAt && p.expiresAt > new Date());
        
        if (!hasActivatable && !hasExpiring) return null;
        
        const row = new ActionRowBuilder();
        
        if (hasActivatable) {
            const activateButton = new ButtonBuilder()
                .setCustomId('perks_activate_all')
                .setLabel('⚡ Activar Disponibles')
                .setStyle(ButtonStyle.Success)
                .setEmoji('⚡');
            
            row.addComponents(activateButton);
        }
        
        if (hasExpiring) {
            const renewButton = new ButtonBuilder()
                .setCustomId('perks_renew_expiring')
                .setLabel('🔄 Renovar Próximos')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');
            
            row.addComponents(renewButton);
        }
        
        const manageButton = new ButtonBuilder()
            .setCustomId('perks_manage')
            .setLabel('⚙️ Gestionar')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⚙️');
        
        row.addComponents(manageButton);
        
        return row;
    }
    
    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡'
        };
        
        return emojis[rarity] || '⚪';
    }
    
    getTimeUntil(date) {
        const seconds = Math.floor((new Date(date) - new Date()) / 1000);
        
        if (seconds <= 0) return 'Expirado';
        
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) return `en ${days}d`;
        if (hours > 0) return `en ${hours}h`;
        return `en ${minutes}m`;
    }
    
    calculatePerkStats(activePerks, inactivePerks) {
        const allPerks = [...activePerks, ...inactivePerks];
        
        // Multiplicador total
        const totalMultiplier = activePerks.reduce((mult, perk) => 
            mult * (perk.effects.xpMultiplier || 1), 1
        );
        
        // XP total ganado
        const totalXPGained = allPerks.reduce((total, perk) => 
            total + (perk.stats.totalXPGained || 0), 0
        );
        
        // Conteo por rareza
        const rarities = {};
        allPerks.forEach(perk => {
            const rarity = perk.metadata.rarity || 'common';
            rarities[rarity] = (rarities[rarity] || 0) + 1;
        });
        
        // Progreso de colección (basado en rarezas únicas)
        const uniqueRarities = Object.keys(rarities).length;
        const collectionProgress = Math.round((uniqueRarities / 5) * 100);
        
        return {
            totalMultiplier: totalMultiplier.toFixed(2),
            totalXPGained,
            rarities,
            collectionProgress
        };
    }
    
    getNextUnlockablePerks(currentLevel) {
        const perkLevels = [
            { level: 5, name: 'Boost de Principiante' },
            { level: 10, name: 'Boost Intermedio' },
            { level: 25, name: 'Boost Avanzado' },
            { level: 50, name: 'Boost de Experto' },
            { level: 100, name: 'Boost Maestro' }
        ];
        
        return perkLevels.filter(perk => perk.level > currentLevel)
            .slice(0, 3); // Mostrar solo los próximos 3
    }
}