import { ButtonStyle } from 'discord.js';

export default class EmbedComponentManager {

    constructor() {
        this.MAX_TOTAL_BUTTONS = 25;
        this.MAX_BUTTONS_PER_ROW = 5;
        this.MAX_TOTAL_ROWS = 5;
        this.MAX_SELECTS = 5;
        this.MAX_SELECT_OPTIONS = 25;
    }

    // =====================================================
    // BUTTON MANAGEMENT
    // =====================================================

    addButton(template, buttonData) {

        if (!template.components)
            template.components = {};

        if (!template.components.buttons)
            template.components.buttons = [];

        const buttons = template.components.buttons;

        if (buttons.length >= this.MAX_TOTAL_BUTTONS)
            throw new Error(`Máximo ${this.MAX_TOTAL_BUTTONS} botones permitidos`);

        const validated = this.#validateButton(buttonData);

        buttons.push(validated);
        this.#validateRowLimits(template);

        return template;
    }

    updateButton(template, index, newData) {

        const buttons = template.components?.buttons;

        if (!buttons || !buttons[index])
            throw new Error('Botón no encontrado');

        const validated = this.#validateButton({
            ...buttons[index],
            ...newData
        });

        buttons[index] = validated;
        this.#validateRowLimits(template);

        return template;
    }

    removeButton(template, index) {

        const buttons = template.components?.buttons;

        if (!buttons || !buttons[index])
            throw new Error('Botón no encontrado');

        buttons.splice(index, 1);
        return template;
    }

    clearButtons(template) {
        if (template.components?.buttons)
            template.components.buttons = [];

        return template;
    }

    // =====================================================
    // SELECT MANAGEMENT
    // =====================================================

    addSelect(template, selectData) {

        if (!template.components)
            template.components = {};

        if (!template.components.selects)
            template.components.selects = [];

        const selects = template.components.selects;

        if (selects.length >= this.MAX_SELECTS)
            throw new Error(`Máximo ${this.MAX_SELECTS} selects permitidos`);

        const validated = this.#validateSelect(selectData);

        selects.push(validated);
        this.#validateRowLimits(template);

        return template;
    }

    updateSelect(template, index, newData) {

        const selects = template.components?.selects;

        if (!selects || !selects[index])
            throw new Error('Select no encontrado');

        const validated = this.#validateSelect({
            ...selects[index],
            ...newData
        });

        selects[index] = validated;
        this.#validateRowLimits(template);

        return template;
    }

    removeSelect(template, index) {

        const selects = template.components?.selects;

        if (!selects || !selects[index])
            throw new Error('Select no encontrado');

        selects.splice(index, 1);
        return template;
    }

    clearSelects(template) {
        if (template.components?.selects)
            template.components.selects = [];

        return template;
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    #validateButton(data) {

        if (!data.label)
            throw new Error('El botón requiere label');

        if (data.label.length > 80)
            throw new Error('Label no puede superar 80 caracteres');

        const style = this.#resolveButtonStyle(data.style);

        if (data.type === 'link') {

            if (!data.url)
                throw new Error('Botón tipo link requiere URL');

            if (!this.#isValidURL(data.url))
                throw new Error('URL inválida');

            return {
                type: 'link',
                label: data.label,
                style: ButtonStyle.Link,
                url: data.url,
                emoji: data.emoji || null,
                disabled: Boolean(data.disabled)
            };
        }

        // ACTION BUTTON

        if (!data.action)
            throw new Error('Botón action requiere propiedad "action"');

        return {
            type: 'action',
            label: data.label,
            style,
            emoji: data.emoji || null,
            disabled: Boolean(data.disabled),

            action: data.action,

            permissions: data.permissions || {},
            limits: data.limits || {},

            usage: {
                totalUses: 0,
                users: []
            }
        };
    }

    #validateSelect(data) {

        if (!data.options || !Array.isArray(data.options))
            throw new Error('Select requiere opciones');

        if (data.options.length === 0)
            throw new Error('Select necesita al menos 1 opción');

        if (data.options.length > this.MAX_SELECT_OPTIONS)
            throw new Error(`Máximo ${this.MAX_SELECT_OPTIONS} opciones`);

        const validatedOptions = data.options.map(opt => {

            if (!opt.label || !opt.value)
                throw new Error('Cada opción requiere label y value');

            if (opt.label.length > 100)
                throw new Error('Label de opción demasiado largo');

            if (opt.value.length > 100)
                throw new Error('Value de opción demasiado largo');

            return {
                label: opt.label,
                value: opt.value,
                description: opt.description || null,
                emoji: opt.emoji || null
            };
        });

        return {
            placeholder: data.placeholder || 'Selecciona una opción',
            minValues: data.minValues || 1,
            maxValues: data.maxValues || 1,
            options: validatedOptions,
            disabled: Boolean(data.disabled),

            action: data.action || null,
            permissions: data.permissions || {},
            limits: data.limits || {},

            usage: {
                totalUses: 0,
                users: []
            }
        };
    }

    #resolveButtonStyle(style) {

        if (!style) return ButtonStyle.Primary;

        if (typeof style === 'number')
            return style;

        if (ButtonStyle[style])
            return ButtonStyle[style];

        return ButtonStyle.Primary;
    }

    #validateRowLimits(template) {

        const totalButtons = template.components?.buttons?.length || 0;
        const totalSelects = template.components?.selects?.length || 0;

        const buttonRows =
            Math.ceil(totalButtons / this.MAX_BUTTONS_PER_ROW);

        const totalRows = buttonRows + totalSelects;

        if (totalRows > this.MAX_TOTAL_ROWS)
            throw new Error(`Máximo ${this.MAX_TOTAL_ROWS} filas permitidas`);
    }

    #isValidURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

}
