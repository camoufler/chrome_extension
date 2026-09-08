import { ExtensionServiceWorkerMLCEngineHandler } from '@mlc-ai/web-llm';
import { debug, debugVerbose } from '@/lib/debug';
import { WEBLLM_PORT_NAME } from '@/lib/webllm';

export default defineBackground(() => {
  const handlers = new Map();

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WEBLLM_PORT_NAME) {
      debugVerbose('background: ignored port', port.name);
      return;
    }

    const handler = new ExtensionServiceWorkerMLCEngineHandler(port);
    handlers.set(port, handler);
    debug('background: webllm port connected', { handlers: handlers.size });

    port.onMessage.addListener(handler.onmessage.bind(handler));
    port.onDisconnect.addListener(() => {
      handlers.delete(port);
      debug('background: webllm port disconnected', { handlers: handlers.size });
    });
  });
});
