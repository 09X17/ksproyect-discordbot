import { MessageFlags, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

export default class TicketInteractionManager {
    constructor(client) {
        this.client = client;
    }

    async handleTicketInteraction(interaction) {
        const { customId, user, channel, guild } = interaction;
        if (!customId) return false;

        try {

            if (interaction.isModalSubmit()) {
                await this.handleModalSubmit(interaction);
                return true;
            }

            if (customId.startsWith("open_ticket_")) {
                await interaction.deferReply({ flags: 64 });

                const panelId = customId.replace("open_ticket_", "");
                const selected = interaction.values[0]; 
                this.client.logger.debug(`Creando ticket: panelId=${panelId}, category=${selected}, user=${user.tag}`);

                const result = await this.client.ticketManager.createTicket(
                    guild,
                    user,
                    `Ticket creado en la categoría: ${selected}`,
                    selected,
                    panelId 
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

            // 👇 Manejar el viejo formato (para backwards compatibility)
            if (customId === "open_ticket") {
                await interaction.deferReply({ flags: 64 });

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
                    await interaction.deferReply({ flags: 64 });
                    await this.handleCloseButton(interaction);
                    break;

                case "claim_ticket":
                    await interaction.deferReply({ flags: 64 });
                    await this.handleClaimTicket(interaction);
                    break;

                case "transcript_ticket":
                    await interaction.deferReply({ flags: 64 });
                    await this.handleTranscriptTicket(interaction);
                    break;

                case "confirm_close":
                    await this.handleConfirmClose(interaction);
                    break;

                case "cancel_close":
                    await interaction.deferReply({ flags: 64 });
                    await this.handleCancelClose(interaction);
                    break;

                default:
                    await interaction.deferReply({ flags: 64 });
                    await interaction.editReply({
                        content: "❌ Acción de ticket no reconocida",
                        flags: 64
                    });
            }



            return true;
        } catch (error) {
            this.client.logger.error("Error en handleTicketInteraction:", error);
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        content: "❌ Error al procesar la solicitud. Contacta con un administrador.",
                        flags: 64
                    });
                } else {
                    await interaction.reply({
                        content: "❌ Error al procesar la solicitud. Contacta con un administrador.",
                        flags: 64
                    });
                }
            } catch (followUpError) {
                this.client.logger.error('Error al enviar mensaje de error:', followUpError);
            }

            return true;
        }
    }

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

        const config = await this.client.ticketManager.getGuildConfig(guild.id);
        const hasPermission = interaction.member.roles.cache.has(config?.supportRoleId) ||
            user.id === ticket.creatorId;

        if (!hasPermission) {
            return await interaction.editReply({
                content: '❌ No tienes permiso para cerrar este ticket.'
            });
        }

        const confirmEmbed = new EmbedBuilder()
            .setTitle('**```CONFIRMAR CIERRE DE TICKET```**')
            .setDescription('🔐 `¿Estás seguro de que quieres cerrar este ticket?`')
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

        const modal = new ModalBuilder()
            .setCustomId("close_ticket_modal")
            .setTitle("Cerrar Ticket");

        const reasonInput = new TextInputBuilder()
            .setCustomId("razon_cierre")
            .setLabel("Motivo del cierre del ticket")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Ejemplo: El problema fue solucionado correctamente.")
            .setRequired(true);

        const evidenceInput = new TextInputBuilder()
            .setCustomId("evidencia_ticket")
            .setLabel("Evidencia o enlace (opcional)")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("Ejemplo: https://imgur.com/ejemplo.png")
            .setRequired(false);

        const row1 = new ActionRowBuilder().addComponents(reasonInput);
        const row2 = new ActionRowBuilder().addComponents(evidenceInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
    }

    async handleModalSubmit(interaction) {
        
        
        if (interaction.customId !== "close_ticket_modal") return;

        const { user, channel, guild } = interaction;

        const ticket = await this.client.db.models.Ticket.findOne({
            channelId: channel.id
        });

        if (!ticket) {
            return await interaction.reply({
                content: '❌ Este canal no es un ticket válido.',
                flags: 64
            });
        }

        const razon = interaction.fields.getTextInputValue("razon_cierre");
        const evidencia = interaction.fields.getTextInputValue("evidencia_ticket") || "No proporcionada";

        let evidenceForLog = evidencia;

        if (this.client.ticketManager.isValidImageUrl(evidencia)) {
            evidenceForLog = evidencia;
        }

        const result = await this.client.ticketManager.closeTicket(
            ticket.ticketId,
            user.id,
            razon,
            evidenceForLog  
        );

        if (!result.success) {
            return await interaction.reply({
                content: `❌ Error al cerrar el ticket: ${result.error}`,
                flags: 64
            });
        }

        const closeEmbed = new EmbedBuilder()
            .setTitle("**```TICKET CERRADO```**")
            .setColor("#FF0000")
            .setDescription(`🔐 El ticket fue cerrado por <@${user.id}>`)
            .addFields(
                { name: "**```RAZÓN DE CIERRE```**", value: razon },
                { name: "**```EVIDENCIA```**", value: evidencia }
            )
            .setTimestamp();

        if (this.client.ticketManager.isValidImageUrl(evidencia)) {
            closeEmbed.setImage(evidencia);
        }

        await interaction.reply({
            embeds: [closeEmbed],
            flags: 64
        });

        await this.client.ticketManager.sendLog(
            guild.id,
            `🔐 \`TICKET:\` ${ticket.ticketId}\n\`CERRADO POR:\` <@${user.id}>\n\`RAZÓN:\` ${razon}`,
            evidenceForLog 
        );

        setTimeout(() => {
            channel.delete().catch(() => { });
        }, 5000);
    }

    async handleCancelClose(interaction) {
        await interaction.editReply({
            content: '❌ Cierre de ticket cancelado.',
            components: []
        });
    }

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

        if (ticket.status === 'claimed') {
            return await interaction.editReply({
                content: `❌ Este ticket ya fue reclamado por <@${ticket.claimerId}>.`
            });
        }

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

        const config = await this.client.ticketManager.getGuildConfig(guild.id);
        const hasPermission = interaction.member.roles.cache.has(config?.supportRoleId) ||
            user.id === ticket.creatorId;

        if (!hasPermission) {
            return await interaction.editReply({
                content: '❌ No tienes permiso para generar el transcript de este ticket.'
            });
        }

        await interaction.editReply({
            content: '⏳ Generando transcript, por favor espera...'
        });

        const result = await this.client.ticketManager.generateTranscript(
            ticket.ticketId,
            user.id
        );

        if (result.success) {
            if (result.transcript.length > 1500) {
                const part1 = result.transcript.substring(0, 1500);
                const part2 = result.transcript.substring(1500);

                await interaction.editReply({
                    content: `✅ Transcript generado correctamente (Parte 1/2):\n\`\`\`${part1}\`\`\``
                });

                await interaction.followUp({
                    content: `(Parte 2/2):\n\`\`\`${part2}\`\`\``,
                    flags: 64
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

    async handleInteractionError(interaction, error) {
        const errorResponse = {
            content: '❌ Ocurrió un error al procesar la interacción',
            flags: 64
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

    async checkTicketPermissions(interaction, ticket) {
        const config = await this.client.ticketManager.getGuildConfig(interaction.guild.id);
        const isSupport = interaction.member.roles.cache.has(config?.supportRoleId);
        const isCreator = interaction.user.id === ticket.creatorId;

        return { hasPermission: isSupport || isCreator, isSupport, isCreator };
    }

    async getTicketByChannel(channelId) {
        return await this.client.db.models.Ticket.findOne({ channelId });
    }
}