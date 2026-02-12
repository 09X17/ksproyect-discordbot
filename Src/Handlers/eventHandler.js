import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (client) => {
    const eventsPath = join(__dirname, '../Events');
    
    try {
        const eventFiles = readdirSync(eventsPath)
            .filter(file => file.endsWith('.js') && !file.startsWith('_'));

        for (const file of eventFiles) {
            try {
                const filePath = join(eventsPath, file);
                const fileUrl = new URL(`file://${filePath}`).href;
                
                const { default: event } = await import(fileUrl);
                
                if (!event.name || typeof event.execute !== 'function') {
                    client.logger.warn(`Evento inválido: ${file}`);
                    continue;
                }

                if (event.once) {
                    client.once(event.name, (...args) => event.execute(client, ...args));
                } else {
                    client.on(event.name, (...args) => event.execute(client, ...args));
                }

                client.logger.debug(`Evento cargado: ${event.name}`);

            } catch (error) {
                client.logger.error(`Error cargando evento ${file}:`, error.stack);
            }
        }

        client.logger.success(`✅ ${eventFiles.length} Eventos Cargados Correctamente.`);
        
    } catch (error) {
        client.logger.error('Error en eventHandler:', error);
    }
};