export default {
    token: process.env.DISCORD_TOKEN,
    prefix: process.env.BOT_PREFIX || 'k!',
    
    owners: process.env.BOT_OWNERS?.split(',').filter(id => id.trim()) || [],
    developers: process.env.BOT_DEVELOPERS?.split(',').filter(id => id.trim()) || [],
    
    environment: process.env.NODE_ENV || 'development',
    devGuildId: process.env.DEV_GUILD_ID,
    
    database: {
        url: process.env.DATABASE_URL,
    },
    
    bot: {
        status: process.env.BOT_STATUS || 'online',
        color: process.env.BOT_COLOR || '#5865F2'
    },
    colors: {
        primary: process.env.BOT_COLOR || '#5865F2',
        success: '#57F287',
        warning: '#FEE75C',
        error: '#ED4245',
        info: '#EB459E',
        random: () => {
            const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
    },
    
    emojis: {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        loading: '⏳',
        arrow: '➜',
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        offline: '⚫'
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: process.env.LOG_FILE || 'bot.log',
        channel: process.env.LOG_CHANNEL_ID
    }
};