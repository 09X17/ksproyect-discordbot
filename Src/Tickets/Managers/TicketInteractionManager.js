import { MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export default class TicketInteractionManager {
    constructor(client) {
        this.client = client;
    }

    // Método principal para manejar interacciones de tickets
    async handleTicketInteraction(interaction) {
        const { customId, user, channel, guild } = interaction;
        if (!customId) return false;

        try {

            if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
                return true;
            }

            // 👇 Manejar menús open_ticket con panelId (CORREGIDO)
            if (customId.startsWith("open_ticket_")) {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                // Extraer panelId del customId (CORREGIDO)
                const panelId = customId.replace("open_ticket_", "");
                const selected = interaction.values[0]; // categoría elegida

                // ✅ DEBUG: Verificar que estamos recibiendo los datos correctos
                this.client.logger.debug(`Creando ticket: panelId=${panelId}, category=${selected}, user=${user.tag}`);

                const result = await this.client.ticketManager.createTicket(
                    guild,
                    user,
                    `Ticket creado en la categoría: ${selected}`,
                    selected,
                    panelId // ← ¡Pasar el panelId!
                );

                if (result.success) {
                    await interaction.editReply({
                        content: `✅ Ticket creado correctamente: ${result.channel}`
                    });
                } else {
                    await interaction.editReply({
                        content: `❌ Error al crear el ticket: ${result.error}`
                    });
                }

                return true; // interacción manejada
            }

            // 👇 Manejar el viejo formato (para backwards compatibility)
            if (customId === "open_ticket") {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });

                const selected = interaction.values[0]; // categoría elegida

                this.client.logger.debug(`Creando ticket (viejo formato): category=${selected}, user=${user.tag}`);

                const result = await this.client.ticketManager.createTicket(
                    guild,
                    user,
                    `Ticket creado en la categoría: ${selected}`,
                    selected
                    // Sin panelId para backwards compatibility
                );

                if (result.success) {
                    await interaction.editReply({
                        content: `✅ Ticket creado correctamente: ${result.channel}`
                    });
                } else {
                    await interaction.editReply({
                        content: `❌ Error al crear el ticket: ${result.error}`
                    });
                }

                return true;
            }

            // 🔹 Resto de acciones de ticket (botones)
            const ticketActions = [
                "close_ticket",
                "claim_ticket",
                "transcript_ticket",
                "confirm_close",
                "cancel_close"
            ];

            if (!ticketActions.some(action => customId.startsWith(action))) {
                return false;
            }

            switch (customId) {
                case "close_ticket":
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await this.handleCloseButton(interaction);
                    break;

                case "claim_ticket":
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await this.handleClaimTicket(interaction);
                    break;

                case "transcript_ticket":
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await this.handleTranscriptTicket(interaction);
                    break;

                case "confirm_close":
                    await this.handleConfirmClose(interaction);
                    break;

                case "cancel_close":
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await this.handleCancelClose(interaction);
                    break;

                default:
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    await interaction.editReply({
                        content: "❌ Acción de ticket no reconocida",
                        flags: MessageFlags.Ephemeral
                    });
            }



            return true;
        } catch (error) {
            this.client.logger.error("Error en handleTicketInteraction:", error);

            // ✅ Mejor manejo de errores
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: "❌ Error al procesar la solicitud. Contacta con un administrador.",
                        flags: MessageFlags.Ephemeral
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Error al procesar la solicitud. Contacta con un administrador.",
                        flags: MessageFlags.Ephemeral,
                        flags: 64
                    });
                }
            } catch (followUpError) {
                this.client.logger.error('Error al enviar mensaje de error:', followUpError);
            }

            return true;
        }
    }


    // Manejar botón de cierre (mostrar confirmación)
    async handleCloseButton(interaction) {
        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.editReply({
                content: '❌ Este canal no es un ticket válido.'
            });
        }

        // Verificar permisos
        const config = await this.client.ticketManager.getGuildConfig(guild.id);
        const hasPermission = interaction.member.roles.cache.has(config?.supportRoleId) ||
            user.id === ticket.creatorId;

        if (!hasPermission) {
            return await interaction.editReply({
                content: '❌ No tienes permiso para cerrar este ticket.'
            });
        }

        // Mostrar mensaje de confirmación
        const confirmEmbed = new EmbedBuilder()
            .setTitle('**```CONFIRMAR CIERRE DE TICKET```**')
            .setDescription('<:candado:1431438950345740298> |  `¿Estás seguro de que quieres cerrar este ticket?`')
            .setColor('#FFA500')

        const confirmButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('Sí, cerrar ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });
    }

    // Manejar confirmación de cierre
    async handleConfirmClose(interaction) {
        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.editReply({
                content: '❌ Este canal no es un ticket válido.'
            });
        }

        // ⚙️ Crear modal con razón y evidencia
        const modal = new ModalBuilder()
            .setCustomId("close_ticket_modal")
            .setTitle("🔒 Cerrar Ticket");

        // Campo 1: Razón del cierre
        const reasonInput = new TextInputBuilder()
            .setCustomId("razon_cierre")
            .setLabel("Motivo del cierre del ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Ejemplo: El problema fue solucionado correctamente.")
            .setRequired(true);

        // Campo 2: Evidencia o prueba
        const evidenceInput = new TextInputBuilder()
            .setCustomId("evidencia_ticket")
            .setLabel("Evidencia o enlace (opcional)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ejemplo: https://imgur.com/ejemplo.png")
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(reasonInput);
        const row2 = new ActionRowBuilder().addComponents(evidenceInput);

        modal.addComponents(row1, row2);

        // Mostrar modal al usuario
        await interaction.showModal(modal);
    }

    // Manejar envío del modal de cierre
    async handleModalSubmit(interaction) {
        
        
        if (interaction.customId !== "close_ticket_modal") return;

        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.reply({
                content: '❌ Este canal no es un ticket válido.',
                flags: MessageFlags.Ephemeral
            });
        }

        const razon = interaction.fields.getTextInputValue("razon_cierre");
        const evidencia = interaction.fields.getTextInputValue("evidencia_ticket") || "No proporcionada";

        // ✅ DETECTAR SI LA EVIDENCIA ES UNA URL DE IMAGEN
        let evidenceForLog = evidencia;

        // Si es una URL de imagen válida, pasarla directamente para que sendLog use setImage
        if (this.client.ticketManager.isValidImageUrl(evidencia)) {
            evidenceForLog = evidencia;
        }

        // Cerrar el ticket en la base de datos - pasar la evidencia también
        const result = await this.client.ticketManager.closeTicket(
            ticket.ticketId,
            user.id,
            razon,
            evidenceForLog  // ← Pasar la evidencia al closeTicket
        );

        if (!result.success) {
            return await interaction.reply({
                content: `❌ Error al cerrar el ticket: ${result.error}`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 📋 Embed de cierre con evidencia
        const closeEmbed = new EmbedBuilder()
            .setTitle("**```TICKET CERRADO```**")
            .setColor("#FF0000")
            .setDescription(`<:candado:1431438950345740298> | El ticket fue cerrado por <@${user.id}>`)
            .addFields(
                { name: "**```RAZÓN DE CIERRE```**", value: razon },
                { name: "**```EVIDENCIA```**", value: evidencia }
            )
            .setTimestamp();

        // ✅ SI LA EVIDENCIA ES IMAGEN, AÑADIRLA AL EMBED
        if (this.client.ticketManager.isValidImageUrl(evidencia)) {
            closeEmbed.setImage(evidencia);
        }

        await interaction.reply({
            embeds: [closeEmbed],
            flags: MessageFlags.Ephemeral
        });

        // ✅ Enviar log - pasar solo la evidencia, no el embed completo
        await this.client.ticketManager.sendLog(
            guild.id,
            `<:candado:1431438950345740298> | \`TICKET:\` ${ticket.ticketId}\n\`CERRADO POR:\` <@${user.id}>\n\`RAZÓN:\` ${razon}`,
            evidenceForLog 
        );

        // Eliminar el canal después de unos segundos
        setTimeout(() => {
            channel.delete().catch(() => { });
        }, 5000);
    }

    // Manejar cancelación de cierre
    async handleCancelClose(interaction) {
        await interaction.editReply({
            content: '❌ Cierre de ticket cancelado.',
            components: []
        });
    }

    // Manejar reclamación de ticket
    async handleClaimTicket(interaction) {
        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.editReply({
                content: '❌ Este canal no es un ticket válido.'
            });
        }

        // Verificar si el ticket ya está reclamado
        if (ticket.status === 'claimed') {
            return await interaction.editReply({
                content: `❌ Este ticket ya fue reclamado por <@${ticket.claimerId}>.`
            });
        }

        // Verificar si el usuario tiene el rol de soporte
        const config = await this.client.ticketManager.getGuildConfig(guild.id);
        if (!config?.supportRoleId || !interaction.member.roles.cache.has(config.supportRoleId)) {
            return await interaction.editReply({
                content: '❌ Solo el equipo de soporte puede reclamar tickets.'
            });
        }

        const result = await this.client.ticketManager.claimTicket(
            ticket.ticketId,
            user.id
        );

        if (result.success) {
            await interaction.editReply({
                content: '✅ Ticket reclamado correctamente. Ahora eres el responsable de este ticket.'
            });
        } else {
            await interaction.editReply({
                content: `❌ Error: ${result.error}`
            });
        }
    }

    // Manejar generación de transcript
    async handleTranscriptTicket(interaction) {
        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.editReply({
                content: '❌ Este canal no es un ticket válido.'
            });
        }

        // Verificar permisos
        const config = await this.client.ticketManager.getGuildConfig(guild.id);
        const hasPermission = interaction.member.roles.cache.has(config?.supportRoleId) ||
            user.id === ticket.creatorId;

        if (!hasPermission) {
            return await interaction.editReply({
                content: '❌ No tienes permiso para generar el transcript de este ticket.'
            });
        }

        // Mostrar mensaje de que se está generando el transcript
        await interaction.editReply({
            content: '⏳ Generando transcript, por favor espera...'
        });

        const result = await this.client.ticketManager.generateTranscript(
            ticket.ticketId,
            user.id
        );

        if (result.success) {
            // Si el transcript es muy largo, dividirlo en partes
            if (result.transcript.length > 1500) {
                const part1 = result.transcript.substring(0, 1500);
                const part2 = result.transcript.substring(1500);

                await interaction.editReply({
                    content: `✅ Transcript generado correctamente (Parte 1/2):\n\`\`\`${part1}\`\`\``
                });

                await interaction.followUp({
                    content: `(Parte 2/2):\n\`\`\`${part2}\`\`\``,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                await interaction.editReply({
                    content: `✅ Transcript generado correctamente:\n\`\`\`${result.transcript}\`\`\``
                });
            }
        } else {
            await interaction.editReply({
                content: `❌ Error: ${result.error}`
            });
        }
    }

    // Manejo de errores para interacciones
    async handleInteractionError(interaction, error) {
        const errorResponse = {
            content: '❌ Ocurrió un error al procesar la interacción',
            flags: MessageFlags.Ephemeral
        };

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorResponse);
            } else {
                await interaction.reply(errorResponse);
            }
        } catch (followUpError) {
            this.client.logger.error('Error al enviar mensaje de error:', followUpError);
        }
    }

    // Método para verificar permisos de ticket (útil para otros módulos)
    async checkTicketPermissions(interaction, ticket) {
        const config = await this.client.ticketManager.getGuildConfig(interaction.guild.id);
        const isSupport = interaction.member.roles.cache.has(config?.supportRoleId);
        const isCreator = interaction.user.id === ticket.creatorId;

        return { hasPermission: isSupport || isCreator, isSupport, isCreator };
    }

    // Método para obtener ticket por canal
    async getTicketByChannel(channelId) {
        return await this.client.db.models.Ticket.findOne({ channelId });
    }
}