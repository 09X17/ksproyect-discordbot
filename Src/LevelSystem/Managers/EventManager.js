import Event from '../Models/Event.js';
import { EmbedBuilder } from 'discord.js';

/**
 * Sistema de gestión de eventos del servidor
 * Maneja eventos automáticos, personalizados y sus recompensas
 */
export default class EventManager {
    // Constantes de tiempo
    static HOUR_IN_MS = 60 * 60 * 1000;
    static MINUTE_IN_MS = 60 * 1000;
    static DAY_IN_MS = 24 * 60 * 60 * 1000;

    // Intervalos de verificación
    static CHECK_SCHEDULED_INTERVAL = 1 * EventManager.HOUR_IN_MS;
    static CHECK_EXPIRED_INTERVAL = 5 * EventManager.MINUTE_IN_MS;
    static CLEAN_CACHE_INTERVAL = 30 * EventManager.MINUTE_IN_MS;

    constructor(client, levelManager) {
        this.client = client;
        this.levelManager = levelManager;
        this.activeEventsCache = new Map();
        this.eventHistory = [];
        this.defaultEvents = this.loadDefaultEvents();
        this.setupScheduledChecks();
        this.loadAllActiveEvents();
    }

    /**
     * Configura las verificaciones automáticas periódicas
     */
    setupScheduledChecks() {
        // Verificar eventos programados (cada hora)
        setInterval(() => {
            this.checkScheduledEvents();
        }, EventManager.CHECK_SCHEDULED_INTERVAL);

        // Verificar eventos expirados (cada 5 minutos)
        setInterval(() => {
            this.checkExpiredEvents();
        }, EventManager.CHECK_EXPIRED_INTERVAL);

        // Limpiar caché (cada 30 minutos)
        setInterval(() => {
            this.cleanCache();
        }, EventManager.CLEAN_CACHE_INTERVAL);
    }

    /**
     * Estos son eventos automáticos que se activan según condiciones
     */
    loadDefaultEvents() {
        return {
            // 🎮 Fin de semana - Viernes a Domingo
            gaming_weekend: {
                eventId: 'gaming_weekend',
                name: '🎮 Gaming Weekend',
                description: '¡Fin de semana épico! Gana más XP por cada actividad en el servidor',
                type: 'xp_multiplier',
                multiplier: 2.0,
                days: [5, 6, 0], // Viernes, Sábado, Domingo
                startHour: 0,
                endHour: 23,
                isDefault: true,
                icon: '🎮',
                color: '#FF6B6B'
            },

            // 🌙 Evento nocturno - Todos los días
            night_owl: {
                eventId: 'night_owl',
                name: '🌙 Noctámbulos',
                description: 'Bonus especial para los que están activos de noche',
                type: 'xp_multiplier',
                multiplier: 2.0,
                days: [0, 1, 2, 3, 4, 5, 6], // Todos los días
                startHour: 22, // 10 PM
                endHour: 6,    // 6 AM
                isDefault: true,
                icon: '🌙',
                color: '#4A90E2'
            },

            // 🔥 Rush Hour - Horas pico
            rush_hour: {
                eventId: 'rush_hour',
                name: '🔥 Hora Rush',
                description: 'Actividad máxima en el servidor - ¡Bonus de XP aumentado!',
                type: 'xp_multiplier',
                multiplier: 1.75,
                days: [1, 2, 3, 4], // Lunes a Jueves
                startHour: 18, // 6 PM
                endHour: 21,   // 9 PM
                isDefault: true,
                icon: '🔥',
                color: '#E74C3C'
            },

            // ⚡ Super Boost - Sábados
            super_boost: {
                eventId: 'super_boost',
                name: '⚡ Super Boost',
                description: '¡Sábado de poder! Triple XP en todas las actividades',
                type: 'xp_multiplier',
                multiplier: 3.0,
                days: [6], // Solo sábados
                startHour: 12,
                endHour: 20,
                isDefault: true,
                icon: '⚡',
                color: '#F39C12'
            },

            // 🎉 Celebración Mensual - Primer fin de semana del mes
            monthly_celebration: {
                eventId: 'monthly_celebration',
                name: '🎉 Celebración Mensual',
                description: 'Primer fin de semana del mes - ¡Recompensas especiales!',
                type: 'xp_multiplier',
                multiplier: 2.5,
                months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                days: [1, 2, 3, 4, 5, 6, 7], // Primeros 7 días del mes
                requireDayOfWeek: [6, 0], // Solo si cae en fin de semana
                isDefault: true,
                icon: '🎉',
                color: '#9B59B6'
            },

            // 🎯 Desafío Semanal - Miércoles
            weekly_challenge: {
                eventId: 'weekly_challenge',
                name: '🎯 Desafío del Miércoles',
                description: 'A mitad de semana - ¡Demuestra tu actividad!',
                type: 'xp_multiplier',
                multiplier: 2.0,
                days: [3], // Miércoles
                startHour: 0,
                endHour: 23,
                isDefault: true,
                icon: '🎯',
                color: '#1ABC9C'
            },

            // 🌟 Evento Especial - Festivos (Navidad, Año Nuevo)
            holiday_special: {
                eventId: 'holiday_special',
                name: '🌟 Festivo Especial',
                description: 'Celebraciones especiales - ¡Recompensas máximas!',
                type: 'xp_multiplier',
                multiplier: 4.0,
                months: [11, 0], // Diciembre y Enero
                days: [24, 25, 31, 1], // Navidad y Año Nuevo
                isDefault: true,
                icon: '🌟',
                color: '#FFD700'
            },

            // 🏆 Modo Competitivo - Domingos tarde
            competitive_mode: {
                eventId: 'competitive_mode',
                name: '🏆 Modo Competitivo',
                description: 'Domingo competitivo - ¡Sube en el ranking!',
                type: 'xp_multiplier',
                multiplier: 2.5,
                days: [0], // Domingo
                startHour: 15,
                endHour: 22,
                isDefault: true,
                icon: '🏆',
                color: '#E67E22'
            }
        };
    }

