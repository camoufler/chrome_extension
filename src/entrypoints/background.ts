import { ExtensionServiceWorkerMLCEngineHandler } from '@mlc-ai/web-llm';
import { WEBLLM_PORT_NAME } from '@/lib/webllm';

export default defineBackground(() => {
  const handlers = new Map();

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WEBLLM_PORT_NAME) {
      return;
    }

    const handler = new ExtensionServiceWorkerMLCEngineHandler(port);
    handlers.set(port, handler);

    port.onMessage.addListener(handler.onmessage.bind(handler));
    port.onDisconnect.addListener(() => {
      handlers.delete(port);
    });
  });
});
