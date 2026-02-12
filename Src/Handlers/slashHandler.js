import fs, { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default async (client) => {
    const slashPath = join(__dirname, '../Commands/Slash');

    try {
        const categories = readdirSync(slashPath);
        const slashCommands = [];
        let loadedCommands = 0;

        for (const category of categories) {
            const categoryPath = join(slashPath, category);

            try {
                const stat = await fs.promises.stat(categoryPath);
                if (!stat.isDirectory()) continue;
            } catch {
                continue;
            }

            const commandFiles = readdirSync(categoryPath)
                .filter(file => file.endsWith('.js') && !file.startsWith('_'));

            for (const file of commandFiles) {
                try {
                    const filePath = join(categoryPath, file);
                    const fileUrl = new URL(`file://${filePath}`).href;

                    const { default: SlashCommandClass } = await import(fileUrl);

                    // Validar que sea una clase de SlashCommand
                    if (typeof SlashCommandClass !== 'function') {
                        client.logger.warn(`Slash command inválido (no es clase): ${file}`);
                        continue;
                    }

                    const command = new SlashCommandClass();

                    // Validar estructura
                    if (!command.data || !command.data.name || typeof command.execute !== 'function') {
                        client.logger.warn(`Slash command inválido: ${file}`);
                        continue;
                    }

                    // Registrar comando
                    client.slashCommands.set(command.data.name, command);
                    slashCommands.push(command.toJSON());

                    loadedCommands++;
                    client.logger.debug(`✅ Slash command cargado: ${command.data.name} (${category})`);

                } catch (error) {
                    client.logger.error(`❌ Error cargando slash command ${file}:`, error);
                }
            }
        }

        // Registrar comandos en Discord
        if (slashCommands.length > 0) {
            client.once('clientReady', async () => {
                await registerSlashCommands(client, slashCommands);
            });
        }

        client.logger.success(`✅ ${loadedCommands} Slash commands cargados correctamente.`);

    } catch (error) {
        client.logger.error('❌ Error en slashHandler:', error);
    }
};

async function registerSlashCommands(client, commands) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {

        const data = await rest.put(
            process.env.NODE_ENV === 'development' && process.env.DEV_GUILD_ID
                ? Routes.applicationGuildCommands(client.user.id, process.env.DEV_GUILD_ID)
                : Routes.applicationCommands(client.user.id),
            { body: commands }
        );

      //  client.logger.success(`✅ ${data.length} Slash commands registrados correctamente.`);

    } catch (error) {
        client.logger.error('❌ Error registrando slash commands:', error);
    }
}

export async function handleSlashCommand(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);
    if (!command) {
        return interaction.reply({
            content: '❌ Este comando no está disponible',
            flags: 64
        });
    }

    // Ejecutar el comando con el método run que incluye validaciones
    await command.run(client, interaction);
}