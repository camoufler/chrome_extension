export const DEFAULT_MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

export interface AppSettings {
  overlaysEnabled: boolean;
  logoSize: number;
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
  logoSize: 18,
  webllmEnabled: false,
  modelId: DEFAULT_MODEL_ID,
};

export const MIN_LOGO_SIZE = 12;
export const MAX_LOGO_SIZE = 28;
