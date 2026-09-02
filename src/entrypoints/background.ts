import { ExtensionServiceWorkerMLCEngineHandler } from '@mlc-ai/web-llm';
import { WEBLLM_PORT_NAME } from '@/lib/webllm';

export default defineBackground(() => {
  let handler: ExtensionServiceWorkerMLCEngineHandler | undefined;

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== WEBLLM_PORT_NAME) {
      return;
    }

    if (!handler) {
      handler = new ExtensionServiceWorkerMLCEngineHandler(port);
    } else {
      handler.setPort(port);
    }

    port.onMessage.addListener(handler.onmessage.bind(handler));
  });
});
