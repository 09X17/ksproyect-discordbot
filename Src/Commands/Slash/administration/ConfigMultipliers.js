import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import GuildConfig from '../../../LevelSystem/Models/GuildConfig.js';

export default class MultipliersSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('multipliers')
                .setDescription('Administra multiplicadores de XP')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('rol')
                        .setDescription('Configura multiplicadores por rol')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol que otorga el multiplicador')
                                .setRequired(true)
                        )
                        .addNumberOption(option =>
                            option
                                .setName('multiplicador')
                                .setDescription('Multiplicador de XP (ej: 1.5 = 50% más)')
                                .setRequired(true)
                                .setMinValue(1.0)
                                .setMaxValue(10.0)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('canal')
                        .setDescription('Configura multiplicadores por canal')
                        .addChannelOption(option =>
                            option
                                .setName('canal')
                                .setDescription('Canal que otorga el multiplicador')
                                .setRequired(true)
                        )
                        .addNumberOption(option =>
                            option
                                .setName('multiplicador')
                                .setDescription('Multiplicador de XP (ej: 2.0 = 100% más)')
                                .setRequired(true)
                                .setMinValue(1.0)
                                .setMaxValue(10.0)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('bonus')
                        .setDescription('Configura canales con bonus de XP (porcentaje)')
                        .addChannelOption(option =>
                            option
                                .setName('canal')
                                .setDescription('Canal con bonus de XP')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('porcentaje')
                                .setDescription('Porcentaje de bonus (ej: 50 = 50% más)')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(500)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('listar')
                        .setDescription('Lista todos los multiplicadores activos')
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de multiplicador a listar')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Roles', value: 'roles' },
                                    { name: 'Canales', value: 'channels' },
                                    { name: 'Bonus', value: 'bonus' },
                                    { name: 'Todos', value: 'all' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remover')
                        .setDescription('Remueve un multiplicador')
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de multiplicador')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Rol', value: 'role' },
                                    { name: 'Canal', value: 'channel' },
                                    { name: 'Bonus', value: 'bonus' }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName('id')
                                .setDescription('ID del rol o canal')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('estadisticas')
                        .setDescription('Muestra estadísticas de multiplicadores')
                ),
            cooldown: 3,
            category: 'admin'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply({ flags: 64 });
        
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guild.id;
            
            // Obtener configuración
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId });
                await config.save();
            }
            
            switch (subcommand) {
                case 'rol':
                    await this.configureRoleMultiplier(interaction, config);
                    break;
                    
                case 'canal':
                    await this.configureChannelMultiplier(interaction, config);
                    break;
                    
                case 'bonus':
                    await this.configureBonusChannel(interaction, config);
                    break;
                    
                case 'listar':
                    await this.listMultipliers(interaction, config);
                    break;
                    
                case 'remover':
                    await this.removeMultiplier(interaction, config);
                    break;
                    
                case 'estadisticas':
                    await this.showStats(interaction, config);
                    break;
            }
            
        } catch (error) {
            client.logger.error('Error en multipliers:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al administrar los multiplicadores.',
                flags: 64
            });
        }
    }
    
    async configureRoleMultiplier(interaction, config) {
        const role = interaction.options.getRole('rol');
        const multiplier = interaction.options.getNumber('multiplicador');
        
        // Verificar si el rol ya tiene un multiplicador
        const existingIndex = config.multipliers.boostRoles.findIndex(r => r.roleId === role.id);
        
        if (existingIndex !== -1) {
            // Actualizar multiplicador existente
            const oldMultiplier = config.multipliers.boostRoles[existingIndex].multiplier;
            config.multipliers.boostRoles[existingIndex].multiplier = multiplier;
            
            const embed = new EmbedBuilder()
                .setColor(role.color || '#F39C12')
                .setTitle('📊 Multiplicador de Rol Actualizado')
                .setDescription(`Multiplicador del rol ${role.toString()} actualizado`)
                .addFields(
                    {
                        name: '📝 Cambios',
                        value: [
                            `**Multiplicador anterior:** ${oldMultiplier.toFixed(2)}x`,
                            `**Nuevo multiplicador:** ${multiplier.toFixed(2)}x`,
                            `**Diferencia:** ${((multiplier - oldMultiplier) * 100).toFixed(1)}%`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            `**Rol:** ${role.name} (${role.members.size} miembros)`,
                            `**XP base:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                            `**XP con multiplicador:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await config.save();
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Agregar nuevo multiplicador
        config.multipliers.boostRoles.push({
            roleId: role.id,
            multiplier
        });
        
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor(role.color || '#F39C12')
            .setTitle('✨ Nuevo Multiplicador de Rol')
            .setDescription(`El rol ${role.toString()} ahora otorga **${multiplier.toFixed(2)}x** de XP`)
            .addFields(
                {
                    name: '📝 Configuración',
                    value: [
                        `**Rol:** ${role.name}`,
                        `**ID:** ${role.id}`,
                        `**Multiplicador:** ${multiplier.toFixed(2)}x`,
                        `**Beneficiarios:** ${role.members.size} miembros`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💰 Ejemplo de Ganancia',
                    value: [
                        `**XP base por mensaje:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                        `**XP con multiplicador:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`,
                        `**Aumento:** ${((multiplier - 1) * 100).toFixed(1)}% más XP`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    async configureChannelMultiplier(interaction, config) {
        const channel = interaction.options.getChannel('canal');
        const multiplier = interaction.options.getNumber('multiplicador');
        
        if (!channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ El canal debe ser un canal de texto.',
                flags: 64
            });
        }
        
        // Verificar si el canal ya tiene un multiplicador
        const existingIndex = config.multipliers.specialChannels.findIndex(c => c.channelId === channel.id);
        
        if (existingIndex !== -1) {
            // Actualizar multiplicador existente
            const oldMultiplier = config.multipliers.specialChannels[existingIndex].multiplier;
            config.multipliers.specialChannels[existingIndex].multiplier = multiplier;
            
            const embed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('📊 Multiplicador de Canal Actualizado')
                .setDescription(`Multiplicador del canal ${channel.toString()} actualizado`)
                .addFields(
                    {
                        name: '📝 Cambios',
                        value: [
                            `**Multiplicador anterior:** ${oldMultiplier.toFixed(2)}x`,
                            `**Nuevo multiplicador:** ${multiplier.toFixed(2)}x`,
                            `**Diferencia:** ${((multiplier - oldMultiplier) * 100).toFixed(1)}%`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**XP base por mensaje:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                            `**XP en este canal:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await config.save();
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Agregar nuevo multiplicador
        config.multipliers.specialChannels.push({
            channelId: channel.id,
            multiplier
        });
        
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('✨ Nuevo Multiplicador de Canal')
            .setDescription(`El canal ${channel.toString()} ahora otorga **${multiplier.toFixed(2)}x** de XP`)
            .addFields(
                {
                    name: '📝 Configuración',
                    value: [
                        `**Canal:** ${channel.name}`,
                        `**ID:** ${channel.id}`,
                        `**Multiplicador:** ${multiplier.toFixed(2)}x`,
                        `**Tipo:** ${channel.type}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💰 Ejemplo de Ganancia',
                    value: [
                        `**XP base por mensaje:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                        `**XP en este canal:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`,
                        `**Aumento:** ${((multiplier - 1) * 100).toFixed(1)}% más XP`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    async configureBonusChannel(interaction, config) {
        const channel = interaction.options.getChannel('canal');
        const percentage = interaction.options.getInteger('porcentaje');
        const multiplier = 1 + (percentage / 100);
        
        if (!channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ El canal debe ser un canal de texto.',
                flags: 64
            });
        }
        
        // Verificar si el canal ya tiene un bonus
        const existingBonus = config.levelSettings.bonusChannels.get(channel.id);
        
        if (existingBonus !== undefined) {
            // Actualizar bonus existente
            const oldPercentage = existingBonus;
            config.levelSettings.bonusChannels.set(channel.id, percentage);
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('📊 Canal Bonus Actualizado')
                .setDescription(`Bonus del canal ${channel.toString()} actualizado`)
                .addFields(
                    {
                        name: '📝 Cambios',
                        value: [
                            `**Bonus anterior:** ${oldPercentage}%`,
                            `**Nuevo bonus:** ${percentage}%`,
                            `**Diferencia:** ${percentage - oldPercentage}%`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**Multiplicador efectivo:** ${multiplier.toFixed(2)}x`,
                            `**XP con bonus:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await config.save();
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Agregar nuevo canal bonus
        config.levelSettings.bonusChannels.set(channel.id, percentage);
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('✨ Nuevo Canal Bonus')
            .setDescription(`El canal ${channel.toString()} ahora otorga **+${percentage}%** de XP`)
            .addFields(
                {
                    name: '📝 Configuración',
                    value: [
                        `**Canal:** ${channel.name}`,
                        `**ID:** ${channel.id}`,
                        `**Bonus:** +${percentage}%`,
                        `**Multiplicador:** ${multiplier.toFixed(2)}x`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💰 Ejemplo de Ganancia',
                    value: [
                        `**XP base por mensaje:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                        `**XP en este canal:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`,
                        `**Aumento adicional:** ${percentage}% más XP`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    async listMultipliers(interaction, config) {
        const type = interaction.options.getString('tipo') || 'all';
        
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📋 Multiplicadores Activos')
            .setDescription(`**${interaction.guild.name}**`)
            .setTimestamp();
        
        if (type === 'roles' || type === 'all') {
            const roleMultipliers = config.multipliers.boostRoles;
            
            if (roleMultipliers.length > 0) {
                let rolesText = '';
                roleMultipliers.forEach((roleMulti, index) => {
                    const role = interaction.guild.roles.cache.get(roleMulti.roleId);
                    const roleName = role ? role.name : 'Rol no encontrado';
                    const roleMention = role ? `<@&${role.id}>` : `ID: ${roleMulti.roleId}`;
                    
                    rolesText += `${index + 1}. ${roleMention}\n`;
                    rolesText += `   **${roleMulti.multiplier.toFixed(2)}x** - ${roleName}\n`;
                    rolesText += `   Miembros: ${role ? role.members.size : 'N/A'}\n\n`;
                });
                
                embed.addFields({
                    name: `🎭 Multiplicadores por Rol (${roleMultipliers.length})`,
                    value: rolesText || 'No hay multiplicadores por rol',
                    inline: false
                });
            } else if (type === 'roles') {
                embed.addFields({
                    name: '🎭 Multiplicadores por Rol',
                    value: 'No hay multiplicadores por rol configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'channels' || type === 'all') {
            const channelMultipliers = config.multipliers.specialChannels;
            
            if (channelMultipliers.length > 0) {
                let channelsText = '';
                channelMultipliers.forEach((channelMulti, index) => {
                    const channel = interaction.guild.channels.cache.get(channelMulti.channelId);
                    const channelName = channel ? channel.name : 'Canal no encontrado';
                    const channelMention = channel ? `<#${channel.id}>` : `ID: ${channelMulti.channelId}`;
                    
                    channelsText += `${index + 1}. ${channelMention}\n`;
                    channelsText += `   **${channelMulti.multiplier.toFixed(2)}x** - ${channelName}\n\n`;
                });
                
                embed.addFields({
                    name: `📢 Multiplicadores por Canal (${channelMultipliers.length})`,
                    value: channelsText || 'No hay multiplicadores por canal',
                    inline: false
                });
            } else if (type === 'channels') {
                embed.addFields({
                    name: '📢 Multiplicadores por Canal',
                    value: 'No hay multiplicadores por canal configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'bonus' || type === 'all') {
            const bonusChannels = Array.from(config.levelSettings.bonusChannels.entries());
            
            if (bonusChannels.length > 0) {
                let bonusText = '';
                bonusChannels.forEach(([channelId, percentage], index) => {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    const channelName = channel ? channel.name : 'Canal no encontrado';
                    const channelMention = channel ? `<#${channel.id}>` : `ID: ${channelId}`;
                    const multiplier = 1 + (percentage / 100);
                    
                    bonusText += `${index + 1}. ${channelMention}\n`;
                    bonusText += `   **+${percentage}%** (${multiplier.toFixed(2)}x) - ${channelName}\n\n`;
                });
                
                embed.addFields({
                    name: `💰 Canales con Bonus (${bonusChannels.length})`,
                    value: bonusText || 'No hay canales con bonus',
                    inline: false
                });
            } else if (type === 'bonus') {
                embed.addFields({
                    name: '💰 Canales con Bonus',
                    value: 'No hay canales con bonus configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'all' && 
            config.multipliers.boostRoles.length === 0 && 
            config.multipliers.specialChannels.length === 0 && 
            config.levelSettings.bonusChannels.size === 0) {
            embed.setDescription('No hay multiplicadores configurados en este servidor.');
        }
        
        // Agregar menú de selección
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('multipliers_filter')
                    .setPlaceholder('Filtrar por tipo...')
                    .addOptions([
                        {
                            label: 'Todos',
                            value: 'all',
                            default: type === 'all',
                            emoji: '📋'
                        },
                        {
                            label: 'Roles',
                            value: 'roles',
                            default: type === 'roles',
                            emoji: '🎭'
                        },
                        {
                            label: 'Canales',
                            value: 'channels',
                            default: type === 'channels',
                            emoji: '📢'
                        },
                        {
                            label: 'Bonus',
                            value: 'bonus',
                            default: type === 'bonus',
                            emoji: '💰'
                        }
                    ])
            );
        
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }
    
    async removeMultiplier(interaction, config) {
        const type = interaction.options.getString('tipo');
        const targetId = interaction.options.getString('id');
        
        let removed = false;
        let targetName = '';
        
        switch (type) {
            case 'role':
                const roleIndex = config.multipliers.boostRoles.findIndex(r => r.roleId === targetId);
                if (roleIndex !== -1) {
                    const removedRole = config.multipliers.boostRoles[roleIndex];
                    config.multipliers.boostRoles.splice(roleIndex, 1);
                    removed = true;
                    
                    const role = interaction.guild.roles.cache.get(targetId);
                    targetName = role ? role.name : `Rol ${targetId}`;
                }
                break;
                
            case 'channel':
                const channelIndex = config.multipliers.specialChannels.findIndex(c => c.channelId === targetId);
                if (channelIndex !== -1) {
                    const removedChannel = config.multipliers.specialChannels[channelIndex];
                    config.multipliers.specialChannels.splice(channelIndex, 1);
                    removed = true;
                    
                    const channel = interaction.guild.channels.cache.get(targetId);
                    targetName = channel ? channel.name : `Canal ${targetId}`;
                }
                break;
                
            case 'bonus':
                if (config.levelSettings.bonusChannels.has(targetId)) {
                    const percentage = config.levelSettings.bonusChannels.get(targetId);
                    config.levelSettings.bonusChannels.delete(targetId);
                    removed = true;
                    
                    const channel = interaction.guild.channels.cache.get(targetId);
                    targetName = channel ? channel.name : `Canal ${targetId}`;
                }
                break;
        }
        
        if (!removed) {
            return interaction.editReply({
                content: `❌ No se encontró un multiplicador del tipo "${type}" con ID "${targetId}".`,
                flags: 64
            });
        }
        
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('❌ Multiplicador Removido')
            .setDescription(`Multiplicador de ${type === 'role' ? 'rol' : 'canal'} removido`)
            .addFields(
                {
                    name: '📝 Detalles',
                    value: [
                        `**Tipo:** ${type === 'role' ? 'Rol' : type === 'channel' ? 'Canal' : 'Bonus'}`,
                        `**Nombre:** ${targetName}`,
                        `**ID:** ${targetId}`,
                        `**Removido por:** ${interaction.user.tag}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⚠️ Efecto',
                    value: 'Los usuarios ya no recibirán el multiplicador en este elemento.',
                    inline: false
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    async showStats(interaction, config) {
        const roleMultipliers = config.multipliers.boostRoles;
        const channelMultipliers = config.multipliers.specialChannels;
        const bonusChannels = Array.from(config.levelSettings.bonusChannels.entries());
        
        // Calcular estadísticas
        const totalMultipliers = roleMultipliers.length + channelMultipliers.length + bonusChannels.length;
        
        // Multiplicador promedio
        const allMultipliers = [
            ...roleMultipliers.map(r => r.multiplier),
            ...channelMultipliers.map(c => c.multiplier),
            ...bonusChannels.map(([_, p]) => 1 + (p / 100))
        ];
        
        const avgMultiplier = allMultipliers.length > 0 
            ? allMultipliers.reduce((sum, m) => sum + m, 0) / allMultipliers.length 
            : 1;
        
        // Multiplicador más alto
        const highestMultiplier = allMultipliers.length > 0 
            ? Math.max(...allMultipliers) 
            : 1;
        
        // Usuarios afectados por multiplicadores de rol
        let affectedUsers = 0;
        roleMultipliers.forEach(roleMulti => {
            const role = interaction.guild.roles.cache.get(roleMulti.roleId);
            if (role) {
                affectedUsers += role.members.size;
            }
        });
        
        // Canales únicos con multiplicadores
        const allChannelIds = new Set([
            ...channelMultipliers.map(c => c.channelId),
            ...bonusChannels.map(([id]) => id)
        ]);
        
        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('📊 Estadísticas de Multiplicadores')
            .setDescription(`**${interaction.guild.name}**`)
            .addFields(
                {
                    name: '📈 Resumen General',
                    value: [
                        `**Total de multiplicadores:** ${totalMultipliers}`,
                        `**Multiplicadores por rol:** ${roleMultipliers.length}`,
                        `**Multiplicadores por canal:** ${channelMultipliers.length}`,
                        `**Canales con bonus:** ${bonusChannels.length}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Impacto',
                    value: [
                        `**Usuarios afectados:** ${affectedUsers}`,
                        `**Canales únicos:** ${allChannelIds.size}`,
                        `**Multiplicador promedio:** ${avgMultiplier.toFixed(2)}x`,
                        `**Multiplicador más alto:** ${highestMultiplier.toFixed(2)}x`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();
        
        // Agregar top 5 multiplicadores más altos
        if (allMultipliers.length > 0) {
            const sortedMultipliers = [
                ...roleMultipliers.map(r => ({ type: 'role', id: r.roleId, multiplier: r.multiplier })),
                ...channelMultipliers.map(c => ({ type: 'channel', id: c.channelId, multiplier: c.multiplier })),
                ...bonusChannels.map(([id, p]) => ({ type: 'bonus', id, multiplier: 1 + (p / 100) }))
            ].sort((a, b) => b.multiplier - a.multiplier)
             .slice(0, 5);
            
            if (sortedMultipliers.length > 0) {
                let topText = '';
                sortedMultipliers.forEach((item, index) => {
                    let name = 'Desconocido';
                    if (item.type === 'role') {
                        const role = interaction.guild.roles.cache.get(item.id);
                        name = role ? role.name : `Rol ${item.id}`;
                    } else {
                        const channel = interaction.guild.channels.cache.get(item.id);
                        name = channel ? channel.name : `Canal ${item.id}`;
                    }
                    
                    topText += `${index + 1}. **${item.multiplier.toFixed(2)}x** - ${name}\n`;
                });
                
                embed.addFields({
                    name: '🏆 Top 5 Multiplicadores',
                    value: topText,
                    inline: false
                });
            }
        }
        
        await interaction.editReply({ embeds: [embed] });
    }
}