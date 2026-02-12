import {
    SlashCommandBuilder,
    EmbedBuilder
} from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';
import UserLevel from '../../../LevelSystem/Models/UserLevel.js';
import ShopItem from '../../../LevelSystem/Models/ShopItem.js';

export default class BoostsSlash extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('boosts')
                .setDescription('🔄 Muestra tus boosts activos y su estado')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('ver')
                        .setDescription('📊 Ver tus boosts activos y tiempo restante')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('tienda')
                        .setDescription('🛒 Ver boosts disponibles en la tienda')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('estado')
                        .setDescription('⚙️ Verificar estado del sistema de boosts')
                        .addUserOption(option =>
                            option
                                .setName('usuario')
                                .setDescription('Usuario a verificar (solo admin)')
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('ℹ️ Información sobre el sistema de boosts')
                ),
            cooldown: 5,
            category: 'levels'
        });
    }

    async execute(client, interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'ver':
                    await this.mostrarBoosts(interaction);
                    break;

                case 'tienda':
                    await this.mostrarTiendaBoosts(interaction);
                    break;

                case 'estado':
                    await this.verificarEstado(interaction);
                    break;

                case 'info':
                    await this.mostrarInfo(interaction);
                    break;
            }

        } catch (error) {
            console.error('Error en comando boosts:', error);
            await interaction.editReply({
                content: `❌ Error: ${error.message}`
            });
        }
    }

    async mostrarBoosts(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        let userLevel = await UserLevel.findOne({ guildId, userId });

        if (!userLevel) {
            userLevel = new UserLevel({
                userId,
                guildId,
                coins: 0,
                tokens: 0,
                xp: 0,
                level: 1
            });
            await userLevel.save();
        }

        const now = new Date();

        const boostsActivos = userLevel.activeItems.filter(item =>
            (item.itemType === 'boost_user' || item.itemType === 'boost_server') &&
            item.active === true &&
            (!item.expiresAt || new Date(item.expiresAt) > now)
        );

        const boostTradicionalActivo = userLevel.boostMultiplier > 1 &&
            userLevel.boostExpires > now;

        if (boostsActivos.length === 0 && !boostTradicionalActivo) {
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('⚡ Boosts Activos')
                .setDescription(`**${interaction.user.username}** - No tienes boosts activos`)
                .addFields(
                    {
                        name: '📊 Estadísticas',
                        value: [
                            `**Multiplicador actual:** x${userLevel.boostMultiplier.toFixed(1)}`,
                            `**Boosts en inventario:** ${userLevel.activeItems.filter(item => item.active).length}`,
                            `**XP base:** ${userLevel.xp.toLocaleString()}`,
                            `**Nivel:** ${userLevel.level}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🛒 Comprar Boosts',
                        value: 'Usa `/boosts tienda` para ver boosts disponibles',
                        inline: false
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: `Solicitado por ${interaction.user.username}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        let multiplicadorEfectivo = userLevel.boostMultiplier || 1.0;
        let boostsDetallados = [];

        if (boostsActivos.length > 0) {
            for (const boost of boostsActivos) {
                const tiempoRestante = boost.expiresAt ?
                    this.calcularTiempoRestante(new Date(boost.expiresAt), now) :
                    'Permanente';

                let itemInfo = null;
                try {
                    itemInfo = await ShopItem.findById(boost.itemId);
                } catch (error) {
                    console.error('Error obteniendo info del item:', error);
                }

                boostsDetallados.push({
                    nombre: itemInfo?.name || boost.itemName || 'Boost desconocido',
                    tipo: boost.itemType === 'boost_user' ? 'Personal' : 'Servidor',
                    multiplicador: boost.multiplier || 1.5,
                    comprado: new Date(boost.purchasedAt).toLocaleDateString('es-ES'),
                    expira: boost.expiresAt ? new Date(boost.expiresAt).toLocaleDateString('es-ES') : 'Nunca',
                    tiempoRestante,
                    activo: boost.active,
                    itemId: boost.itemId
                });
            }

            const mejorBoost = boostsDetallados.reduce((mejor, actual) =>
                actual.multiplicador > mejor.multiplicador ? actual : mejor
                , { multiplicador: 0 });

            multiplicadorEfectivo = Math.max(multiplicadorEfectivo, mejorBoost.multiplicador);
        }

        if (boostTradicionalActivo) {
            const tiempoRestanteTradicional = this.calcularTiempoRestante(userLevel.boostExpires, now);

            boostsDetallados.push({
                nombre: 'Boost tradicional',
                tipo: 'Personal',
                multiplicador: userLevel.boostMultiplier,
                comprado: 'Sistema',
                expira: userLevel.boostExpires.toLocaleDateString('es-ES'),
                tiempoRestante: tiempoRestanteTradicional,
                activo: true,
                itemId: null
            });

            multiplicadorEfectivo = Math.max(multiplicadorEfectivo, userLevel.boostMultiplier);
        }
        const embed = new EmbedBuilder()
            .setColor('#FFA28F')
            .setTitle(`**\`\`\`BOOST ACTIVOS DE ${interaction.user.username}\`\`\`**`)
            .setDescription(`<:cajadeentrega:1453099645063532555> __**Multiplicador efectivo:**__ \`x${multiplicadorEfectivo.toFixed(2)}\``)
            .setFooter({ text: `Total boosts activos: ${boostsDetallados.length}` })

        boostsDetallados.forEach((boost, index) => {
            const estado = boost.activo ? '<:verificado:1453073955467563008>' : '<:rechazado:1453073959842091008>';
            const tipoEmoji = boost.tipo === '`PERSONAL`' ? '<:g_:1455681954908213373>' : '<:p_:1455681953385680907>';

            embed.addFields({
                name: `${estado} **|** ${tipoEmoji} \`${boost.nombre.toUpperCase()}\``,
                value: [
                    `<:flechaderecha:1455684486938362010> **Multiplicador:** \`x${boost.multiplicador}\``,
                    `<:flechaderecha:1455684486938362010> **Tipo:** \`${boost.tipo}\``,
                    `<:flechaderecha:1455684486938362010> **Comprado:** \`${boost.comprado}\``,
                    `<:flechaderecha:1455684486938362010> **Expira:** \`${boost.expira}\``,
                    `<:flechaderecha:1455684486938362010> **Tiempo restante:** \`${boost.tiempoRestante}\``
                ].filter(Boolean).join('\n'),
                inline: true
            });
        });

        // Añadir estadísticas
        embed.addFields({
            name: '<:categorias:1453081710357905551> __**BENEFICIOS DEL BOOST**__',
            value: [
                `<:flechaderecha:1455684486938362010> **XP multiplicado por:** \`x${multiplicadorEfectivo.toFixed(2)}\``,
                `<:flechaderecha:1455684486938362010> **Ejemplo:** \`100 XP → ${Math.floor(100 * multiplicadorEfectivo)} XP\``,
                `<:flechaderecha:1455684486938362010> **Afecta a:** \`MSG | VOZ\``,
                `<:flechaderecha:1455684486938362010> **Boost más potente:** \`x${Math.max(...boostsDetallados.map(b => b.multiplicador)).toFixed(2)}\``
            ].join('\n'),
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    }

    // ============= MÉTODO VER TIENDA DE BOOSTS =============

    async mostrarTiendaBoosts(interaction) {
        const guildId = interaction.guild.id;

        // Obtener boosts disponibles en la tienda
        const boosts = await ShopItem.find({
            guildId,
            active: true,
            type: { $in: ['boost_user', 'boost_server'] }
        }).sort({ price: 1 });

        if (boosts.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#95A5A6')
                .setTitle('🛒 Tienda de Boosts')
                .setDescription('No hay boosts disponibles en la tienda')
                .addFields(
                    {
                        name: '📝 Administrar tienda',
                        value: 'Usa `/admin-tienda crear` para añadir boosts',
                        inline: false
                    }
                );

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Obtener datos del usuario para mostrar balance
        const userId = interaction.user.id;
        let userLevel = await UserLevel.findOne({ guildId, userId });

        if (!userLevel) {
            userLevel = new UserLevel({
                userId,
                guildId,
                coins: 0,
                tokens: 0,
                xp: 0,
                level: 1
            });
        }

        // Crear embed
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🛒 Boosts Disponibles')
            .setDescription(`**${interaction.guild.name}**\nCompra boosts para multiplicar tu XP`)
            .addFields(
                {
                    name: '💰 Tu Balance',
                    value: [
                        `<:dinero:1451695904351457330> **Monedas:** ${userLevel.coins.toLocaleString()}`,
                        `<:tokens:1451695903080579192> **Tokens:** ${userLevel.tokens}`,
                        `<:xp:1453078768687255845> **XP:** ${userLevel.xp.toLocaleString()}`,
                        `📊 **Nivel:** ${userLevel.level}`
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Usa /tienda para comprar' })
            .setTimestamp();

        // Añadir cada boost
        boosts.forEach(boost => {
            const tipo = boost.type === 'boost_user' ? 'Personal ⚡' : 'Servidor 🌟';
            const multiplicador = boost.data?.multiplier || 1.5;
            const duracion = boost.data?.duration ? `${boost.data.duration / 3600} horas` : '24 horas';
            const stackable = boost.data?.stackable ? '✅ Sí' : '❌ No';
            const stock = boost.stock === -1 ? '∞' : boost.stock;

            embed.addFields({
                name: `${this.getIconoMoneda(boost.currency)} ${boost.name}`,
                value: [
                    `**Tipo:** ${tipo}`,
                    `**Multiplicador:** x${multiplicador}`,
                    `**Duración:** ${duracion}`,
                    `**Stackable:** ${stackable}`,
                    `**Precio:** ${this.formatearPrecio(boost.price, boost.currency)}`,
                    `**Stock:** ${stock}`,
                    boost.description ? `\n${boost.description}` : ''
                ].join('\n'),
                inline: true
            });
        });

        // Añadir información sobre cómo funcionan
        embed.addFields({
            name: '⚙️ ¿Cómo funcionan los boosts?',
            value: [
                '• **Boosts personales:** Solo te afectan a ti',
                '• **Boosts del servidor:** Afectan a todos los miembros',
                '• **Stackable:** Se pueden combinar con otros boosts',
                '• **No stackable:** Usa solo el boost con mayor multiplicador',
                '• **Duración:** El tiempo que estará activo el boost'
            ].join('\n'),
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    }

    // ============= MÉTODO VERIFICAR ESTADO =============

    async verificarEstado(interaction) {
        const usuario = interaction.options.getUser('usuario');

        // Verificar permisos si se especifica otro usuario
        if (usuario && usuario.id !== interaction.user.id) {
            const member = interaction.guild.members.cache.get(interaction.user.id);
            if (!member.permissions.has('ManageGuild')) {
                throw new Error('Solo los administradores pueden ver el estado de otros usuarios');
            }
        }

        const targetUserId = usuario?.id || interaction.user.id;
        const guildId = interaction.guild.id;

        // Obtener usuario
        let userLevel = await UserLevel.findOne({ guildId, userId: targetUserId });

        if (!userLevel) {
            userLevel = new UserLevel({
                userId: targetUserId,
                guildId,
                coins: 0,
                tokens: 0,
                xp: 0,
                level: 1
            });
            await userLevel.save();
        }

        const now = new Date();

        // Verificar boosts activos
        const boostsActivos = userLevel.activeItems.filter(item =>
            (item.itemType === 'boost_user' || item.itemType === 'boost_server') &&
            item.active === true
        );

        const boostsExpirados = userLevel.activeItems.filter(item =>
            (item.itemType === 'boost_user' || item.itemType === 'boost_server') &&
            item.active === true &&
            item.expiresAt && new Date(item.expiresAt) <= now
        );

        const boostTradicionalActivo = userLevel.boostMultiplier > 1 &&
            userLevel.boostExpires > now;

        // Calcular multiplicador efectivo
        let multiplicadorEfectivo = 1.0;
        let boostActivoEncontrado = false;

        if (boostTradicionalActivo) {
            multiplicadorEfectivo = Math.max(multiplicadorEfectivo, userLevel.boostMultiplier);
            boostActivoEncontrado = true;
        }

        if (boostsActivos.length > 0) {
            const mejorBoost = boostsActivos.reduce((mejor, actual) => {
                const multActual = actual.multiplier || 1.5;
                const multMejor = mejor.multiplier || 1.5;
                return multActual > multMejor ? actual : mejor;
            }, { multiplier: 0 });

            multiplicadorEfectivo = Math.max(multiplicadorEfectivo, mejorBoost.multiplier || 1.5);
            boostActivoEncontrado = true;
        }

        // Crear embed de diagnóstico
        const embed = new EmbedBuilder()
            .setColor(boostActivoEncontrado ? '#2ECC71' : '#E74C3C')
            .setTitle('⚙️ Diagnóstico del Sistema de Boosts')
            .setDescription(`**Usuario:** ${usuario ? usuario.username : interaction.user.username}`)
            .setThumbnail((usuario || interaction.user).displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Solicitado por ${interaction.user.username}` })
            .setTimestamp();

        // Estado general
        embed.addFields({
            name: '📊 Estado General',
            value: [
                `**Multiplicador efectivo:** x${multiplicadorEfectivo.toFixed(2)}`,
                `**Boost tradicional:** ${boostTradicionalActivo ? '✅ Activo' : '❌ Inactivo'}`,
                `**Boosts activos:** ${boostsActivos.length}`,
                `**Boosts expirados:** ${boostsExpirados.length}`,
                `**XP base:** ${userLevel.xp.toLocaleString()}`,
                `**Nivel:** ${userLevel.level}`
            ].join('\n'),
            inline: false
        });

        // Detalles de boosts activos
        if (boostsActivos.length > 0) {
            let detallesText = '';

            boostsActivos.slice(0, 5).forEach((boost, index) => {
                const tiempoRestante = boost.expiresAt ?
                    this.calcularTiempoRestante(new Date(boost.expiresAt), now) :
                    'Permanente';

                detallesText += `${index + 1}. **${boost.itemName || 'Boost'}**\n`;
                detallesText += `   x${boost.multiplier || 1.5} | ${tiempoRestante}\n`;

                if (boost.expiresAt && new Date(boost.expiresAt) <= now) {
                    detallesText += `   ⚠️ **EXPIRO**\n`;
                }

                detallesText += '\n';
            });

            if (boostsActivos.length > 5) {
                detallesText += `... y ${boostsActivos.length - 5} más`;
            }

            embed.addFields({
                name: '⚡ Boosts Activos',
                value: detallesText || 'No hay detalles',
                inline: false
            });
        }

        // Problemas detectados
        const problemas = [];

        if (boostsExpirados.length > 0) {
            problemas.push(`⚠️ **${boostsExpirados.length} boosts expirados** (se limpiarán automáticamente)`);
        }

        if (!boostActivoEncontrado && (userLevel.boostMultiplier > 1 || boostsActivos.length > 0)) {
            problemas.push(`❌ **Boosts no están siendo aplicados** (revisar sistema)`);
        }

        if (userLevel.boostMultiplier > 1 && !boostTradicionalActivo) {
            problemas.push(`⏰ **Boost tradicional expirado** (desde ${userLevel.boostExpires?.toLocaleDateString()})`);
        }

        if (problemas.length > 0) {
            embed.addFields({
                name: '🚨 Problemas Detectados',
                value: problemas.join('\n'),
                inline: false
            });
        }

        // Recomendaciones
        const recomendaciones = [];

        if (!boostActivoEncontrado) {
            recomendaciones.push('• Compra boosts en la tienda con `/tienda`');
        }

        if (boostsExpirados.length > 0) {
            recomendaciones.push('• Los boosts expirados se limpiarán automáticamente');
        }

        if (multiplicadorEfectivo < 2.0) {
            recomendaciones.push('• Considera comprar un boost x2.0 para mayor ganancia');
        }

        if (recomendaciones.length > 0) {
            embed.addFields({
                name: '💡 Recomendaciones',
                value: recomendaciones.join('\n'),
                inline: false
            });
        }

        // Prueba de cálculo
        const xpEjemplo = 100;
        const xpConBoost = Math.floor(xpEjemplo * multiplicadorEfectivo);

        embed.addFields({
            name: '🧪 Prueba de Cálculo',
            value: [
                `**Sin boost:** ${xpEjemplo} XP`,
                `**Con boost (x${multiplicadorEfectivo.toFixed(2)}):** ${xpConBoost} XP`,
                `**Ganancia extra:** +${xpConBoost - xpEjemplo} XP`,
                `**Incremento:** ${((multiplicadorEfectivo - 1) * 100).toFixed(0)}% más XP`
            ].join('\n'),
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    }

    // ============= MÉTODO INFORMACIÓN =============

    async mostrarInfo(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('ℹ️ Sistema de Boosts')
            .setDescription('Información sobre cómo funcionan los boosts de XP')
            .addFields(
                {
                    name: '⚡ ¿Qué son los boosts?',
                    value: [
                        'Los boosts son multiplicadores temporales que aumentan',
                        'la cantidad de XP que ganas por mensajes y tiempo en voz.',
                        '',
                        '**Ejemplo:** Con un boost x2.0 ganas el DOBLE de XP'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎯 Tipos de Boosts',
                    value: [
                        '**👤 Boost Personal:** Solo te afecta a ti',
                        '**🌐 Boost del Servidor:** Afecta a todos los miembros',
                        '**⚡ Boost Tradicional:** Sistema antiguo (compatible)'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📈 Cómo funcionan',
                    value: [
                        '1. **Compra** un boost en la tienda (`/tienda`)',
                        '2. **Se activa** automáticamente al comprar',
                        '3. **Multiplica** todo el XP que ganas',
                        '4. **Expira** después de la duración configurada',
                        '',
                        '⚠️ **Nota:** Si tienes múltiples boosts,',
                        'se usa el que tenga mayor multiplicador'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔍 Cómo verificar',
                    value: [
                        '• `/boosts ver` - Tus boosts activos',
                        '• `/boosts estado` - Diagnóstico del sistema',
                        '• `/boosts tienda` - Boosts disponibles',
                        '',
                        '**Verifica en tiempo real:**',
                        'Envía un mensaje y revisa cuánto XP ganas'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ Detalles Técnicos',
                    value: [
                        '• **Compatibilidad:** Total con sistema antiguo',
                        '• **Stackable:** Depende de la configuración',
                        '• **Limpieza:** Automática cada 5 minutos',
                        '• **Registro:** Todo queda en la base de datos',
                        '',
                        '**Comando de prueba:**',
                        '`/boosts estado` para diagnóstico completo'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Sistema de Boosts - XP Multiplicado' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }

    // ============= MÉTODOS HELPER =============

    calcularTiempoRestante(fechaExpiracion, fechaActual) {
        if (!fechaExpiracion) return 'Permanente';

        const diffMs = fechaExpiracion - fechaActual;

        if (diffMs <= 0) return 'Expirado';

        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHoras > 24) {
            const dias = Math.floor(diffHoras / 24);
            const horasRestantes = diffHoras % 24;
            return `${dias}d ${horasRestantes}h`;
        } else if (diffHoras > 0) {
            return `${diffHoras}h ${diffMinutos}m`;
        } else {
            return `${diffMinutos}m`;
        }
    }

    formatearPrecio(precio, moneda) {
        const simbolos = {
            'coins': '<:dinero:1451695904351457330>',
            'tokens': '<:tokens:1451695903080579192>',
            'xp': '<:xp:1453078768687255845>'
        };

        return `${precio.toLocaleString()} ${simbolos[moneda] || moneda}`;
    }

    getIconoMoneda(moneda) {
        const iconos = {
            'coins': '<:dinero:1451695904351457330>',
            'tokens': '<:tokens:1451695903080579192>',
            'xp': '<:xp:1453078768687255845>'
        };

        return iconos[moneda] || '💰';
    }
}