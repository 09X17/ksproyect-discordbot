export default async function handleEmbedEditorInteraction(client, interaction) {

    const editor = client.embedEditorManager;
    const embedManager = client.embedManager;

    // =====================================================
    // BOTONES DEL EDITOR
    // =====================================================

    // COMPONENTES DEL EDITOR (botones + selects)
    if (
        (interaction.isButton() || interaction.isStringSelectMenu()) &&
        interaction.customId.startsWith('editor:')
    ) {
        return editor.handle(interaction);
    }


    // =====================================================
    // MODALES DEL EDITOR
    // =====================================================

    if (!interaction.isModalSubmit()) return false;
    if (!interaction.customId.startsWith('editor_modal:')) return false;

    const parts = interaction.customId.split(':');
    const action = parts[1];
    const templateId = parts[2];
    const index = parts[3] !== undefined ? Number(parts[3]) : null;

    const template = await embedManager.getTemplate(
        interaction.guild.id,
        templateId
    );

    if (!template) {
        return interaction.reply({
            content: '⚠️ Template no encontrado.',
            flags: 64
        });
    }

    try {

        switch (action) {

            // =====================================================
            // TITLE
            // =====================================================

            case 'title': {
                const title = interaction.fields.getTextInputValue('title_input');
                template.embed.title = title || null;
                break;
            }

            // =====================================================
            // DESCRIPTION
            // =====================================================

            case 'description': {
                const desc = interaction.fields.getTextInputValue('desc_input');
                template.embed.description = desc || null;
                break;
            }

            // =====================================================
            // COLOR
            // =====================================================

            case 'color': {

                const hex = interaction.fields.getTextInputValue('color_input');

                if (!hex) {
                    template.embed.color = null;
                    break;
                }

                if (!/^#?[0-9A-Fa-f]{6}$/.test(hex)) {
                    return interaction.reply({
                        content: '❌ Color inválido. Usa formato #RRGGBB',
                        flags: 64
                    });
                }

                const clean = hex.replace('#', '');
                template.embed.color = parseInt(clean, 16);
                break;
            }

            // =====================================================
            // ADD FIELD
            // =====================================================

            case 'addfield': {

                if (!template.embed.fields)
                    template.embed.fields = [];

                if (template.embed.fields.length >= 25) {
                    return interaction.reply({
                        content: '⚠️ Máximo 25 fields permitidos.',
                        flags: 64
                    });
                }

                const name = interaction.fields.getTextInputValue('field_name');
                const value = interaction.fields.getTextInputValue('field_value');

                template.embed.fields.push({
                    name,
                    value,
                    inline: false
                });

                break;
            }

            // =====================================================
            // ADD BUTTON
            // =====================================================

            case 'addbutton': {

                const label = interaction.fields.getTextInputValue('btn_label');
                const type = interaction.fields.getTextInputValue('btn_type');
                const styleInput = interaction.fields.getTextInputValue('btn_style');
                const extra = interaction.fields.getTextInputValue('btn_url_or_role');

                const styleMap = {
                    primary: 1,
                    secondary: 2,
                    success: 3,
                    danger: 4
                };

                const style = styleMap[styleInput?.toLowerCase()] || 1;

                if (!template.components)
                    template.components = {};

                if (!template.components.buttons)
                    template.components.buttons = [];

                if (type === 'url') {

                    template.components.buttons.push({
                        type: 'link',
                        label,
                        style: 5,
                        url: extra,
                        disabled: false
                    });

                } else {

                    template.components.buttons.push({
                        type: 'action',
                        label,
                        style,
                        action: {
                            type: 'reply_ephemeral',
                            content: 'Botón ejecutado.'
                        },
                        permissions: {},
                        limits: {},
                        usage: { totalUses: 0, users: [] }
                    });
                }

                break;
            }


            // =====================================================
            // EDIT LABEL
            // =====================================================

            case 'editlabel': {

                if (index === null) return false;

                const newLabel =
                    interaction.fields.getTextInputValue('new_label');

                template.components.buttons[index].label = newLabel;
                break;
            }

            // =====================================================
            // SET ACTION
            // =====================================================

            case 'setaction': {

                return false;
            }


            case 'roleconfig': {

                if (index === null) return false;

                const roleId =
                    interaction.fields.getTextInputValue('role_id');

                const mode =
                    interaction.fields.getTextInputValue('role_mode') || 'toggle';

                if (!roleId)
                    return interaction.reply({
                        content: '❌ Debes proporcionar un Role ID.',
                        flags: 64
                    });

                template.components.buttons[index].action = {
                    type: 'role_control',
                    roleId,
                    mode
                };

                break;
            }

            case 'messageconfig': {

                if (index === null) return false;

                const content =
                    interaction.fields.getTextInputValue('message_content');

                if (!content)
                    return interaction.reply({
                        content: '❌ Debes escribir un mensaje.',
                        flags: 64
                    });

                const ephemeral = parts[4] === 'true';

                template.components.buttons[index].action = {
                    type: ephemeral
                        ? 'reply_ephemeral'
                        : 'send_message',
                    content
                };

                break;
            }


            // =====================================================
            // PERMISSIONS
            // =====================================================

            case 'permissions': {

                if (index === null) return false;

                const roles =
                    interaction.fields.getTextInputValue('allowed_roles');

                template.components.buttons[index].permissions = {
                    allowedRoles: roles
                        ? roles.split(',').map(r => r.trim())
                        : []
                };

                break;
            }

            // =====================================================
            // LIMITS
            // =====================================================

            case 'limits': {

                if (index === null) return false;

                const cooldown =
                    interaction.fields.getTextInputValue('cooldown');

                template.components.buttons[index].limits = {
                    userCooldown: cooldown ? Number(cooldown) : null
                };

                break;
            }

            // =====================================================
            // THUMBNAIL
            // =====================================================

            case 'thumbnail': {

                const url =
                    interaction.fields.getTextInputValue('thumbnail_url');

                if (!url) {
                    template.embed.thumbnail = null;
                    break;
                }

                template.embed.thumbnail = url || null;
                break;
            }

            // =====================================================
            // IMAGE
            // =====================================================

            case 'image': {

                const url =
                    interaction.fields.getTextInputValue('image_url');

                if (!url) {
                    template.embed.image = null;
                    break;
                }

                template.embed.image = url || null;
                break;
            }


            default:
                return false;
        }

        // =====================================================
        // SAVE + INVALIDATE CACHE
        // =====================================================

        await template.save();

        embedManager.invalidateTemplate(
            template.guildId,
            template._id
        );

        // =====================================================
        // REFRESH PANEL
        // =====================================================

        const panel = editor.buildMainPanel(template);

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
                content: '✅ Cambios aplicados.',
                embeds: [panel.embed],
                components: panel.components
            });
        } else {
            await interaction.reply({
                content: '✅ Cambios aplicados.',
                embeds: [panel.embed],
                components: panel.components,
                flags: 64
            });
        }

        return true;

    } catch (error) {

        console.error('Error editor modal:', error);

        if (!interaction.replied && !interaction.deferred) {
            return interaction.reply({
                content: '❌ Error aplicando cambios.',
                flags: 64
            });
        }

        return false;
    }
}
