export default class EmbedActionExecutor {

    constructor(client) {
        this.client = client;
    }

    // =====================================================
    // ENTRY POINT
    // =====================================================

    async execute(interaction, action, context = {}) {

        if (!action || !action.type)
            throw new Error('Acción inválida.');

        switch (action.type) {

            // =========================================
            // REPLY EPHEMERAL
            // =========================================
            case 'reply_ephemeral': {

                return this.#safeReply(interaction, {
                    content: action.content || '✅ Acción ejecutada.',
                    flags: 64
                });
            }

            // =========================================
            // SEND MESSAGE
            // =========================================
            case 'send_message': {

                await interaction.channel.send({
                    content: action.content || '✅ Acción ejecutada.'
                });

                return this.#safeReply(interaction, {
                    content: '📨 Mensaje enviado.',
                    flags: 64
                });
            }

            // =========================================
            // ROLE CONTROL
            // =========================================
            case 'role_control': {

                const { roleId, mode = 'toggle' } = action;

                if (!roleId)
                    throw new Error('Rol no configurado.');

                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role)
                    throw new Error('Rol no encontrado en el servidor.');

                const hasRole = member.roles.cache.has(roleId);

                // ========================
                // TOGGLE
                // ========================
                if (mode === 'toggle') {

                    if (hasRole) {
                        await member.roles.remove(roleId);

                        return this.#safeReply(interaction, {
                            content: `❌ Se te ha removido el rol **${role.name}**.`,
                            flags: 64
                        });
                    } else {
                        await member.roles.add(roleId);

                        return this.#safeReply(interaction, {
                            content: `✅ Se te ha añadido el rol **${role.name}**.`,
                            flags: 64
                        });
                    }
                }

                // ========================
                // ADD
                // ========================
                if (mode === 'add') {

                    if (hasRole)
                        return this.#safeReply(interaction, {
                            content: `⚠️ Ya tienes el rol **${role.name}**.`,
                            flags: 64
                        });

                    await member.roles.add(roleId);

                    return this.#safeReply(interaction, {
                        content: `✅ Se te ha añadido el rol **${role.name}**.`,
                        flags: 64
                    });
                }

                // ========================
                // REMOVE
                // ========================
                if (mode === 'remove') {

                    if (!hasRole)
                        return this.#safeReply(interaction, {
                            content: `⚠️ No tienes el rol **${role.name}**.`,
                            flags: 64
                        });

                    await member.roles.remove(roleId);

                    return this.#safeReply(interaction, {
                        content: `❌ Se te ha removido el rol **${role.name}**.`,
                        flags: 64
                    });
                }

                throw new Error('Modo de rol inválido.');
            }

            default:
                throw new Error('Tipo de acción no soportado.');
        }
    }

    // =====================================================
    // DISPATCHER
    // =====================================================

    async #executeSingle(interaction, action, context) {

        switch (action.type) {

            // 🔹 ROLES
            case 'role_control':
                return this.#roleControl(interaction, action);

            case 'exclusive_roles':
                return this.#exclusiveRoles(interaction, action, context);

            // 🔹 MENSAJES
            case 'send_message':
                return this.#sendMessage(interaction, action);

            case 'reply_ephemeral':
                return this.#replyEphemeral(interaction, action);

            case 'edit_original':
                return this.#editOriginal(interaction, action);

            // 🔹 UTILIDADES
            case 'delay':
                return this.#delay(action);

            default:
                throw new Error(`Acción desconocida: ${action.type}`);
        }
    }

    // =====================================================
    // ROLE SYSTEM
    // =====================================================

    async #roleControl(interaction, action) {

        const role = interaction.guild.roles.cache.get(action.roleId);
        if (!role) throw new Error('Rol no encontrado');

        const member = interaction.member;
        const hasRole = member.roles.cache.has(role.id);

        const mode = action.mode || 'toggle';

        switch (mode) {

            case 'add':
                if (!hasRole)
                    await member.roles.add(role);
                break;

            case 'remove':
                if (hasRole)
                    await member.roles.remove(role);
                break;

            case 'toggle':
                if (hasRole)
                    await member.roles.remove(role);
                else
                    await member.roles.add(role);
                break;

            case 'add_if_missing':
                if (!hasRole)
                    await member.roles.add(role);
                break;

            default:
                throw new Error('Modo de rol inválido');
        }
    }

    // =====================================================
    // EXCLUSIVE ROLE GROUP
    // =====================================================

    async #exclusiveRoles(interaction, action, context) {

        if (!Array.isArray(action.roles) || action.roles.length === 0)
            throw new Error('Lista de roles exclusiva inválida');

        const member = interaction.member;

        // 🔥 Obtener rol seleccionado dinámicamente (si viene de select)
        const selectedRoleId =
            context?.values?.[0] ||
            action.selectedRoleId;

        if (!selectedRoleId)
            throw new Error('No se especificó rol seleccionado');

        // Quitar todos los roles del grupo
        for (const roleId of action.roles) {
            if (member.roles.cache.has(roleId)) {
                await member.roles.remove(roleId).catch(() => { });
            }
        }

        // Dar el rol seleccionado
        const role = interaction.guild.roles.cache.get(selectedRoleId);
        if (role)
            await member.roles.add(role);
    }

    // =====================================================
    // MESSAGE SYSTEM
    // =====================================================

    async #sendMessage(interaction, action) {

        await interaction.channel.send({
            content: action.content || 'Mensaje',
            embeds: action.embeds || undefined
        });
    }

    async #replyEphemeral(interaction, action) {

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: action.content || 'OK',
                flags: 64
            });
        }
    }

    async #editOriginal(interaction, action) {

        if (!interaction.message) return;

        await interaction.message.edit({
            content: action.content ?? interaction.message.content
        });
    }

    // =====================================================
    // UTILITIES
    // =====================================================

    async #delay(action) {
        const ms = (action.seconds || 1) * 1000;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #safeReply(interaction, payload) {

        if (interaction.replied || interaction.deferred) {
            return interaction.followUp(payload);
        }

        return interaction.reply(payload);
    }

}
