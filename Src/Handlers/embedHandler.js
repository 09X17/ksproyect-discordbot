import EmbedManager from '../Embed/Managers/EmbedManager.js';
import EmbedRenderer from '../Embed/Managers/EmbedRenderer.js';
import EmbedComponentManager from '../Embed/Managers/EmbedComponentManager.js';
import EmbedInteractionRouter from '../Embed/Managers/EmbedInteractionRouter.js';
import EmbedEditorManager from '../Embed/Managers/EmbedEditorManager.js';

export default async function embedHandler(client) {

    try {

        // =====================================================
        // CORE
        // =====================================================

        const embedManager = new EmbedManager(client);
        embedManager.renderer = new EmbedRenderer();
        embedManager.componentManager = new EmbedComponentManager();

        // =====================================================
        // ROUTER
        // =====================================================

        const embedRouter = new EmbedInteractionRouter(
            client,
            embedManager
        );

        // =====================================================
        // EDITOR
        // =====================================================

        const embedEditorManager = new EmbedEditorManager(
            client,
            embedManager
        );

        // =====================================================
        // ATTACH TO CLIENT
        // =====================================================

        client.embedManager = embedManager;
        client.embedRouter = embedRouter;
        client.embedEditorManager = embedEditorManager;

        client.isEmbedSystemReady = () => {
            return !!client.embedManager &&
                   !!client.embedRouter &&
                   !!client.embedEditorManager;
        };

        client.logger?.info('✅ Embed System cargado correctamente.');

    } catch (error) {
        client.logger?.error('❌ Error cargando EmbedHandler:', error);
    }
}

export function isEmbedSystemReady(client) {
    return !!client.embedManager;
}