    /**
     * Carga todos los eventos activos desde la base de datos
     */
    async loadAllActiveEvents() {
        try {
            const now = new Date();
            const activeEvents = await Event.find({
                active: true,
                endDate: { $gt: now }
            });

            for (const event of activeEvents) {
                if (!this.activeEventsCache.has(event.guildId)) {
                    this.activeEventsCache.set(event.guildId, new Map());
                }

                const guildEvents = this.activeEventsCache.get(event.guildId);
                guildEvents.set(event.eventId, event.toObject());
            }

            this.client.logger.info(`✅ Cargados ${activeEvents.length} eventos activos`);
        } catch (error) {
            this.client.logger.error('❌ Error cargando eventos activos:', error);
        }
    }

    /**
     * Crea un evento personalizado
     * @param {string} guildId - ID del servidor
     * @param {Object} eventData - Datos del evento
     * @param {Object} creator - Usuario creador
     * @returns {Promise<Event>}
     */
    async createCustomEvent(guildId, eventData, creator) {
        try {
            // Validaciones
            if (!eventData.name || eventData.name.trim().length === 0) {
                throw new Error('El evento debe tener un nombre válido');
            }

            if (eventData.multiplier && (eventData.multiplier < 1 || eventData.multiplier > 10)) {
                throw new Error('El multiplicador debe estar entre 1 y 10');
            }

            const eventId = eventData.eventId || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const event = new Event({
                guildId,
                eventId,
                name: eventData.name,
                description: eventData.description || '',
                type: eventData.type || 'xp_multiplier',
                multiplier: eventData.multiplier || 1.5,
                bonus: eventData.bonus || 0,
                durationHours: eventData.durationHours || 24,
                image: eventData.image || null,
                icon: eventData.icon || '🎊',
                color: eventData.color || '#7289DA',
                schedule: eventData.schedule || {},
                createdBy: {
                    userId: creator.userId || creator.id,
                    username: creator.username || creator.tag
                },
                active: false,
                isDefault: false,
                custom: true
            });

            await event.save();

            if (!this.activeEventsCache.has(guildId)) {
                this.activeEventsCache.set(guildId, new Map());
            }
            this.activeEventsCache.get(guildId).set(eventId, event.toObject());

            this.client.logger.info(`✅ Evento personalizado creado: ${event.name} en ${guildId}`);
            return event;
        } catch (error) {
            this.client.logger.error('❌ Error creando evento personalizado:', error);
            throw error;
        }
    }

