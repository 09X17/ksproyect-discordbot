import 'dotenv/config';
import KClient from './Src/Structures/KClient.js';

process.on('SIGINT', () => client.shutdown());
process.on('SIGTERM', () => client.shutdown());

const client = new KClient();

process.on('unhandledRejection', (error) => {
    client.logger.error('Unhandled Rejection:', error.stack);
});

process.on('uncaughtException', (error) => {
    client.logger.error('Uncaught Exception:', error.stack);
    client.shutdown();
});

client.initialize().catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
});