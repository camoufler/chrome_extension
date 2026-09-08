import type { AppConfig, MLCEngineConfig } from '@mlc-ai/web-llm';
import { DEFAULT_MODEL_ID } from './settings';

export const BUNDLED_MODEL_ID = DEFAULT_MODEL_ID;
export const BUNDLED_MODEL_DIR = `models/${BUNDLED_MODEL_ID}`;
export const BUNDLED_MODEL_LIB = 'Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm';

export function getBundledAppConfig(): AppConfig {
  return {
    cacheBackend: 'indexeddb',
    model_list: [
      {
        model: getExtensionUrl(`/${BUNDLED_MODEL_DIR}/resolve/main/`),
        model_id: BUNDLED_MODEL_ID,
        model_lib: getExtensionUrl(`/models/libs/${BUNDLED_MODEL_LIB}`),
        low_resource_required: true,
        vram_required_MB: 1629.75,
        overrides: {
          context_window_size: 4096,
        },
      },
    ],
  };
}

export function getBundledEngineConfig(
  initProgressCallback?: MLCEngineConfig['initProgressCallback'],
): MLCEngineConfig {
  return {
    appConfig: getBundledAppConfig(),
    initProgressCallback,
  };
}

function getExtensionUrl(path: string): string {
  const runtime = (globalThis as typeof globalThis & {
    chrome?: { runtime?: { getURL: (resourcePath: string) => string } };
  }).chrome?.runtime;

  if (!runtime) {
    throw new Error('Extension runtime is unavailable.');
  }

  return runtime.getURL(path);
}