    /**
     * Inicia un evento en un servidor
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @param {number} durationHours - Duración en horas
     * @param {Object} customData - Datos adicionales
     * @returns {Promise<Event>}
     */
    async startEvent(guildId, eventId, durationHours = 24, customData = {}) {
        try {
            // Validaciones
            if (!guildId || !eventId) {
                throw new Error('guildId y eventId son requeridos');
            }

            if (durationHours <= 0 || durationHours > 168) { // Max 7 días
                throw new Error('La duración debe estar entre 1 y 168 horas');
            }

            const now = new Date();
            const endDate = new Date(now.getTime() + (durationHours * EventManager.HOUR_IN_MS));

            let event;

            // Verificar si es un evento predefinido
            if (this.defaultEvents[eventId]) {
                const defaultEvent = this.defaultEvents[eventId];

                event = await Event.findOneAndUpdate(
                    { guildId, eventId },
                    {
                        $set: {
                            name: defaultEvent.name,
                            description: defaultEvent.description,
                            type: defaultEvent.type,
                            multiplier: defaultEvent.multiplier || 1.0,
                            bonus: defaultEvent.bonus || 0,
                            icon: defaultEvent.icon || '🎊',
                            color: defaultEvent.color || '#7289DA',
                            durationHours,
                            active: true,
                            startDate: now,
                            endDate,
                            isDefault: true,
                            custom: false,
                            ...customData
                        },
                        $setOnInsert: {
                            guildId,
                            eventId,
                            createdAt: now
                        }
                    },
                    { upsert: true, new: true }
                );
            } else {
                // Buscar evento personalizado en BD
                event = await Event.findOne({ guildId, eventId });

                if (!event) {
                    throw new Error(`Evento ${eventId} no encontrado para este servidor`);
                }

                // Actualizar evento existente
                event.active = true;
                event.startDate = now;
                event.endDate = endDate;
                event.durationHours = durationHours;
                await event.save();
            }

            // Actualizar cache
            if (!this.activeEventsCache.has(guildId)) {
                this.activeEventsCache.set(guildId, new Map());
            }
            this.activeEventsCache.get(guildId).set(eventId, event.toObject());

            // Registrar en historial
            this.addToHistory({
                guildId,
                eventId,
                name: event.name,
                startDate: now,
                endDate,
                durationHours,
                type: event.type
            });

            await this.announceEventToGuild(guildId, event);
            this.client.logger.info(`✅ Evento iniciado: ${event.name} en ${guildId} por ${durationHours}h`);
            
            return event;
        } catch (error) {
            this.client.logger.error('❌ Error iniciando evento:', error);
            throw error;
        }
    }

    /**
     * Detiene un evento activo
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @returns {Promise<Event>}
     */
    async stopEvent(guildId, eventId) {
        try {
            const event = await Event.findOne({ guildId, eventId });
            
            if (!event) {
                throw new Error(`Evento ${eventId} no encontrado`);
            }

            if (!event.active) {
                throw new Error(`El evento "${event.name}" no está activo`);
            }

            event.active = false;
            event.endDate = new Date();
            await event.save();

            // Remover del cache
            if (this.activeEventsCache.has(guildId)) {
                this.activeEventsCache.get(guildId).delete(eventId);
            }

            this.client.logger.info(`✅ Evento detenido: ${event.name} en ${guildId}`);
            return event;
        } catch (error) {
            this.client.logger.error('❌ Error deteniendo evento:', error);
            throw error;
        }
    }

