import Ticket from '../Tickets/Models/Ticket.js';
import GuildConfig from '../Tickets/Models/GuildConfig.js';

export default async (client) => {
    try {
        // VERIFICAR MÁS ESTRICTAMENTE
        if (client.db && client.db.status === 1) {
            client.logger.info('📊 Database ya conectada, omitiendo');
            return;
        }

        // MODO SIN CONEXIÓN
        if (!process.env.DATABASE_URL && !settings?.database?.url) {
            client.logger.warn('⚠️ No hay URL de base de datos configurada');
            
            if (!client.db) {
                client.db = {
                    status: 0,
                    connect: () => {
                        client.logger.warn('📝 DB no configurada - Modo sin conexión');
                        return Promise.resolve();
                    },
                    disconnect: () => Promise.resolve(),
                    models: { Ticket, GuildConfig },
                    isConnected: () => false
                };
            }
            return;
        }

        // IMPORTAR Y CREAR DB (SOLO UNA VEZ)
        if (!client.db) {
            const Database = (await import('../Structures/Database.js')).default;
            client.db = new Database(client);
        }

        // CONECTAR (si no está conectado)
        if (!client.db.isConnected()) {
            await client.db.connect();
            
            // Registrar modelos
            if (!client.db.models) {
                client.db.models = {};
            }
            client.db.models.Ticket = Ticket;
            client.db.models.GuildConfig = GuildConfig;
        }

        // NO PONER LOG AQUÍ - ya lo hace Database.js
        
    } catch (error) {
        client.logger.error('❌ Error en DatabaseHandler:', error);
        
        // Crear DB de emergencia si no existe
        if (!client.db) {
            client.db = {
                status: 0,
                connect: () => Promise.resolve(),
                disconnect: () => Promise.resolve(),
                models: { Ticket, GuildConfig },
                isConnected: () => false
            };
            client.logger.warn('📝 Usando DB en modo de emergencia');
        }
    }
};