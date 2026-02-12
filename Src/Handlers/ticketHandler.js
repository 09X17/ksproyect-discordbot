import TicketManager from '../Tickets/Managers/TicketManager.js';

export default async function ticketHandler(client) {
    try {
        // BANDERA GLOBAL PARA EVITAR MÚLTIPLES INICIALIZACIONES
        if (client._ticketManagerInitialized) {
            client.logger.info('📝 TicketManager ya inicializado');
            return;
        }

        // VERIFICAR DB
        if (!client.db) {
            client.logger.error('❌ DB no disponible para TicketManager');
            
            // Crear DB mínima
            client.db = {
                status: 0,
                models: {},
                isConnected: () => false
            };
        }

        // INICIALIZAR TICKET MANAGER
        const ticketManager = new TicketManager(client);
        await ticketManager.init();
        
        // ASIGNAR Y MARCAR COMO INICIALIZADO
        client.ticketManager = ticketManager;
        client._ticketManagerInitialized = true;
        
        client.logger.success('✅ TicketManager inicializado correctamente');
        
    } catch (error) {
        client.logger.error('❌ Error cargando TicketHandler:', error);
        
        // Intentar modo limitado
        if (!client.ticketManager && !client._ticketManagerInitialized) {
            try {
                client.ticketManager = new TicketManager(client);
                await client.ticketManager.init();
                client._ticketManagerInitialized = true;
                client.logger.warn('⚠️ TicketManager en modo limitado');
            } catch (emergencyError) {
                client.logger.error('💥 Error crítico en TicketManager:', emergencyError);
            }
        }
    }
}