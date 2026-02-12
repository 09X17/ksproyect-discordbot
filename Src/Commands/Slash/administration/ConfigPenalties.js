import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import GuildConfig from '../../../LevelSystem/Models/GuildConfig.js';

export default class PenaltiesSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('penalties')
                .setDescription('Administra penalizaciones y restricciones de XP')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reduccion-rol')
                        .setDescription('Configura reducción de XP por rol')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol que reduce el XP')
                                .setRequired(true)
                        )
                        .addNumberOption(option =>
                            option
                                .setName('multiplicador')
                                .setDescription('Multiplicador de reducción (0.1-1.0)')
                                .setRequired(true)
                                .setMinValue(0.1)
                                .setMaxValue(1.0)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('sin-xp-rol')
                        .setDescription('Agrega/remueve roles que no ganan XP')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol que no gana XP')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('agregar')
                                .setDescription('Agregar (true) o remover (false)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('sin-xp-canal')
                        .setDescription('Agrega/remueve canales donde no se gana XP')
                        .addChannelOption(option =>
                            option
                                .setName('canal')
                                .setDescription('Canal donde no se gana XP')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('agregar')
                                .setDescription('Agregar (true) o remover (false)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('ignorar-rol')
                        .setDescription('Agrega/remueve roles ignorados para XP')
                        .addRoleOption(option =>
                            option
                                .setName('rol')
                                .setDescription('Rol a ignorar')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('agregar')
                                .setDescription('Agregar (true) o remover (false)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('ignorar-canal')
                        .setDescription('Agrega/remueve canales ignorados para XP')
                        .addChannelOption(option =>
                            option
                                .setName('canal')
                                .setDescription('Canal a ignorar')
                                .setRequired(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('agregar')
                                .setDescription('Agregar (true) o remover (false)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('listar')
                        .setDescription('Lista todas las penalizaciones activas')
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de penalización a listar')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Reducciones por rol', value: 'reductions' },
                                    { name: 'Roles sin XP', value: 'no_xp_roles' },
                                    { name: 'Canales sin XP', value: 'no_xp_channels' },
                                    { name: 'Roles ignorados', value: 'ignored_roles' },
                                    { name: 'Canales ignorados', value: 'ignored_channels' },
                                    { name: 'Todos', value: 'all' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('limpiar')
                        .setDescription('Limpia todas las penalizaciones de un tipo')
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de penalización a limpiar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Reducciones por rol', value: 'reductions' },
                                    { name: 'Roles sin XP', value: 'no_xp_roles' },
                                    { name: 'Canales sin XP', value: 'no_xp_channels' },
                                    { name: 'Roles ignorados', value: 'ignored_roles' },
                                    { name: 'Canales ignorados', value: 'ignored_channels' },
                                    { name: 'Todas', value: 'all' }
                                )
                        )
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
                case 'reduccion-rol':
                    await this.configureReductionRole(interaction, config);
                    break;
                    
                case 'sin-xp-rol':
                    await this.configureNoXPRole(interaction, config);
                    break;
                    
                case 'sin-xp-canal':
                    await this.configureNoXPChannel(interaction, config);
                    break;
                    
                case 'ignorar-rol':
                    await this.configureIgnoredRole(interaction, config);
                    break;
                    
                case 'ignorar-canal':
                    await this.configureIgnoredChannel(interaction, config);
                    break;
                    
                case 'listar':
                    await this.listPenalties(interaction, config);
                    break;
                    
                case 'limpiar':
                    await this.clearPenalties(interaction, config);
                    break;
            }
            
        } catch (error) {
            client.logger.error('Error en penalties:', error);
            await interaction.editReply({
                content: '❌ Ocurrió un error al administrar las penalizaciones.',
                flags: 64
            });
        }
    }
    
    async configureReductionRole(interaction, config) {
        const role = interaction.options.getRole('rol');
        const multiplier = interaction.options.getNumber('multiplicador');
        
        // Verificar si el rol ya tiene una reducción
        const existingIndex = config.penalties.xpReductionRoles.findIndex(r => r.roleId === role.id);
        
        if (existingIndex !== -1) {
            // Actualizar reducción existente
            const oldMultiplier = config.penalties.xpReductionRoles[existingIndex].multiplier;
            config.penalties.xpReductionRoles[existingIndex].multiplier = multiplier;
            
            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('📉 Reducción de XP Actualizada')
                .setDescription(`Reducción del rol ${role.toString()} actualizada`)
                .addFields(
                    {
                        name: '📝 Cambios',
                        value: [
                            `**Multiplicador anterior:** ${oldMultiplier.toFixed(2)}x`,
                            `**Nuevo multiplicador:** ${multiplier.toFixed(2)}x`,
                            `**Reducción:** ${((1 - multiplier) * 100).toFixed(1)}% menos XP`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            `**Rol:** ${role.name} (${role.members.size} miembros)`,
                            `**XP base:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                            `**XP con reducción:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await config.save();
            return interaction.editReply({ embeds: [embed] });
        }
        
        // Agregar nueva reducción
        config.penalties.xpReductionRoles.push({
            roleId: role.id,
            multiplier
        });
        
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle('📉 Nueva Reducción de XP por Rol')
            .setDescription(`El rol ${role.toString()} ahora reduce XP a **${multiplier.toFixed(2)}x**`)
            .addFields(
                {
                    name: '📝 Configuración',
                    value: [
                        `**Rol:** ${role.name}`,
                        `**ID:** ${role.id}`,
                        `**Multiplicador:** ${multiplier.toFixed(2)}x`,
                        `**Reducción:** ${((1 - multiplier) * 100).toFixed(1)}%`,
                        `**Miembros afectados:** ${role.members.size}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💰 Ejemplo de Pérdida',
                    value: [
                        `**XP base por mensaje:** ${config.levelSettings.messageXP.min}-${config.levelSettings.messageXP.max}`,
                        `**XP con reducción:** ${Math.floor(config.levelSettings.messageXP.min * multiplier)}-${Math.floor(config.levelSettings.messageXP.max * multiplier)}`,
                        `**Pérdida por mensaje:** ${Math.floor(config.levelSettings.messageXP.max * (1 - multiplier))} XP máx.`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    async configureNoXPRole(interaction, config) {
        const role = interaction.options.getRole('rol');
        const add = interaction.options.getBoolean('agregar');
        
        const currentIndex = config.penalties.noXPRoles.indexOf(role.id);
        const exists = currentIndex !== -1;
        
        if (add) {
            if (exists) {
                return interaction.editReply({
                    content: `❌ El rol ${role.toString()} ya está en la lista de roles sin XP.`,
                    flags: 64
                });
            }
            
            config.penalties.noXPRoles.push(role.id);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('🚫 Rol Sin XP Agregado')
                .setDescription(`El rol ${role.toString()} ya no ganará XP`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Rol:** ${role.name}`,
                            `**ID:** ${role.id}`,
                            `**Miembros afectados:** ${role.members.size}`,
                            `**Tipo:** Sin XP`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚠️ Efecto',
                        value: [
                            'Los miembros con este rol:',
                            '• No ganarán XP por mensajes',
                            '• No ganarán XP por voz',
                            '• No aparecerán en el leaderboard',
                            '• No subirán de nivel'
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } else {
            if (!exists) {
                return interaction.editReply({
                    content: `❌ El rol ${role.toString()} no está en la lista de roles sin XP.`,
                    flags: 64
                });
            }
            
            config.penalties.noXPRoles.splice(currentIndex, 1);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Rol Sin XP Removido')
                .setDescription(`El rol ${role.toString()} ahora puede ganar XP nuevamente`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Rol:** ${role.name}`,
                            `**ID:** ${role.id}`,
                            `**Miembros beneficiados:** ${role.members.size}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            'Los miembros con este rol:',
                            '• Volverán a ganar XP por mensajes',
                            '• Volverán a ganar XP por voz',
                            '• Aparecerán en el leaderboard',
                            '• Podrán subir de nivel'
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    async configureNoXPChannel(interaction, config) {
        const channel = interaction.options.getChannel('canal');
        const add = interaction.options.getBoolean('agregar');
        
        if (!channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ El canal debe ser un canal de texto.',
                flags: 64
            });
        }
        
        const currentIndex = config.penalties.noXPChannels.indexOf(channel.id);
        const exists = currentIndex !== -1;
        
        if (add) {
            if (exists) {
                return interaction.editReply({
                    content: `❌ El canal ${channel.toString()} ya está en la lista de canales sin XP.`,
                    flags: 64
                });
            }
            
            config.penalties.noXPChannels.push(channel.id);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('🚫 Canal Sin XP Agregado')
                .setDescription(`El canal ${channel.toString()} ya no otorgará XP`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**ID:** ${channel.id}`,
                            `**Tipo:** ${channel.type}`,
                            `**Categoría:** ${channel.parent?.name || 'Ninguna'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⚠️ Efecto',
                        value: [
                            'Los mensajes en este canal:',
                            '• No otorgarán XP',
                            '• No contarán para estadísticas',
                            '• No activarán cooldown'
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } else {
            if (!exists) {
                return interaction.editReply({
                    content: `❌ El canal ${channel.toString()} no está en la lista de canales sin XP.`,
                    flags: 64
                });
            }
            
            config.penalties.noXPChannels.splice(currentIndex, 1);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Canal Sin XP Removido')
                .setDescription(`El canal ${channel.toString()} ahora otorgará XP`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**ID:** ${channel.id}`,
                            `**Tipo:** ${channel.type}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🎯 Efecto',
                        value: [
                            'Los mensajes en este canal:',
                            '• Otorgarán XP normalmente',
                            '• Contarán para estadísticas',
                            '• Activarán cooldown'
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    async configureIgnoredRole(interaction, config) {
        const role = interaction.options.getRole('rol');
        const add = interaction.options.getBoolean('agregar');
        
        const currentIndex = config.levelSettings.ignoredRoles.indexOf(role.id);
        const exists = currentIndex !== -1;
        
        if (add) {
            if (exists) {
                return interaction.editReply({
                    content: `❌ El rol ${role.toString()} ya está en la lista de roles ignorados.`,
                    flags: 64
                });
            }
            
            config.levelSettings.ignoredRoles.push(role.id);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('👁️‍🗨️ Rol Ignorado Agregado')
                .setDescription(`El rol ${role.toString()} será ignorado para XP`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Rol:** ${role.name}`,
                            `**ID:** ${role.id}`,
                            `**Miembros afectados:** ${role.members.size}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: 'ℹ️ Diferencia con "Sin XP"',
                        value: [
                            '**Roles ignorados:**',
                            '• El sistema no procesa a estos usuarios',
                            '• Más eficiente para muchos usuarios',
                            '**Roles sin XP:**',
                            '• El sistema procesa pero da 0 XP',
                            '• Permite estadísticas'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } else {
            if (!exists) {
                return interaction.editReply({
                    content: `❌ El rol ${role.toString()} no está en la lista de roles ignorados.`,
                    flags: 64
                });
            }
            
            config.levelSettings.ignoredRoles.splice(currentIndex, 1);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Rol Ignorado Removido')
                .setDescription(`El rol ${role.toString()} ya no será ignorado`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Rol:** ${role.name}`,
                            `**ID:** ${role.id}`,
                            `**Miembros beneficiados:** ${role.members.size}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    async configureIgnoredChannel(interaction, config) {
        const channel = interaction.options.getChannel('canal');
        const add = interaction.options.getBoolean('agregar');
        
        if (!channel.isTextBased()) {
            return interaction.editReply({
                content: '❌ El canal debe ser un canal de texto.',
                flags: 64
            });
        }
        
        const currentIndex = config.levelSettings.ignoredChannels.indexOf(channel.id);
        const exists = currentIndex !== -1;
        
        if (add) {
            if (exists) {
                return interaction.editReply({
                    content: `❌ El canal ${channel.toString()} ya está en la lista de canales ignorados.`,
                    flags: 64
                });
            }
            
            config.levelSettings.ignoredChannels.push(channel.id);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('👁️‍🗨️ Canal Ignorado Agregado')
                .setDescription(`El canal ${channel.toString()} será ignorado para XP`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**ID:** ${channel.id}`,
                            `**Tipo:** ${channel.type}`
                        ].join('\n'),
                            inline: true
                    },
                    {
                        name: 'ℹ️ Diferencia con "Sin XP"',
                        value: [
                            '**Canales ignorados:**',
                            '• El sistema no procesa mensajes aquí',
                            '• Más eficiente',
                            '**Canales sin XP:**',
                            '• El sistema procesa pero da 0 XP',
                            '• Permite estadísticas'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            
        } else {
            if (!exists) {
                return interaction.editReply({
                    content: `❌ El canal ${channel.toString()} no está en la lista de canales ignorados.`,
                    flags: 64
                });
            }
            
            config.levelSettings.ignoredChannels.splice(currentIndex, 1);
            await config.save();
            
            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Canal Ignorado Removido')
                .setDescription(`El canal ${channel.toString()} ya no será ignorado`)
                .addFields(
                    {
                        name: '📝 Configuración',
                        value: [
                            `**Canal:** ${channel.name}`,
                            `**ID:** ${channel.id}`,
                            `**Tipo:** ${channel.type}`
                        ].join('\n'),
                        inline: true
                    }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
        }
    }
    
    async listPenalties(interaction, config) {
        const type = interaction.options.getString('tipo') || 'all';
        
        const embed = new EmbedBuilder()
            .setColor('#34495E')
            .setTitle('📋 Penalizaciones y Restricciones')
            .setDescription(`**${interaction.guild.name}**`)
            .setTimestamp();
        
        if (type === 'reductions' || type === 'all') {
            const reductionRoles = config.penalties.xpReductionRoles;
            
            if (reductionRoles.length > 0) {
                let reductionsText = '';
                reductionRoles.forEach((reduction, index) => {
                    const role = interaction.guild.roles.cache.get(reduction.roleId);
                    const roleName = role ? role.name : 'Rol no encontrado';
                    const roleMention = role ? `<@&${reduction.roleId}>` : `ID: ${reduction.roleId}`;
                    const reductionPercent = ((1 - reduction.multiplier) * 100).toFixed(1);
                    
                    reductionsText += `${index + 1}. ${roleMention}\n`;
                    reductionsText += `   **${reduction.multiplier.toFixed(2)}x** (${reductionPercent}% menos) - ${roleName}\n`;
                    reductionsText += `   Miembros: ${role ? role.members.size : 'N/A'}\n\n`;
                });
                
                embed.addFields({
                    name: `📉 Reducciones por Rol (${reductionRoles.length})`,
                    value: reductionsText || 'No hay reducciones por rol',
                    inline: false
                });
            } else if (type === 'reductions') {
                embed.addFields({
                    name: '📉 Reducciones por Rol',
                    value: 'No hay reducciones por rol configuradas',
                    inline: false
                });
            }
        }
        
        if (type === 'no_xp_roles' || type === 'all') {
            const noXPRoles = config.penalties.noXPRoles;
            
            if (noXPRoles.length > 0) {
                let noXPRolesText = '';
                noXPRoles.forEach((roleId, index) => {
                    const role = interaction.guild.roles.cache.get(roleId);
                    const roleName = role ? role.name : 'Rol no encontrado';
                    const roleMention = role ? `<@&${roleId}>` : `ID: ${roleId}`;
                    
                    noXPRolesText += `${index + 1}. ${roleMention}\n`;
                    noXPRolesText += `   ${roleName}\n`;
                    noXPRolesText += `   Miembros: ${role ? role.members.size : 'N/A'}\n\n`;
                });
                
                embed.addFields({
                    name: `🚫 Roles Sin XP (${noXPRoles.length})`,
                    value: noXPRolesText || 'No hay roles sin XP',
                    inline: false
                });
            } else if (type === 'no_xp_roles') {
                embed.addFields({
                    name: '🚫 Roles Sin XP',
                    value: 'No hay roles sin XP configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'no_xp_channels' || type === 'all') {
            const noXPChannels = config.penalties.noXPChannels;
            
            if (noXPChannels.length > 0) {
                let noXPChannelsText = '';
                noXPChannels.forEach((channelId, index) => {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    const channelName = channel ? channel.name : 'Canal no encontrado';
                    const channelMention = channel ? `<#${channelId}>` : `ID: ${channelId}`;
                    
                    noXPChannelsText += `${index + 1}. ${channelMention}\n`;
                    noXPChannelsText += `   ${channelName}\n\n`;
                });
                
                embed.addFields({
                    name: `🚫 Canales Sin XP (${noXPChannels.length})`,
                    value: noXPChannelsText || 'No hay canales sin XP',
                    inline: false
                });
            } else if (type === 'no_xp_channels') {
                embed.addFields({
                    name: '🚫 Canales Sin XP',
                    value: 'No hay canales sin XP configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'ignored_roles' || type === 'all') {
            const ignoredRoles = config.levelSettings.ignoredRoles;
            
            if (ignoredRoles.length > 0) {
                let ignoredRolesText = '';
                ignoredRoles.forEach((roleId, index) => {
                    const role = interaction.guild.roles.cache.get(roleId);
                    const roleName = role ? role.name : 'Rol no encontrado';
                    const roleMention = role ? `<@&${roleId}>` : `ID: ${roleId}`;
                    
                    ignoredRolesText += `${index + 1}. ${roleMention}\n`;
                    ignoredRolesText += `   ${roleName}\n`;
                    ignoredRolesText += `   Miembros: ${role ? role.members.size : 'N/A'}\n\n`;
                });
                
                embed.addFields({
                    name: `👁️‍🗨️ Roles Ignorados (${ignoredRoles.length})`,
                    value: ignoredRolesText || 'No hay roles ignorados',
                    inline: false
                });
            } else if (type === 'ignored_roles') {
                embed.addFields({
                    name: '👁️‍🗨️ Roles Ignorados',
                    value: 'No hay roles ignorados configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'ignored_channels' || type === 'all') {
            const ignoredChannels = config.levelSettings.ignoredChannels;
            
            if (ignoredChannels.length > 0) {
                let ignoredChannelsText = '';
                ignoredChannels.forEach((channelId, index) => {
                    const channel = interaction.guild.channels.cache.get(channelId);
                    const channelName = channel ? channel.name : 'Canal no encontrado';
                    const channelMention = channel ? `<#${channelId}>` : `ID: ${channelId}`;
                    
                    ignoredChannelsText += `${index + 1}. ${channelMention}\n`;
                    ignoredChannelsText += `   ${channelName}\n\n`;
                });
                
                embed.addFields({
                    name: `👁️‍🗨️ Canales Ignorados (${ignoredChannels.length})`,
                    value: ignoredChannelsText || 'No hay canales ignorados',
                    inline: false
                });
            } else if (type === 'ignored_channels') {
                embed.addFields({
                    name: '👁️‍🗨️ Canales Ignorados',
                    value: 'No hay canales ignorados configurados',
                    inline: false
                });
            }
        }
        
        if (type === 'all' && 
            config.penalties.xpReductionRoles.length === 0 && 
            config.penalties.noXPRoles.length === 0 && 
            config.penalties.noXPChannels.length === 0 && 
            config.levelSettings.ignoredRoles.length === 0 && 
            config.levelSettings.ignoredChannels.length === 0) {
            embed.setDescription('No hay penalizaciones configuradas en este servidor.');
        }
        
        // Agregar menú de selección
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('penalties_filter')
                    .setPlaceholder('Filtrar por tipo...')
                    .addOptions([
                        {
                            label: 'Todos',
                            value: 'all',
                            default: type === 'all',
                            emoji: '📋'
                        },
                        {
                            label: 'Reducciones',
                            value: 'reductions',
                            default: type === 'reductions',
                            emoji: '📉'
                        },
                        {
                            label: 'Roles Sin XP',
                            value: 'no_xp_roles',
                            default: type === 'no_xp_roles',
                            emoji: '🚫'
                        },
                        {
                            label: 'Canales Sin XP',
                            value: 'no_xp_channels',
                            default: type === 'no_xp_channels',
                            emoji: '📵'
                        },
                        {
                            label: 'Roles Ignorados',
                            value: 'ignored_roles',
                            default: type === 'ignored_roles',
                            emoji: '👁️‍🗨️'
                        },
                        {
                            label: 'Canales Ignorados',
                            value: 'ignored_channels',
                            default: type === 'ignored_channels',
                            emoji: '👁️‍🗨️'
                        }
                    ])
            );
        
        await interaction.editReply({
            embeds: [embed],
            components: [row]
        });
    }
    
    async clearPenalties(interaction, config) {
        const type = interaction.options.getString('tipo');
        
        let clearedItems = [];
        let clearedCount = 0;
        
        switch (type) {
            case 'reductions':
                clearedCount = config.penalties.xpReductionRoles.length;
                clearedItems = config.penalties.xpReductionRoles.map(r => r.roleId);
                config.penalties.xpReductionRoles = [];
                break;
                
            case 'no_xp_roles':
                clearedCount = config.penalties.noXPRoles.length;
                clearedItems = [...config.penalties.noXPRoles];
                config.penalties.noXPRoles = [];
                break;
                
            case 'no_xp_channels':
                clearedCount = config.penalties.noXPChannels.length;
                clearedItems = [...config.penalties.noXPChannels];
                config.penalties.noXPChannels = [];
                break;
                
            case 'ignored_roles':
                clearedCount = config.levelSettings.ignoredRoles.length;
                clearedItems = [...config.levelSettings.ignoredRoles];
                config.levelSettings.ignoredRoles = [];
                break;
                
            case 'ignored_channels':
                clearedCount = config.levelSettings.ignoredChannels.length;
                clearedItems = [...config.levelSettings.ignoredChannels];
                config.levelSettings.ignoredChannels = [];
                break;
                
            case 'all':
                const allCleared = {
                    reductions: config.penalties.xpReductionRoles.length,
                    no_xp_roles: config.penalties.noXPRoles.length,
                    no_xp_channels: config.penalties.noXPChannels.length,
                    ignored_roles: config.levelSettings.ignoredRoles.length,
                    ignored_channels: config.levelSettings.ignoredChannels.length
                };
                
                clearedCount = Object.values(allCleared).reduce((a, b) => a + b, 0);
                
                config.penalties.xpReductionRoles = [];
                config.penalties.noXPRoles = [];
                config.penalties.noXPChannels = [];
                config.levelSettings.ignoredRoles = [];
                config.levelSettings.ignoredChannels = [];
                break;
        }
        
        await config.save();
        
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🧹 Penalizaciones Limpiadas')
            .setDescription(`Se limpiaron las penalizaciones del tipo: **${this.getTypeName(type)}**`)
            .addFields(
                {
                    name: '📊 Resultado',
                    value: [
                        `**Tipo:** ${this.getTypeName(type)}`,
                        `**Elementos limpiados:** ${clearedCount}`,
                        `**Administrador:** ${interaction.user.tag}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎯 Efecto',
                    value: type === 'all' 
                        ? 'Todas las penalizaciones han sido removidas.'
                        : `Los ${this.getTypeName(type).toLowerCase()} ya no aplican.`,
                    inline: true
                }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
    }
    
    getTypeName(type) {
        const names = {
            reductions: 'Reducciones por Rol',
            no_xp_roles: 'Roles Sin XP',
            no_xp_channels: 'Canales Sin XP',
            ignored_roles: 'Roles Ignorados',
            ignored_channels: 'Canales Ignorados',
            all: 'Todas las Penalizaciones'
        };
        
        return names[type] || type;
    }
}