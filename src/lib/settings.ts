export const DEFAULT_MODEL_ID = 'SmolLM2-1.7B-Instruct-q4f16_1-MLC';

export type ModeSelection = 'generalize' | 'removePpi' | 'both';

export interface AppSettings {
  overlaysEnabled: boolean;
  logoSize: number;
  webllmEnabled: boolean;
  modelId: string;
  modelName: string;
  modeSelection: ModeSelection;
}

export interface OverlayPosition {
  right: number;
  bottom: number;
}

export type OverlayPositions = Record<string, Record<string, OverlayPosition>>;

export const DEFAULT_SETTINGS: AppSettings = {
  overlaysEnabled: true,
  logoSize: 18,
  webllmEnabled: false,
  modelId: DEFAULT_MODEL_ID,
  modelName: DEFAULT_MODEL_ID,
  modeSelection: 'generalize',
};

export function normalizeSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const base = { ...DEFAULT_SETTINGS, ...(input ?? {}) };

  if (!base.modelName) {
    base.modelName = base.modelId ?? DEFAULT_MODEL_ID;
  }

  if (!['generalize', 'removePpi', 'both'].includes(base.modeSelection ?? 'generalize')) {
    base.modeSelection = 'generalize';
  }

  return base;
}

export const MIN_LOGO_SIZE = 12;
export const MAX_LOGO_SIZE = 28;
