import {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder
} from 'discord.js';

export default class EmbedRenderer {

    constructor() {
        this.MAX_BUTTONS_PER_ROW = 5;
        this.MAX_TOTAL_ROWS = 5;
    }

    // =====================================================
    // PUBLIC
    // =====================================================

    render(template) {

        if (!template)
            throw new Error('Template inválido');

        const embed = this.#renderEmbed(template.embed);
        const components = this.#renderComponents(template);

        return { embed, components };
    }

    // =====================================================
    // EMBED
    // =====================================================

    #renderEmbed(data = {}) {

        const embed = new EmbedBuilder();

        if (data.title) embed.setTitle(data.title);
        if (data.description) embed.setDescription(data.description);
        if (data.color) embed.setColor(data.color);
        if (data.url) embed.setURL(data.url);
        if (data.thumbnail) embed.setThumbnail(data.thumbnail);
        if (data.image) embed.setImage(data.image);

        if (data.timestamp) embed.setTimestamp(data.timestamp);

        if (data.footer?.text) {
            embed.setFooter({
                text: data.footer.text,
                iconURL: data.footer.iconURL || undefined
            });
        }

        if (data.author?.name) {
            embed.setAuthor({
                name: data.author.name,
                iconURL: data.author.iconURL || undefined,
                url: data.author.url || undefined
            });
        }

        if (Array.isArray(data.fields) && data.fields.length > 0) {
            embed.addFields(
                data.fields.map(f => ({
                    name: f.name,
                    value: f.value,
                    inline: Boolean(f.inline)
                }))
            );
        }

        return embed;
    }

    // =====================================================
    // COMPONENTS
    // =====================================================

    #renderComponents(template) {

        const rows = [];

        if (!template._id)
            throw new Error('Template sin _id');

        const templateId = template._id.toString();

        const buttons = template.components?.buttons || [];
        const selects = template.components?.selects || [];

        // =============================
        // BUTTONS
        // =============================

        for (let i = 0; i < buttons.length; i += this.MAX_BUTTONS_PER_ROW) {

            const slice = buttons.slice(i, i + this.MAX_BUTTONS_PER_ROW);
            const row = new ActionRowBuilder();

            slice.forEach((btn, offset) => {

                const globalIndex = i + offset;

                const button = new ButtonBuilder()
                    .setLabel(btn.label)
                    .setStyle(
                        typeof btn.style === 'number' ? btn.style : 1
                    )
                    .setDisabled(Boolean(btn.disabled));

                if (btn.type === 'link') {

                    button.setURL(btn.url);

                } else {

                    button.setCustomId(
                        `embed:${templateId}:button:${globalIndex}`
                    );
                }

                if (btn.emoji)
                    button.setEmoji(btn.emoji);

                row.addComponents(button);
            });

            rows.push(row);
        }

        // =============================
        // SELECTS
        // =============================

        selects.forEach((sel, index) => {

            if (!sel.options || sel.options.length === 0)
                return;

            const menu = new StringSelectMenuBuilder()
                .setCustomId(`embed:${templateId}:select:${index}`)
                .setPlaceholder(sel.placeholder || 'Selecciona una opción')
                .setMinValues(sel.minValues || 1)
                .setMaxValues(sel.maxValues || 1)
                .setDisabled(Boolean(sel.disabled))
                .addOptions(
                    sel.options.map(opt => ({
                        label: opt.label,
                        value: opt.value,
                        description: opt.description || undefined,
                        emoji: opt.emoji || undefined
                    }))
                );

            const row = new ActionRowBuilder().addComponents(menu);
            rows.push(row);
        });

        if (rows.length > this.MAX_TOTAL_ROWS)
            throw new Error(`Se excedieron las ${this.MAX_TOTAL_ROWS} filas permitidas`);

        return rows;
    }


}
