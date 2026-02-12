import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} from 'discord.js';

export default class EmbedEditorManager {

    constructor(client, embedManager) {
        this.client = client;
        this.embedManager = embedManager;
    }

    // =====================================================
    // START SESSION
    // =====================================================

    async startSession(interaction, template) {

        const panel = this.buildMainPanel(template);

        if (interaction.deferred || interaction.replied) {

            await interaction.editReply({
                content: `🛠 Editor: **${template.name}**`,
                embeds: [panel.embed],
                components: panel.components
            });

        } else {

            await interaction.reply({
                content: `🛠 Editor: **${template.name}**`,
                embeds: [panel.embed],
                components: panel.components,
                flags: 64
            });
        }
    }


    // =====================================================
    // MAIN PANEL
    // =====================================================

    buildMainPanel(template) {

        const render = this.embedManager.renderer.render(template);
        const { embed } =
            this.embedManager.renderer.render(template);


        if (
            !template.embed.title &&
            !template.embed.description &&
            (!template.embed.fields || template.embed.fields.length === 0)
        ) {
            embed.setDescription('⚠️ Este embed aún no tiene contenido.');
        }


        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editor:title:${template._id}`)
                .setLabel('Título')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`editor:description:${template._id}`)
                .setLabel('Descripción')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`editor:color:${template._id}`)
                .setLabel('Color')
                .setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editor:addfield:${template._id}`)
                .setLabel('Añadir Field')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`editor:buttons:${template._id}`)
                .setLabel('Botones')
                .setStyle(ButtonStyle.Secondary)
        );

        const row3 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editor:thumbnail:${template._id}`)
                .setLabel('Thumbnail')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`editor:image:${template._id}`)
                .setLabel('Imagen')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`editor:timestamp:${template._id}`)
                .setLabel('Timestamp')
                .setStyle(ButtonStyle.Secondary)
        );


        return {
            embed,
            components: [row1, row2, row3]
        };
    }

    // =====================================================
    // HANDLE
    // =====================================================

    async handle(interaction) {

        if (!interaction.customId.startsWith('editor:'))
            return false;

        const parts = interaction.customId.split(':');
        const action = parts[1];
        const templateId = parts[2];

        const template = await this.embedManager.getTemplate(
            interaction.guild.id,
            templateId
        );

        if (!template)
            return interaction.reply({
                content: '⚠️ Template no encontrado.',
                flags: 64
            });

        // SELECT BUTTON
        if (interaction.isStringSelectMenu() &&
            action === 'selectbutton') {

            const index = Number(interaction.values[0]);
            return this.#openEditButtonPanel(interaction, template, index);
        }

        if (interaction.isStringSelectMenu() &&
            action === 'selectaction') {

            const selected = interaction.values[0];
            const index = parts[3];

            if (selected === 'role_control')
                return this.#openRoleConfigModal(interaction, template, index);

            if (selected === 'reply_ephemeral')
                return this.#openMessageConfigModal(interaction, template, index, true);

            if (selected === 'send_message')
                return this.#openMessageConfigModal(interaction, template, index, false);
        }


        switch (action) {

            case 'title':
                return this.#openTitleModal(interaction, template);

            case 'description':
                return this.#openDescriptionModal(interaction, template);

            case 'color':
                return this.#openColorModal(interaction, template);

            case 'addfield':
                return this.#openFieldModal(interaction, template);

            case 'buttons':
                return this.#openButtonsPanel(interaction, template);

            case 'addbutton':
                return this.#openAddButtonModal(interaction, template);

            case 'editlabel':
                return this.#openEditLabelModal(interaction, template, parts[3]);

            case 'action':
                return this.#openActionSelector(interaction, template, parts[3]);

            case 'permissions':
                return this.#openPermissionsModal(interaction, template, parts[3]);

            case 'limits':
                return this.#openLimitsModal(interaction, template, parts[3]);

            case 'deletebutton':
                return this.#deleteButton(interaction, template, parts[3]);

            case 'thumbnail':
                return this.#openThumbnailModal(interaction, template);

            case 'image':
                return this.#openImageModal(interaction, template);

            case 'timestamp':
                return this.#toggleTimestamp(interaction, template);

            default:
                return false;
        }
    }

    // =====================================================
    // BUTTON PANEL
    // =====================================================

    async #openButtonsPanel(interaction, template) {

        const buttons = template.components?.buttons || [];

        const embed = {
            title: '🔘 Gestión de Botones',
            description:
                buttons.length === 0
                    ? 'No hay botones.'
                    : buttons.map((b, i) =>
                        `**${i}** → ${b.label} (${b.type})`
                    ).join('\n'),
            color: 0x2f3136
        };

        const components = [];

        if (buttons.length > 0) {

            const select = new StringSelectMenuBuilder()
                .setCustomId(`editor:selectbutton:${template._id}`)
                .setPlaceholder('Selecciona un botón')
                .addOptions(
                    buttons.map((b, i) => ({
                        label: b.label,
                        value: `${i}`
                    }))
                );

            components.push(
                new ActionRowBuilder().addComponents(select)
            );
        }

        components.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`editor:addbutton:${template._id}`)
                    .setLabel('➕ Añadir')
                    .setStyle(ButtonStyle.Success)
            )
        );

        await interaction.update({
            embeds: [embed],
            components,
            flags: 64
        });
    }

    // =====================================================
    // EDIT BUTTON PANEL
    // =====================================================

    async #openEditButtonPanel(interaction, template, index) {

        const embed = {
            title: '⚙️ Configuración de Botón',
            description: `Índice: ${index}`,
            color: 0x5865f2
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editor:editlabel:${template._id}:${index}`)
                .setLabel('Editar Label')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId(`editor:action:${template._id}:${index}`)
                .setLabel('Acción')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`editor:permissions:${template._id}:${index}`)
                .setLabel('Permisos')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`editor:limits:${template._id}:${index}`)
                .setLabel('Límites')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId(`editor:deletebutton:${template._id}:${index}`)
                .setLabel('Eliminar')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.update({
            embeds: [embed],
            components: [row],
            flags: 64
        });
    }

    // =====================================================
    // MODAL OPENERS
    // =====================================================

    async #openTitleModal(interaction, template) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:title:${template._id}`)
            .setTitle('Editar Título');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('title_input')
                    .setLabel('Nuevo título')
                    .setStyle(TextInputStyle.Short)
                    .setValue(template.embed.title || '')
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #openDescriptionModal(interaction, template) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:description:${template._id}`)
            .setTitle('Editar Descripción');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('desc_input')
                    .setLabel('Nueva descripción')
                    .setStyle(TextInputStyle.Paragraph)
                    .setValue(template.embed.description || '')
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #openColorModal(interaction, template) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:color:${template._id}`)
            .setTitle('Cambiar Color');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('color_input')
                    .setLabel('#RRGGBB')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #openFieldModal(interaction, template) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:addfield:${template._id}`)
            .setTitle('Añadir Field');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('field_name')
                    .setLabel('Nombre')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('field_value')
                    .setLabel('Valor')
                    .setStyle(TextInputStyle.Paragraph)
            )
        );

        await interaction.showModal(modal);
    }

    async #openAddButtonModal(interaction, template) {

        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:addbutton:${template._id}`)
            .setTitle('Crear Botón');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('btn_label')
                    .setLabel('Label')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('btn_type')
                    .setLabel('Tipo: action / url')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('btn_style')
                    .setLabel('primary,secondary,success,danger')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('btn_url_or_role')
                    .setLabel('URL o Role ID (si aplica)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }


    async #openEditLabelModal(interaction, template, index) {
        const button = template.components.buttons[index];

        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:editlabel:${template._id}:${index}`)
            .setTitle('Editar Label');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('new_label')
                    .setLabel('Nuevo label')
                    .setStyle(TextInputStyle.Short)
                    .setValue(button.label)
            )
        );

        await interaction.showModal(modal);
    }

    async #openActionSelector(interaction, template, index) {

        const select = new StringSelectMenuBuilder()
            .setCustomId(`editor:selectaction:${template._id}:${index}`)
            .setPlaceholder('Selecciona tipo de acción')
            .addOptions([
                {
                    label: 'Control de Rol',
                    value: 'role_control'
                },
                {
                    label: 'Respuesta Ephemeral',
                    value: 'reply_ephemeral'
                },
                {
                    label: 'Enviar Mensaje Público',
                    value: 'send_message'
                }
            ]);

        await interaction.reply({
            content: 'Selecciona el tipo de acción:',
            components: [
                new ActionRowBuilder().addComponents(select)
            ],
            flags: 64
        });
    }



    async #openPermissionsModal(interaction, template, index) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:permissions:${template._id}:${index}`)
            .setTitle('Permisos');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('allowed_roles')
                    .setLabel('IDs separados por coma')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #openLimitsModal(interaction, template, index) {
        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:limits:${template._id}:${index}`)
            .setTitle('Límites');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('cooldown')
                    .setLabel('User Cooldown (segundos)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #deleteButton(interaction, template, index) {

        template.components.buttons.splice(index, 1);
        await template.save();

        await interaction.update({
            content: '🗑 Botón eliminado.',
            flags: 64
        });
    }

    async #openThumbnailModal(interaction, template) {

        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:thumbnail:${template._id}`)
            .setTitle('Configurar Thumbnail');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('thumbnail_url')
                    .setLabel('URL de imagen')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #openImageModal(interaction, template) {

        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:image:${template._id}`)
            .setTitle('Configurar Imagen');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('image_url')
                    .setLabel('URL de imagen')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
            )
        );

        await interaction.showModal(modal);
    }

    async #toggleTimestamp(interaction, template) {

        template.embed.timestamp =
            template.embed.timestamp ? null : new Date();

        await template.save();

        await interaction.update({
            content: template.embed.timestamp
                ? '🕒 Timestamp activado.'
                : '❌ Timestamp desactivado.',
            flags: 64
        });
    }

    async #openRoleConfigModal(interaction, template, index) {

        const modal = new ModalBuilder()
            .setCustomId(`editor_modal:roleconfig:${template._id}:${index}`)
            .setTitle('Configurar Control de Rol');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('role_id')
                    .setLabel('Role ID')
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('role_mode')
                    .setLabel('Modo: add / remove / toggle')
                    .setStyle(TextInputStyle.Short)
            )
        );

        await interaction.showModal(modal);
    }


    async #openMessageConfigModal(interaction, template, index, ephemeral) {

        const modal = new ModalBuilder()
            .setCustomId(
                `editor_modal:messageconfig:${template._id}:${index}:${ephemeral}`
            )
            .setTitle('Configurar Mensaje');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('message_content')
                    .setLabel('Contenido del mensaje')
                    .setStyle(TextInputStyle.Paragraph)
            )
        );

        await interaction.showModal(modal);
    }



}
