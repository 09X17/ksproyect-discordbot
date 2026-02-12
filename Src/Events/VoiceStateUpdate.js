export default {
    name: 'voiceStateUpdate',
    once: false,

    async execute(client, oldState, newState) {
        try {

            if (client.levelManager) {
                await client.levelManager.handleVoiceStateUpdate(oldState, newState);
                await client.levelManager.questManager.processVoice(oldState, newState);

            } else {

            }


        } catch (error) {
            client.logger.error('Error en evento VoiceStateUpdate:', error);
        }
    }
};