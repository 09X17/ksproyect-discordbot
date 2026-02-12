import mongoose from 'mongoose';
import settings from '../Config/Settings.js';

export default class Database {
    constructor(client) {
        this.client = client;
        this.connection = null;
        this._hasLoggedConnection = false;
    }

    async connect() {
        try {
            if (this.status === 1) {
                return;
            }

            this.connection = await mongoose.connect(settings.database.url);

            if (!this._hasLoggedConnection) {
                this.client.logger.success('✅ Conectado a la base de datos');
                this._hasLoggedConnection = true;
            }
            
            this.setupEventListeners();
            
        } catch (error) {
            this.client.logger.error('❌ Error conectando a la base de datos:', error);
            throw error;
        }
    }

    setupEventListeners() {
        if (this._listenersSetup) return;
        
        mongoose.connection.on('error', (error) => {
            this.client.logger.error('Error de base de datos:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.client.logger.warn('Desconectado de la base de datos');
            this._hasLoggedConnection = false;
        });

        mongoose.connection.on('reconnected', () => {
            this.client.logger.success('🔄 Reconectado a la base de datos');
            this._hasLoggedConnection = true;
        });

        this._listenersSetup = true;
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            this.client.logger.info('🔌 Desconectado de la base de datos');
            this._hasLoggedConnection = false;
        } catch (error) {
            this.client.logger.error('Error desconectando de la base de datos:', error);
        }
    }

    get status() {
        return mongoose.connection?.readyState || 0;
    }

    get models() {
        return mongoose.models;
    }

    isConnected() {
        return this.status === 1;
    }
}