export default class Event {
    constructor(options = {}) {
        this.name = options.name || null;
        this.once = options.once || false;
        this.enabled = options.enabled ?? true;
    }

    async execute(client, ...args) {
        throw new Error('Método execute() no implementado');
    }

    validate() {
        return this.enabled && this.name && typeof this.execute === 'function';
    }
}