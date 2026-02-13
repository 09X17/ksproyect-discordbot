

export default {
    name: 'clientReady',
    once: false,
    async execute(client) {

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
                await client.levelManager.questManager?.resetDailyQuests?.();
            } catch (error) {
                console.error('Error en tareas automáticas:', error);
            }
        }, 300000); 


    }
};