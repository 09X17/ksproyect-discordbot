import { startTwitchAlerts } from "../Structures/twitchAlert.js";

export default {
    name: 'clientReady',
    once: false,
    async execute(client) {

        startTwitchAlerts(client);

        const stats = client.getStats();
        client.user.setActivity({
            name: `${client.config.prefix}help | ${stats.guilds} servidores`,
            type: 'WATCHING'
        });

        if (process.env.STATS_CHANNEL) {
            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Reiniciado')
                .setColor('#5865F2')
                .addFields(
                    { name: '🆔 Bot', value: client.user.tag, inline: true },
                    { name: '🌐 Servidores', value: stats.guilds.toString(), inline: true },
                    { name: '👥 Usuarios', value: stats.users.toString(), inline: true },
                    { name: '📦 Comandos', value: stats.commands.total.toString(), inline: true },
                    { name: '⏰ Uptime', value: stats.uptime, inline: true }
                )
                .setTimestamp();

            client.logToChannel({ embeds: [embed] }, process.env.STATS_CHANNEL);
        }

        setInterval(async () => {
            try {
                // 1. Reset diario de misiones (a las 00:00)
                await client.levelManager.questManager?.resetDailyQuests?.();

                // 2. Finalizar duelos expirados
                await client.levelManager.pvpManager?.cleanupExpiredDuels?.();

                // 3. Actualizar estadísticas de clanes
                await client.levelManager.clanManager?.updateClanStats?.();
            } catch (error) {
                console.error('Error en tareas automáticas:', error);
            }
        }, 300000); // Cada 5 minutos


    }
};