export default class Event {
    constructor(options = {}) {
        this.name = options.name || null;
        this.once = options.once || false;
        this.enabled = options.enabled ?? true;
    }

    /**
     * Ejecuta el evento
     * @param {BotClient} client - Cliente del bot
     * @param {...any} args - Argumentos del evento
     */
    async execute(client, ...args) {
        throw new Error('Método execute() no implementado');
    }

    /**
     * Valida si el evento puede ejecutarse
     * @returns {boolean}
     */
    validate() {
        return this.enabled && this.name && typeof this.execute === 'function';
    }
}