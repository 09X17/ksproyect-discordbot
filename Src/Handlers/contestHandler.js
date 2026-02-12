import ContestManager from '../Contest/Managers/ContestManager.js';

export default async function contestHandler(client) {
    try {
        // Solo inicializar el manager
        client.contestManager = new ContestManager(client);
        
    } catch (error) {
        console.error('❌ Error cargando ContestManager:', error);
    }
}

// Solo una función helper que realmente necesites
export async function isContestChannel(client, guildId, channelId) {
    try {
        if (!client.contestManager) return false;
        
        const contestChannel = await client.contestManager.getContestChannel(guildId, channelId);
        return !!contestChannel && contestChannel.isActive;
        
    } catch (error) {
        return false;
    }
}