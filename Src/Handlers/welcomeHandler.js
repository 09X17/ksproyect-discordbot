import WelcomeManager from '../WelcomeSystem/Managers/WelcomeManager.js';

export default async function welcomeHandler(client) {
    try {
        // Solo inicializar el manager
        client.welcomeManager = new WelcomeManager(client);
        
    } catch (error) {
        console.error('Error en WelcomeHandler:', error);
    }
}