    /**
     * Verifica y desactiva eventos expirados
     */
    async checkExpiredEvents() {
        try {
            const now = new Date();
            const expiredEvents = await Event.find({
                active: true,
                endDate: { $lt: now }
            });

            for (const event of expiredEvents) {
                event.active = false;
                await event.save();

                // Remover del cache
                if (this.activeEventsCache.has(event.guildId)) {
                    this.activeEventsCache.get(event.guildId).delete(event.eventId);
                }

                this.client.logger.info(`⏰ Evento expirado: ${event.name} en ${event.guildId}`);
            }

            if (expiredEvents.length > 0) {
                this.client.logger.info(`⏰ ${expiredEvents.length} evento(s) expirado(s) desactivado(s)`);
            }
        } catch (error) {
            this.client.logger.error('❌ Error verificando eventos expirados:', error);
        }
    }

    /**
     * Verifica y activa eventos programados automáticamente
     */
    async checkScheduledEvents() {
        try {
            const now = new Date();
            const dayOfWeek = now.getDay(); // 0=Domingo, 6=Sábado
            const hour = now.getHours();
            const month = now.getMonth(); // 0=Enero, 11=Diciembre
            const date = now.getDate();

            const guilds = this.client.guilds.cache;

            for (const [guildId, guild] of guilds) {
                try {
                    const config = await this.levelManager.getGuildConfig(guildId);
                    if (!config?.eventSettings?.autoStartEvents) continue;

                    // Verificar cada evento predefinido
                    for (const [eventId, eventData] of Object.entries(this.defaultEvents)) {
                        // Saltar si ya está activo
                        const isActive = await this.isEventActive(guildId, eventId);
                        if (isActive) continue;

                        let shouldStart = false;
                        let durationHours = eventData.durationHours || 24;

                        // Verificar condiciones de activación
                        if (eventData.days && !eventData.days.includes(dayOfWeek)) {
                            continue;
                        }

                        if (eventData.months && !eventData.months.includes(month)) {
                            continue;
                        }

                        if (eventData.days && Array.isArray(eventData.days)) {
                            // Para eventos con días específicos del mes
                            if (eventData.requireDayOfWeek) {
                                // Debe cumplir día del mes Y día de la semana
                                if (eventData.days.includes(date) && eventData.requireDayOfWeek.includes(dayOfWeek)) {
                                    shouldStart = true;
                                }
                            } else if (eventData.days.length <= 7 && eventData.days.every(d => d <= 6)) {
                                // Es un array de días de la semana (0-6)
                                if (eventData.days.includes(dayOfWeek)) {
                                    shouldStart = true;
                                }
                            } else if (eventData.days.includes(date)) {
                                // Es un array de días del mes (1-31)
                                shouldStart = true;
                            }
                        }

                        // Verificar horario
                        if (shouldStart && eventData.startHour !== undefined && eventData.endHour !== undefined) {
                            if (hour >= eventData.startHour && hour < eventData.endHour) {
                                // Calcular duración basada en las horas restantes
                                durationHours = eventData.endHour - hour;
                                if (durationHours <= 0) durationHours = 24;
                            } else {
                                shouldStart = false;
                            }
                        }

                        if (shouldStart) {
                            await this.startEvent(guildId, eventId, durationHours);
                            this.client.logger.info(`🎉 Evento automático iniciado: ${eventData.name} en ${guild.name}`);
                        }
                    }
                } catch (guildError) {
                    this.client.logger.error(`❌ Error verificando eventos en ${guildId}:`, guildError.message);
                }
            }
        } catch (error) {
            this.client.logger.error('❌ Error verificando eventos programados:', error);
        }
    }

    /**
     * Anuncia un evento en el canal configurado del servidor
     * @param {string} guildId - ID del servidor
     * @param {Event} event - Evento a anunciar
     */
    async announceEventToGuild(guildId, event) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;

            const config = await this.levelManager.getGuildConfig(guildId);
            if (!config?.enabled) return;

            const announcementChannel = config.eventSettings?.announcementChannel ||
                config.notifications?.levelUpChannel;

            if (!announcementChannel) return;

            const channel = guild.channels.cache.get(announcementChannel);
            if (!channel?.isTextBased()) return;

            const eventColor = event.color || '#7289DA';
            const eventIcon = event.icon || '🎊';

