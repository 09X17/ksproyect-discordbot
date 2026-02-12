import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import GuildConfigLevel from '../../../LevelSystem/Models/GuildConfig.js';

export default class EventsAdminCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('events-admin')
                .setDescription('Administra los eventos especiales del servidor')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
                .addSubcommand(sub =>
                    sub
                        .setName('panel')
                        .setDescription('Abrir panel de gestión de eventos')
                )
                .addSubcommand(sub =>
                    sub
                        .setName('iniciar')
                        .setDescription('Iniciar un evento especial')
                        .addStringOption(option =>
                            option
                                .setName('evento')
                                .setDescription('Evento a iniciar')
                                .setRequired(true)
                                .addChoices(
                                    { name: '🎮 Gaming Weekend', value: 'gaming_weekend' },
                                    { name: '🌙 Noctámbulos', value: 'night_owl' },
                                    { name: '🔥 Hora Rush', value: 'rush_hour' },
                                    { name: '⚡ Super Boost', value: 'super_boost' },
                                    { name: '🎉 Celebración Mensual', value: 'monthly_celebration' },
                                    { name: '🎯 Desafío del Miércoles', value: 'weekly_challenge' },
                                    { name: '🌟 Festivo Especial', value: 'holiday_special' },
                                    { name: '🏆 Modo Competitivo', value: 'competitive_mode' }
                                )
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('duracion')
                                .setDescription('Duración en horas (1-168)')
                                .setMinValue(1)
                                .setMaxValue(168)
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('detener')
                        .setDescription('Detener un evento activo')
                        .addStringOption(option =>
                            option
                                .setName('evento-id')
                                .setDescription('ID del evento a detener')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('lista')
                        .setDescription('Ver todos los eventos disponibles')
                        .addBooleanOption(option =>
                            option
                                .setName('solo-activos')
                                .setDescription('Mostrar solo eventos activos')
                                .setRequired(false)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('crear')
                        .setDescription('Crear un evento personalizado')
                        .addStringOption(option =>
                            option
                                .setName('nombre')
                                .setDescription('Nombre del evento')
                                .setRequired(true)
                                .setMaxLength(50)
                        )
                        .addStringOption(option =>
                            option
                                .setName('descripcion')
                                .setDescription('Descripción del evento')
                                .setRequired(true)
                                .setMaxLength(200)
                        )
                        .addStringOption(option =>
                            option
                                .setName('tipo')
                                .setDescription('Tipo de recompensa')
                                .setRequired(true)
                                .addChoices(
                                    { name: '⚡ Multiplicador de XP', value: 'xp_multiplier' },
                                    { name: '💰 Multiplicador de Monedas', value: 'coin_multiplier' },
                                    { name: '🪙 Bonus de Tokens', value: 'token_bonus' }
                                )
                        )
                        .addNumberOption(option =>
                            option
                                .setName('valor')
                                .setDescription('Multiplicador (1.0-5.0) o Bonus (1-100)')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(100)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('duracion')
                                .setDescription('Duración en horas')
                                .setMinValue(1)
                                .setMaxValue(168)
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('icono')
                                .setDescription('Emoji del evento (ej: 🎊)')
                                .setRequired(false)
                                .setMaxLength(2)
                        )
                        .addStringOption(option =>
                            option
                                .setName('color')
                                .setDescription('Color hex (ej: #FF6B6B)')
                                .setRequired(false)
                                .setMaxLength(7)
                        )
                )
                .addSubcommand(sub =>
                    sub
                        .setName('editar')
                        .setDescription('Editar un evento personalizado')
                        .addStringOption(option =>
                            option
                                .setName('evento-id')
                                .setDescription('ID del evento a editar')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('campo')
                                .setDescription('Campo a modificar')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Nombre', value: 'name' },
                                    { name: 'Descripción', value: 'description' },
                                    { name: 'Multiplicador/Bonus', value: 'multiplier' },
                                    { name: 'Icono', value: 'icon' },
                                    { name: 'Color', value: 'color' }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName('nuevo-valor')
                                .setDescription('Nuevo valor para el campo')
                                .setRequired(true)
                        )
                )

                // Eliminar evento
                .addSubcommand(sub =>
                    sub
                        .setName('eliminar')
                        .setDescription('Eliminar un evento personalizado')
                        .addStringOption(option =>
                            option
                                .setName('evento-id')
                                .setDescription('ID del evento a eliminar')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('confirmar')
                                .setDescription('Confirmar eliminación')
                                .setRequired(true)
                        )
                )

                // Estadísticas de evento
                .addSubcommand(sub =>
                    sub
                        .setName('stats')
                        .setDescription('Ver estadísticas de un evento')
                        .addStringOption(option =>
                            option
                                .setName('evento-id')
                                .setDescription('ID del evento')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                // Historial de eventos
                .addSubcommand(sub =>
                    sub
                        .setName('historial')
                        .setDescription('Ver historial de eventos del servidor')
                        .addIntegerOption(option =>
                            option
                                .setName('cantidad')
                                .setDescription('Cantidad de eventos a mostrar')
                                .setMinValue(5)
                                .setMaxValue(25)
                                .setRequired(false)
                        )
                )

                // Configuración de eventos
                .addSubcommand(sub =>
                    sub
                        .setName('config')
                        .setDescription('Configurar el sistema de eventos')
                        .addChannelOption(option =>
                            option
                                .setName('canal-anuncios')
                                .setDescription('Canal para anunciar eventos')
                                .setRequired(false)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('auto-inicio')
                                .setDescription('Iniciar eventos automáticamente')
                                .setRequired(false)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('notificaciones')
                                .setDescription('Enviar notificaciones de eventos')
                                .setRequired(false)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('sistema-activo')
                                .setDescription('Activar/desactivar sistema de eventos')
                                .setRequired(false)
                        )
                ),

            cooldown: 3,
            category: 'administration',
            userPermissions: [PermissionFlagsBits.ManageGuild],
            botPermissions: [
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks
            ]
        });
    }

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Verificar que el sistema de eventos esté disponible
        if (!client.levelManager?.eventManager) {
            return interaction.reply({
                content: '❌ El sistema de eventos no está disponible en este momento.',
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            switch (subcommand) {
                case 'panel':
                    return await this.handlePanel(client, interaction);
                case 'iniciar':
                    return await this.handleIniciar(client, interaction);
                case 'detener':
                    return await this.handleDetener(client, interaction);
                case 'lista':
                    return await this.handleLista(client, interaction);
                case 'crear':
                    return await this.handleCrear(client, interaction);
                case 'editar':
                    return await this.handleEditar(client, interaction);
                case 'eliminar':
                    return await this.handleEliminar(client, interaction);
                case 'stats':
                    return await this.handleStats(client, interaction);
                case 'historial':
                    return await this.handleHistorial(client, interaction);
                case 'config':
                    return await this.handleConfig(client, interaction);
            }
        } catch (error) {
            client.logger.error('Error en events-admin:', error);

            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({
                    content: `❌ Error: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            }

            return interaction.reply({
                content: `❌ Error: ${error.message}`,
                flags: MessageFlags.Ephemeral
            });
        }
    }

    /**
     * Maneja el autocomplete para IDs de eventos
     */
    async autocomplete(client, interaction) {
        if (!interaction.isAutocomplete()) return;

        const focusedOption = interaction.options.getFocused(true);
        if (!focusedOption) return interaction.respond([]);

        if (focusedOption.name !== 'evento-id') {
            return interaction.respond([]);
        }

        const eventManager = client.levelManager?.eventManager;
        if (!eventManager) {
            return interaction.respond([]);
        }

        const guildId = interaction.guild.id;
        const eventos = await eventManager.getGuildEvents(guildId, true);

        const choices = eventos
            .filter(e =>
                e.eventId.toLowerCase().includes(focusedOption.value.toLowerCase())
            )
            .slice(0, 25)
            .map(e => ({
                name: `${e.name} (${e.active ? '🟢' : '⚫'})`,
                value: e.eventId
            }));

        return interaction.respond(choices);
    }


    /**
     * Panel principal de gestión de eventos
     */
    async handlePanel(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;
        const status = await eventManager.getEventStatusForGuild(guildId);

        const embed = new EmbedBuilder()
            .setColor(status.hasActiveEvents ? '#00FF00' : '#7289DA')
            .setTitle('🎪 Panel de Gestión de Eventos')
            .setDescription(
                `Administra los eventos especiales del servidor desde aquí.\n\n` +
                `**Estado del Sistema:** ${status.enabled ? '🟢 Activo' : '🔴 Inactivo'}`
            )
            .addFields(
                {
                    name: '⚙️ Configuración Actual',
                    value:
                        `> Auto-inicio: ${status.settings.autoStartEvents ? '✅' : '❌'}\n` +
                        `> Notificaciones: ${status.settings.eventNotifications ? '✅' : '❌'}\n` +
                        `> Canal: ${status.settings.announcementChannel ? `<#${status.settings.announcementChannel}>` : '❌ No configurado'}`,
                    inline: true
                },
                {
                    name: '📊 Multiplicadores Activos',
                    value:
                        `> XP: **x${status.multipliers.xp.multiplier}**\n` +
                        `> Monedas: **x${status.multipliers.coins.multiplier}**\n` +
                        `> Tokens: **+${status.multipliers.tokens.bonus}**`,
                    inline: true
                }
            )
            .setFooter({ text: `${status.activeEvents.length} evento(s) activo(s)` })
            .setTimestamp();

        if (status.activeEvents.length > 0) {
            const eventosActivos = status.activeEvents.map(e =>
                `**${e.icon || '🎊'} ${e.name}**\n` +
                `└ Termina: <t:${Math.floor(new Date(e.endDate).getTime() / 1000)}:R>`
            ).join('\n');

            embed.addFields({
                name: '🎉 Eventos Activos',
                value: eventosActivos,
                inline: false
            });
        }

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('events_admin_start')
                    .setLabel('Iniciar Evento')
                    .setEmoji('🎪')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('events_admin_stop')
                    .setLabel('Detener Evento')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('events_admin_list')
                    .setLabel('Ver Eventos')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('events_admin_create')
                    .setLabel('Crear Evento')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('events_admin_config')
                    .setLabel('Configuración')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('events_admin_stats')
                    .setLabel('Estadísticas')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.editReply({
            embeds: [embed],
            components: [row1, row2]
        });
    }

    /**
     * Inicia un evento
     */
    async handleIniciar(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eventId = interaction.options.getString('evento');
        const duracion = interaction.options.getInteger('duracion') || 24;
        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        // Verificar si el evento ya está activo
        const isActive = await eventManager.isEventActive(guildId, eventId);
        if (isActive) {
            return interaction.editReply({
                content: '⚠️ Este evento ya está activo. Deténlo primero si deseas reiniciarlo.'
            });
        }

        // Iniciar el evento
        const event = await eventManager.startEvent(guildId, eventId, duracion);

        const embed = new EmbedBuilder()
            .setColor(event.color || '#00FF00')
            .setTitle(`${event.icon || '🎊'} Evento Iniciado`)
            .setDescription(`**${event.name}** está ahora activo en el servidor!`)
            .addFields(
                {
                    name: '📝 Descripción',
                    value: event.description || 'Sin descripción',
                    inline: false
                },
                {
                    name: '⏱️ Duración',
                    value: `${duracion} hora(s)`,
                    inline: true
                },
                {
                    name: '🏁 Finaliza',
                    value: `<t:${Math.floor(event.endDate.getTime() / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '🎯 Beneficios',
                    value: this.getEventBenefits(event),
                    inline: false
                }
            )
            .setFooter({ text: `Iniciado por ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    /**
     * Detiene un evento activo
     */
    async handleDetener(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eventId = interaction.options.getString('evento-id');
        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        const event = await eventManager.stopEvent(guildId, eventId);

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⏹️ Evento Detenido')
            .setDescription(`El evento **${event.name}** ha sido detenido.`)
            .addFields(
                {
                    name: 'ID del Evento',
                    value: `\`${event.eventId}\``,
                    inline: true
                },
                {
                    name: 'Detenido por',
                    value: interaction.user.tag,
                    inline: true
                }
            )
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    /**
     * Lista todos los eventos
     */
    async handleLista(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const soloActivos = interaction.options.getBoolean('solo-activos') || false;
        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        const eventos = await eventManager.getGuildEvents(guildId, !soloActivos);
        const eventosPredefinidos = eventManager.getDefaultEvents();

        const embeds = [];

        // Eventos predefinidos
        const predefinidosEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('🌟 Eventos Predefinidos Disponibles')
            .setDescription('Estos eventos pueden iniciarse automáticamente según su programación.')
            .setFooter({ text: `${eventosPredefinidos.length} eventos disponibles` });

        eventosPredefinidos.forEach(e => {
            predefinidosEmbed.addFields({
                name: `${e.icon || '🎊'} ${e.name}`,
                value:
                    `${e.description}\n` +
                    `**Tipo:** ${this.getTipoNombre(e.type)}\n` +
                    `**Multiplicador:** x${e.multiplier || 1}\n` +
                    `**ID:** \`${e.id}\``,
                inline: true
            });
        });

        embeds.push(predefinidosEmbed);

        // Eventos del servidor
        if (eventos.length > 0) {
            const activos = eventos.filter(e => e.active);
            const inactivos = eventos.filter(e => !e.active);

            if (activos.length > 0) {
                const activosEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎪 Eventos Activos')
                    .setDescription('Eventos actualmente corriendo en el servidor')
                    .setFooter({ text: `${activos.length} evento(s) activo(s)` });

                activos.forEach(e => {
                    activosEmbed.addFields({
                        name: `${e.icon || '🎊'} ${e.name}`,
                        value:
                            `${e.description}\n` +
                            `**Finaliza:** <t:${Math.floor(new Date(e.endDate).getTime() / 1000)}:R>\n` +
                            `**ID:** \`${e.eventId}\``,
                        inline: false
                    });
                });

                embeds.push(activosEmbed);
            }

            if (!soloActivos && inactivos.length > 0) {
                const inactivosEmbed = new EmbedBuilder()
                    .setColor('#999999')
                    .setTitle('💤 Eventos Personalizados Inactivos')
                    .setDescription('Eventos creados en este servidor')
                    .setFooter({ text: `${inactivos.length} evento(s) inactivo(s)` });

                inactivos.slice(0, 10).forEach(e => {
                    inactivosEmbed.addFields({
                        name: `${e.icon || '🎊'} ${e.name}`,
                        value:
                            `${e.description}\n` +
                            `**Creado:** <t:${Math.floor(e.createdAt.getTime() / 1000)}:R>\n` +
                            `**ID:** \`${e.eventId}\``,
                        inline: true
                    });
                });

                embeds.push(inactivosEmbed);
            }
        }

        return interaction.editReply({ embeds });
    }

    /**
     * Crea un evento personalizado
     */
    async handleCrear(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const nombre = interaction.options.getString('nombre');
        const descripcion = interaction.options.getString('descripcion');
        const tipo = interaction.options.getString('tipo');
        const valor = interaction.options.getNumber('valor');
        const duracion = interaction.options.getInteger('duracion') || 24;
        const icono = interaction.options.getString('icono') || '🎊';
        const color = interaction.options.getString('color') || '#7289DA';

        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        // Validar color hex
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
            return interaction.editReply({
                content: '❌ El color debe estar en formato hex válido (ej: #FF6B6B)'
            });
        }

        const eventData = {
            name: nombre,
            description: descripcion,
            type: tipo,
            durationHours: duracion,
            icon: icono,
            color: color
        };

        // Asignar el valor según el tipo
        if (tipo === 'token_bonus') {
            eventData.bonus = Math.floor(valor);
        } else {
            eventData.multiplier = valor;
        }

        const event = await eventManager.createCustomEvent(
            guildId,
            eventData,
            interaction.user
        );

        const embed = new EmbedBuilder()
            .setColor(event.color)
            .setTitle('✅ Evento Personalizado Creado')
            .setDescription(`**${event.name}** ha sido creado exitosamente!`)
            .addFields(
                {
                    name: '📝 Detalles',
                    value:
                        `**Descripción:** ${event.description}\n` +
                        `**Tipo:** ${this.getTipoNombre(event.type)}\n` +
                        `**${tipo === 'token_bonus' ? 'Bonus' : 'Multiplicador'}:** ${tipo === 'token_bonus' ? `+${event.bonus}` : `x${event.multiplier}`}\n` +
                        `**Duración predeterminada:** ${event.durationHours}h`,
                    inline: false
                },
                {
                    name: '🆔 ID del Evento',
                    value: `\`${event.eventId}\``,
                    inline: false
                },
                {
                    name: '🎯 Siguiente Paso',
                    value: `Usa \`/events-admin iniciar evento:${event.eventId}\` para activarlo`,
                    inline: false
                }
            )
            .setFooter({ text: `Creado por ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    /**
     * Edita un evento personalizado
     */
    async handleEditar(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eventId = interaction.options.getString('evento-id');
        const campo = interaction.options.getString('campo');
        const nuevoValor = interaction.options.getString('nuevo-valor');

        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        const updates = {};

        // Validar y convertir el valor según el campo
        switch (campo) {
            case 'name':
                updates.name = nuevoValor;
                break;
            case 'description':
                updates.description = nuevoValor;
                break;
            case 'multiplier':
                const valor = parseFloat(nuevoValor);
                if (isNaN(valor) || valor < 1 || valor > 10) {
                    return interaction.editReply({
                        content: '❌ El multiplicador/bonus debe ser un número entre 1 y 10 (o 1-100 para bonus)'
                    });
                }
                updates.multiplier = valor;
                updates.bonus = Math.floor(valor);
                break;
            case 'icon':
                updates.icon = nuevoValor;
                break;
            case 'color':
                if (!/^#[0-9A-F]{6}$/i.test(nuevoValor)) {
                    return interaction.editReply({
                        content: '❌ El color debe estar en formato hex (ej: #FF6B6B)'
                    });
                }
                updates.color = nuevoValor;
                break;
        }

        const event = await eventManager.updateEvent(guildId, eventId, updates);

        return interaction.editReply({
            content: `✅ Evento **${event.name}** actualizado correctamente.\n**${this.getCampoNombre(campo)}:** ${nuevoValor}`
        });
    }

    /**
     * Elimina un evento personalizado
     */
    async handleEliminar(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eventId = interaction.options.getString('evento-id');
        const confirmar = interaction.options.getBoolean('confirmar');

        if (!confirmar) {
            return interaction.editReply({
                content: '❌ Debes confirmar la eliminación del evento.'
            });
        }

        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        // Verificar que no sea un evento predefinido
        const eventosPredefinidos = eventManager.getDefaultEvents();
        if (eventosPredefinidos.some(e => e.id === eventId)) {
            return interaction.editReply({
                content: '❌ No puedes eliminar eventos predefinidos del sistema.'
            });
        }

        // Detener si está activo
        const isActive = await eventManager.isEventActive(guildId, eventId);
        if (isActive) {
            await eventManager.stopEvent(guildId, eventId);
        }

        await eventManager.deleteEvent(guildId, eventId);

        return interaction.editReply({
            content: `✅ Evento eliminado correctamente.\nID: \`${eventId}\``
        });
    }

    /**
     * Muestra estadísticas de un evento
     */
    async handleStats(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const eventId = interaction.options.getString('evento-id');
        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        const stats = await eventManager.getEventStats(guildId, eventId);

        if (!stats) {
            return interaction.editReply({
                content: `❌ No se encontró el evento con ID: \`${eventId}\``
            });
        }

        const embed = new EmbedBuilder()
            .setColor(stats.active ? '#00FF00' : '#999999')
            .setTitle(`📊 Estadísticas: ${stats.name}`)
            .addFields(
                {
                    name: '📝 Información',
                    value:
                        `**Estado:** ${stats.active ? '🟢 Activo' : '⚫ Inactivo'}\n` +
                        `**Tipo:** ${this.getTipoNombre(stats.type)}\n` +
                        `**Creado por:** ${stats.createdBy?.username || 'Sistema'}\n` +
                        `**Creado:** <t:${Math.floor(stats.createdAt.getTime() / 1000)}:D>`,
                    inline: true
                }
            );

        if (stats.stats && stats.stats.usersAffected > 0) {
            const bonusInfo = [];
            if (stats.stats.totalBonusGiven?.xp) {
                bonusInfo.push(`**XP:** ${stats.stats.totalBonusGiven.xp.toLocaleString()}`);
            }
            if (stats.stats.totalBonusGiven?.coins) {
                bonusInfo.push(`**Monedas:** ${stats.stats.totalBonusGiven.coins.toLocaleString()}`);
            }
            if (stats.stats.totalBonusGiven?.tokens) {
                bonusInfo.push(`**Tokens:** ${stats.stats.totalBonusGiven.tokens.toLocaleString()}`);
            }

            embed.addFields({
                name: '📈 Impacto',
                value:
                    `**Usuarios afectados:** ${stats.stats.usersAffected.toLocaleString()}\n` +
                    `**Bonus total dado:**\n${bonusInfo.join('\n')}`,
                inline: true
            });
        }

        if (stats.startDate) {
            embed.addFields({
                name: '⏰ Activación',
                value:
                    `**Última vez:** <t:${Math.floor(stats.startDate.getTime() / 1000)}:R>\n` +
                    `**Duración:** ${stats.totalDuration} horas`,
                inline: false
            });
        }

        embed.setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    /**
     * Muestra el historial de eventos
     */
    async handleHistorial(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const cantidad = interaction.options.getInteger('cantidad') || 10;
        const guildId = interaction.guild.id;
        const eventManager = client.levelManager.eventManager;

        const historial = eventManager.getEventHistory(guildId, cantidad);

        if (historial.length === 0) {
            return interaction.editReply({
                content: '📭 No hay historial de eventos en este servidor.'
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('📜 Historial de Eventos')
            .setDescription(`Últimos ${historial.length} eventos en el servidor`)
            .setFooter({ text: `${historial.length} evento(s) registrado(s)` })
            .setTimestamp();

        historial.forEach((evento, index) => {
            embed.addFields({
                name: `${index + 1}. ${evento.name}`,
                value:
                    `**Tipo:** ${this.getTipoNombre(evento.type)}\n` +
                    `**Inicio:** <t:${Math.floor(new Date(evento.startDate).getTime() / 1000)}:D>\n` +
                    `**Duración:** ${evento.durationHours}h\n` +
                    `**ID:** \`${evento.eventId}\``,
                inline: false
            });
        });

        return interaction.editReply({ embeds: [embed] });
    }

    /**
     * Configura el sistema de eventos
     */
    async handleConfig(client, interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const canal = interaction.options.getChannel('canal-anuncios');
        const autoInicio = interaction.options.getBoolean('auto-inicio');
        const notificaciones = interaction.options.getBoolean('notificaciones');
        const sistemaActivo = interaction.options.getBoolean('sistema-activo');

        const guildId = interaction.guild.id;

        const config = await GuildConfigLevel.findOneAndUpdate(
            { guildId },
            {},
            { upsert: true, new: true }
        );

        if (!config.eventSettings) {
            config.eventSettings = {
                enabled: true,
                announcementChannel: null,
                autoStartEvents: true,
                eventNotifications: true
            };
        }

        const cambios = [];

        if (sistemaActivo !== null) {
            config.eventSettings.enabled = sistemaActivo;
            cambios.push(`Sistema de eventos: **${sistemaActivo ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'}**`);
        }

        if (canal) {
            if (!canal.isTextBased()) {
                return interaction.editReply({
                    content: '❌ Debes seleccionar un canal de texto.'
                });
            }
            config.eventSettings.announcementChannel = canal.id;
            cambios.push(`Canal de anuncios: <#${canal.id}>`);
        }

        if (autoInicio !== null) {
            config.eventSettings.autoStartEvents = autoInicio;
            cambios.push(`Inicio automático: **${autoInicio ? '✅ ACTIVADO' : '❌ DESACTIVADO'}**`);
        }

        if (notificaciones !== null) {
            config.eventSettings.eventNotifications = notificaciones;
            cambios.push(`Notificaciones: **${notificaciones ? '✅ ACTIVADAS' : '❌ DESACTIVADAS'}**`);
        }

        await config.save();

        if (cambios.length === 0) {
            return interaction.editReply({
                content: '⚠️ No se realizaron cambios en la configuración.'
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('✅ Configuración Actualizada')
            .setDescription(cambios.join('\n'))
            .setFooter({ text: `Configurado por ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }

    // Métodos auxiliares
    getEventBenefits(event) {
        switch (event.type) {
            case 'xp_multiplier':
                return `⚡ Multiplicador de XP: **x${event.multiplier}**`;
            case 'coin_multiplier':
                return `💰 Multiplicador de Monedas: **x${event.multiplier}**`;
            case 'token_bonus':
                return `🪙 Bonus de Tokens: **+${event.bonus}**`;
            default:
                return 'Beneficios especiales';
        }
    }

    getTipoNombre(tipo) {
        const tipos = {
            'xp_multiplier': '⚡ Multiplicador de XP',
            'coin_multiplier': '💰 Multiplicador de Monedas',
            'token_bonus': '🪙 Bonus de Tokens'
        };
        return tipos[tipo] || tipo;
    }

    getCampoNombre(campo) {
        const campos = {
            'name': 'Nombre',
            'description': 'Descripción',
            'multiplier': 'Multiplicador/Bonus',
            'icon': 'Icono',
            'color': 'Color'
        };
        return campos[campo] || campo;
    }
}