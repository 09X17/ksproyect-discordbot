import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (client) => {
    const commandsPath = join(__dirname, '../Commands/Prefix');
    
    try {
        const categories = readdirSync(commandsPath);
        let loadedCommands = 0;

        for (const category of categories) {
            const categoryPath = join(commandsPath, category);
            const commandFiles = readdirSync(categoryPath)
                .filter(file => file.endsWith('.js') && !file.startsWith('_'));

            for (const file of commandFiles) {
                try {
                    const filePath = join(categoryPath, file);
                    const fileUrl = new URL(`file://${filePath}`).href;
                    
                    const { default: CommandClass } = await import(fileUrl);
                    const command = new CommandClass();

                    // Validar comando
                    if (!command.name || typeof command.execute !== 'function') {
                        client.logger.warn(`Comando inválido: ${file}`);
                        continue;
                    }

                    // Registrar comando
                    client.commands.set(command.name.toLowerCase(), command);
                    
                    // Registrar aliases
                    command.aliases.forEach(alias => {
                        client.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
                    });

                    loadedCommands++;
                    client.logger.debug(`Comando cargado: ${command.name} (${category})`);

                } catch (error) {
                    client.logger.error(`Error cargando ${file}:`, error);
                }
            }
        }

        client.logger.success(`✅ ${loadedCommands} Comandos de prefijo cargados correctamente.`);
        
    } catch (error) {
        client.logger.error('Error en commandHandler:', error);
    }
};