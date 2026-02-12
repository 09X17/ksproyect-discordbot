import mongoose from 'mongoose';
import settings from '../Config/Settings.js';

export default class Database {
    constructor(client) {
        this.client = client;
        this.connection = null;
        this._hasLoggedConnection = false;
    }

    /**
     * Conectar a la base de datos
     */
    async connect() {
        try {
            // VERIFICAR SI YA ESTÁ CONECTADO
            if (this.status === 1) {
           //     this.client.logger.info('📊 Database ya conectada');
                return;
            }

            this.connection = await mongoose.connect(settings.database.url);
            
            // SOLO LOGUEAR UNA VEZ
            if (!this._hasLoggedConnection) {
                this.client.logger.success('✅ Conectado a la base de datos');
                this._hasLoggedConnection = true;
            }
            
            // Configurar eventos (una sola vez)
            this.setupEventListeners();
            
        } catch (error) {
            this.client.logger.error('❌ Error conectando a la base de datos:', error);
            throw error;
        }
    }

    /**
     * Configurar event listeners (solo una vez)
     */
    setupEventListeners() {
        // Verificar si ya tenemos listeners
        if (this._listenersSetup) return;
        
        mongoose.connection.on('error', (error) => {
            this.client.logger.error('Error de base de datos:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.client.logger.warn('Desconectado de la base de datos');
            this._hasLoggedConnection = false; // Resetear para reconexión
        });

        mongoose.connection.on('reconnected', () => {
            this.client.logger.success('🔄 Reconectado a la base de datos');
            this._hasLoggedConnection = true;
        });

        this._listenersSetup = true;
    }

    /**
     * Desconectar de la base de datos
     */
    async disconnect() {
        try {
            await mongoose.disconnect();
            this.client.logger.info('🔌 Desconectado de la base de datos');
            this._hasLoggedConnection = false;
        } catch (error) {
            this.client.logger.error('Error desconectando de la base de datos:', error);
        }
    }

    /**
     * Verificar estado de la conexión
     */
    get status() {
        return mongoose.connection?.readyState || 0;
    }

    /**
     * Obtener modelos
     */
    get models() {
        return mongoose.models;
    }

    /**
     * Verificar si está conectado
     */
    isConnected() {
        return this.status === 1;
    }
}