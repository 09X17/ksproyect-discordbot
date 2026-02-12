import { SlashCommandBuilder } from 'discord.js';
import SlashCommand from '../../../Structures/SlashCommand.js';

export default class PingCommand extends SlashCommand {
    constructor() {
        super({
            data: new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Muestra la latencia del bot'),
            cooldown: 5,
            category: 'utilidad'
        });
    }

    async execute(client, interaction) {
        const latency = Date.now() - interaction.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);

        await interaction.reply({
            content: `🏓 Pong!\n• Latencia: ${latency}ms\n• API: ${apiLatency}ms`,
            flags: 64
        });
    }
}
