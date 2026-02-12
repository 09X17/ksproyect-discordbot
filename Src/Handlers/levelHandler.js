import LevelManager from '../LevelSystem/Managers/LevelManager.js';

export default async function levelHandler(client) {
    try {
        client.levelManager = new LevelManager(client);
        client.isLevelManagerReady = () => {
            return !!client.levelManager && 
                   client.levelManager.constructor.name === 'LevelManager' &&
                   typeof client.levelManager.handleVoiceStateUpdate === 'function';
        };
        
        setInterval(() => {
            if (client.levelManager.cleanupExpiredSessions) {
                client.levelManager.cleanupExpiredSessions();
            }
        }, 5 * 60 * 1000); 
    } catch (error) {
        client.logger.error('❌ Error cargando LevelHandler:', error);
    }
}

export function isLevelManagerReady(client) {
    return !!client.levelManager;
}