            const embed = new EmbedBuilder()
                .setColor(eventColor)
                .setTitle(`\`${event.name.toUpperCase()}\``)
                .setDescription(
                    `<a:lupa:1469424262250106992> **¡Nuevo Evento Activo!**\n\n` +
                    `<:flechaizq:1469346308455272640> \`${event.description}\`\n` +
                    `\`¡Aprovecha mientras dure! Participa en el servidor para maximizar tus recompensas.\``
                )
                .addFields(
                    {
                        name: '`BENEFICIOS`',
                        value: this.getEventBenefitsDescription(event),
                        inline: false
                    },
                    {
                        name: '`DURACIÓN`',
                        value: `**${event.durationHours} hora(s)**`,
                        inline: true
                    },
                    {
                        name: '`FINALIZA`',
                        value: `<t:${Math.floor(event.endDate.getTime() / 1000)}:R>`,
                        inline: true
                    }
                )

            if (event.image) {
                embed.setThumbnail(event.image);
            }

            await channel.send({
                embeds: [embed]
            });

        } catch (error) {
            this.client.logger.error(`❌ Error anunciando evento en ${guildId}:`, error);
        }
    }

    /**
     * Obtiene la descripción de beneficios de un evento
     * @param {Event} event - Evento
     * @returns {string}
     */
    getEventBenefitsDescription(event) {
        switch (event.type) {
            case 'xp_multiplier':
                return `> <:xp:1453078768687255845> XP por mensajes: **x${event.multiplier}**\n` +
                       `> <:xp:1453078768687255845> XP por tiempo en voz: **x${event.multiplier}**\n` +
                       `> <:xp:1453078768687255845> XP por actividades: **x${event.multiplier}**`;
            
            case 'coin_multiplier':
                return `> <:dinero:1451695904351457330> Monedas por nivel: **x${event.multiplier}**\n` +
                       `> <:rango:1451695620162326548> Recompensa diaria: **x${event.multiplier}**\n` +
                       `> <:boost:1451696112019836988> Bonos especiales: **x${event.multiplier}**`;
            
            case 'token_bonus':
                return `> <:tokens:1451695903080579192> Tokens extra diarios: **+${event.bonus}**\n` +
                       `> <:level:1451695230385389669> Tokens por nivel: **+${event.bonus}**\n` +
                       `> <:boost:1451696112019836988> Actividades premium: **+${event.bonus}**`;
            
            default:
                return `> 🎁 Múltiples recompensas especiales\n` +
                       `> ⚡ Beneficios exclusivos del evento\n` +
                       `> 🌟 ¡Participa para descubrirlos!`;
        }
    }

    /**
     * Obtiene el multiplicador activo para un tipo de recompensa
     * @param {string} guildId - ID del servidor
     * @param {string} rewardType - Tipo de recompensa (xp, coins, tokens)
     * @returns {Object} { multiplier, bonus }
     */
    getActiveEventMultiplier(guildId, rewardType = 'xp') {
        let multiplier = 1.0;
        let bonus = 0;

        const guildEvents = this.activeEventsCache.get(guildId);
        if (!guildEvents) return { multiplier, bonus };

        const now = new Date();

        for (const event of guildEvents.values()) {
            if (!event.active) continue;
            if (event.endDate && new Date(event.endDate) < now) continue;

            // XP Multiplier
            if (event.type === 'xp_multiplier' && rewardType === 'xp') {
                multiplier *= (event.multiplier || 1.0);
            }

            // Coin Multiplier
            if (event.type === 'coin_multiplier' && rewardType === 'coins') {
                multiplier *= (event.multiplier || 1.0);
            }

            // Token Bonus
            if (event.type === 'token_bonus' && rewardType === 'tokens') {
                bonus += (event.bonus || 0);
            }
        }

        return { multiplier, bonus };
    }

    /**
     * Aplica recompensas de eventos a una cantidad base
     * @param {string} userId - ID del usuario
     * @param {string} guildId - ID del servidor
     * @param {number} amount - Cantidad base
     * @param {string} type - Tipo de recompensa
     * @param {string} source - Fuente de la recompensa
     * @returns {Promise<Object>}
     */
    async applyEventRewards(userId, guildId, amount, type, source) {
        try {
            const { multiplier, bonus } = this.getActiveEventMultiplier(guildId, type);

            if (multiplier === 1.0 && bonus === 0) {
                return {
                    amount,
                    bonus: 0,
                    multiplier: 1.0,
                    originalAmount: amount,
                    fromEvent: false
                };
            }

            const multiplied = Math.floor(amount * multiplier);
            const finalAmount = multiplied + bonus;
            const bonusAmount = finalAmount - amount;

            // Registrar estadísticas si hay bonus
            if (bonusAmount > 0) {
                await this.recordEventStats(guildId, type, bonusAmount);
            }

            return {
                amount: finalAmount,
                bonus: bonusAmount,
                multiplier,
                originalAmount: amount,
                fromEvent: true
            };

        } catch (error) {
            this.client.logger.error('❌ Error aplicando recompensas de evento:', error);
            return {
                amount,
                bonus: 0,
                multiplier: 1.0,
                originalAmount: amount,
                fromEvent: false
            };
        }
    }

    /**
     * Registra estadísticas de uso de eventos
     * @param {string} guildId - ID del servidor
     * @param {string} type - Tipo de recompensa
     * @param {number} amount - Cantidad de bonus otorgado
     */
    async recordEventStats(guildId, type, amount) {
        try {
            const guildEvents = this.activeEventsCache.get(guildId);
            if (!guildEvents) return;

            const now = new Date();

            for (const [eventId, event] of guildEvents.entries()) {
                if (!event.active) continue;
                if (event.endDate && new Date(event.endDate) < now) continue;

                // Verificar si este evento afecta este tipo de recompensa
                const affectsType = (
                    (type === 'xp' && event.type === 'xp_multiplier') ||
                    (type === 'coins' && event.type === 'coin_multiplier') ||
                    (type === 'tokens' && event.type === 'token_bonus')
                );

                if (affectsType) {
                    const dbEvent = await Event.findOne({ guildId, eventId });
                    if (dbEvent) {
                        if (!dbEvent.stats) {
                            dbEvent.stats = { totalBonusGiven: {}, usersAffected: 0 };
                        }
                        if (!dbEvent.stats.totalBonusGiven) {
                            dbEvent.stats.totalBonusGiven = {};
                        }
                        if (!dbEvent.stats.totalBonusGiven[type]) {
                            dbEvent.stats.totalBonusGiven[type] = 0;
                        }

                        dbEvent.stats.totalBonusGiven[type] += amount;
                        dbEvent.stats.usersAffected = (dbEvent.stats.usersAffected || 0) + 1;
                        
                        await dbEvent.save();
                    }
                }
            }
        } catch (error) {
            this.client.logger.error('❌ Error registrando estadísticas de evento:', error);
        }
    }

    /**
     * Verifica si un evento está activo
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @returns {Promise<boolean>}
     */
    async isEventActive(guildId, eventId) {
        const guildEvents = this.activeEventsCache.get(guildId);
        if (!guildEvents) return false;

        const event = guildEvents.get(eventId);
        if (!event || !event.active) return false;

        // Verificar si ha expirado
        if (event.endDate && new Date(event.endDate) < new Date()) {
            event.active = false;
            await Event.updateOne(
                { guildId, eventId },
                { $set: { active: false } }
            );
            guildEvents.delete(eventId);
            return false;
        }

        return true;
    }

    /**
     * Obtiene todos los eventos activos
     * @param {string|null} guildId - ID del servidor (null para todos)
     * @returns {Promise<Array>}
     */
    async getActiveEvents(guildId = null) {
        const activeEvents = [];
        const now = new Date();

        if (guildId) {
            // Eventos de un servidor específico
            const guildEvents = this.activeEventsCache.get(guildId);
            if (!guildEvents) return [];

            for (const [eventId, event] of guildEvents.entries()) {
                if (!event.active) continue;
                if (event.endDate && new Date(event.endDate) < now) continue;

                activeEvents.push({
                    id: eventId,
                    name: event.name,
                    description: event.description,
                    type: event.type,
                    multiplier: event.multiplier,
                    bonus: event.bonus,
                    icon: event.icon,
                    color: event.color,
                    startDate: event.startDate,
                    endDate: event.endDate,
                    durationHours: event.durationHours,
                    timeRemaining: event.endDate
                        ? Math.max(0, Math.floor((new Date(event.endDate) - now) / EventManager.HOUR_IN_MS))
                        : null
                });
            }

            return activeEvents;
        }

        // Todos los eventos de todos los servidores
        for (const [currentGuildId, guildEvents] of this.activeEventsCache.entries()) {
            for (const [eventId, event] of guildEvents.entries()) {
                if (!event.active) continue;
                if (event.endDate && new Date(event.endDate) < now) continue;

                activeEvents.push({
                    guildId: currentGuildId,
                    id: eventId,
                    name: event.name,
                    type: event.type,
                    multiplier: event.multiplier,
                    bonus: event.bonus,
                    endDate: event.endDate
                });
            }
        }

        return activeEvents;
    }

    /**
     * Obtiene todos los eventos de un servidor
     * @param {string} guildId - ID del servidor
     * @param {boolean} includeInactive - Incluir eventos inactivos
     * @returns {Promise<Array>}
     */
    async getGuildEvents(guildId, includeInactive = false) {
        try {
            const query = { guildId };
            
            if (!includeInactive) {
                query.active = true;
                query.endDate = { $gt: new Date() };
            }

            const events = await Event.find(query).sort({ createdAt: -1 });

            // Actualizar cache
            if (!this.activeEventsCache.has(guildId)) {
                this.activeEventsCache.set(guildId, new Map());
            }

            const guildCache = this.activeEventsCache.get(guildId);
            for (const event of events) {
                if (event.active) {
                    guildCache.set(event.eventId, event.toObject());
                }
            }

            return events;
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo eventos del servidor:', error);
            return [];
        }
    }

    /**
     * Elimina un evento
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @returns {Promise<boolean>}
     */
    async deleteEvent(guildId, eventId) {
        try {
            const result = await Event.findOneAndDelete({ guildId, eventId });

            if (result) {
                // Limpiar cache
                if (this.activeEventsCache.has(guildId)) {
                    this.activeEventsCache.get(guildId).delete(eventId);
                }

                // Limpiar historial
                this.eventHistory = this.eventHistory.filter(
                    e => !(e.guildId === guildId && e.eventId === eventId)
                );

                this.client.logger.info(`✅ Evento eliminado: ${result.name} en ${guildId}`);
                return true;
            }
            
            return false;
        } catch (error) {
            this.client.logger.error('❌ Error eliminando evento:', error);
            throw error;
        }
    }

    /**
     * Actualiza un evento
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @param {Object} updates - Datos a actualizar
     * @returns {Promise<Event>}
     */
    async updateEvent(guildId, eventId, updates) {
        try {
            const event = await Event.findOne({ guildId, eventId });
            
            if (!event) {
                throw new Error(`Evento ${eventId} no encontrado`);
            }

            // No permitir modificar eventos activos en ciertos campos críticos
            if (event.active && ['multiplier', 'bonus', 'type'].some(field => field in updates)) {
                throw new Error('No se pueden modificar eventos activos. Detén el evento primero.');
            }

            // Aplicar actualizaciones
            Object.assign(event, updates);
            event.updatedAt = new Date();
            await event.save();

            // Actualizar cache
            if (this.activeEventsCache.has(guildId)) {
                this.activeEventsCache.get(guildId).set(eventId, event.toObject());
            }

            this.client.logger.info(`✅ Evento actualizado: ${event.name} en ${guildId}`);
            return event;
        } catch (error) {
            this.client.logger.error('❌ Error actualizando evento:', error);
            throw error;
        }
    }

    /**
     * Obtiene estadísticas de un evento
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @returns {Promise<Object|null>}
     */
    async getEventStats(guildId, eventId) {
        try {
            const event = await Event.findOne({ guildId, eventId });
            if (!event) return null;

            return {
                name: event.name,
                type: event.type,
                active: event.active,
                startDate: event.startDate,
                endDate: event.endDate,
                stats: event.stats || {},
                totalDuration: event.durationHours || 0,
                createdBy: event.createdBy,
                createdAt: event.createdAt
            };
        } catch (error) {
            this.client.logger.error('❌ Error obteniendo estadísticas:', error);
            return null;
        }
    }

    /**
     * Limpia el cache de eventos expirados
     */
    async cleanCache() {
        const now = new Date();
        let cleaned = 0;

        for (const [guildId, guildEvents] of this.activeEventsCache.entries()) {
            for (const [eventId, event] of guildEvents.entries()) {
                if (event.endDate && new Date(event.endDate) < now) {
                    guildEvents.delete(eventId);
                    cleaned++;
                }
            }

            // Si no quedan eventos, eliminar el servidor del cache
            if (guildEvents.size === 0) {
                this.activeEventsCache.delete(guildId);
            }
        }

        if (cleaned > 0) {
            this.client.logger.info(`🧹 Cache limpiado: ${cleaned} evento(s) expirado(s) removido(s)`);
        }
    }

    /**
     * Formatea la duración de un evento
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {string}
     */
    formatDuration(startDate, endDate) {
        if (!startDate || !endDate) return 'Desconocido';

        const durationMs = endDate - startDate;
        const hours = Math.floor(durationMs / EventManager.HOUR_IN_MS);
        const minutes = Math.floor((durationMs % EventManager.HOUR_IN_MS) / EventManager.MINUTE_IN_MS);

        if (hours > 0) {
            return `${hours} hora${hours > 1 ? 's' : ''}${minutes > 0 ? ` y ${minutes} minuto${minutes > 1 ? 's' : ''}` : ''}`;
        }
        return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    }

    /**
     * Obtiene la lista de eventos predefinidos
     * @returns {Array}
     */
    getDefaultEvents() {
        return Object.values(this.defaultEvents).map(event => ({
            id: event.eventId,
            name: event.name,
            description: event.description,
            type: event.type,
            multiplier: event.multiplier,
            bonus: event.bonus,
            icon: event.icon,
            color: event.color,
            isDefault: true
        }));
    }

    /**
     * Obtiene el historial de eventos
     * @param {string|null} guildId - ID del servidor (null para todos)
     * @param {number} limit - Límite de resultados
     * @returns {Array}
     */
    getEventHistory(guildId = null, limit = 20) {
        let history;

        if (guildId) {
            history = this.eventHistory
                .filter(e => e.guildId === guildId)
                .slice(-limit);
        } else {
            history = this.eventHistory.slice(-limit);
        }

        return history.reverse();
    }

    /**
     * Añade un evento al historial
     * @param {Object} eventData - Datos del evento
     */
    addToHistory(eventData) {
        this.eventHistory.push(eventData);

        // Mantener solo los últimos 1000 eventos
        if (this.eventHistory.length > 1000) {
            this.eventHistory = this.eventHistory.slice(-1000);
        }
    }

    /**
     * Fuerza el inicio de un evento (detiene si está activo primero)
     * @param {string} guildId - ID del servidor
     * @param {string} eventId - ID del evento
     * @param {number} durationHours - Duración en horas
     * @returns {Promise<Event>}
     */
    async forceEventStart(guildId, eventId, durationHours = 24) {
        // Intentar detener si está activo
        await this.stopEvent(guildId, eventId).catch(() => {});
        
        // Iniciar el evento
        return await this.startEvent(guildId, eventId, durationHours);
    }

    /**
     * Obtiene el estado completo de eventos de un servidor
     * @param {string} guildId - ID del servidor
     * @returns {Promise<Object>}
     */
    async getEventStatusForGuild(guildId) {
        const activeEvents = await this.getActiveEvents(guildId);
        const config = await this.levelManager.getGuildConfig(guildId);

        const eventSettings = config?.eventSettings || {
            enabled: true,
            announcementChannel: null,
            autoStartEvents: true,
            eventNotifications: true
        };

        return {
            enabled: eventSettings.enabled,
            activeEvents: activeEvents,
            multipliers: {
                xp: this.getActiveEventMultiplier(guildId, 'xp'),
                coins: this.getActiveEventMultiplier(guildId, 'coins'),
                tokens: this.getActiveEventMultiplier(guildId, 'tokens')
            },
            settings: eventSettings,
            hasActiveEvents: activeEvents.length > 0,
            defaultEvents: this.getDefaultEvents()
        };
    }
}