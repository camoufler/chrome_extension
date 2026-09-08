export const DEFAULT_MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

export interface AppSettings {
  overlaysEnabled: boolean;
  webllmEnabled: boolean;
  modelId: string;
}

export interface OverlayPosition {
  right: number;
  bottom: number;
}

export type OverlayPositions = Record<string, Record<string, OverlayPosition>>;

export const DEFAULT_SETTINGS: AppSettings = {
  overlaysEnabled: true,
  webllmEnabled: false,
  modelId: DEFAULT_MODEL_ID,
};

export function normalizeSettings(settings: AppSettings): AppSettings {
  if (settings.modelId === DEFAULT_MODEL_ID) {
    return settings;
  }

  return {
    ...settings,
    modelId: DEFAULT_MODEL_ID,
    webllmEnabled: false,
  };
}
