import { storage } from 'wxt/utils/storage';
import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type OverlayPositions,
} from './settings';

export const settingsStorage = storage.defineItem<AppSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});

export const overlayPositionsStorage = storage.defineItem<OverlayPositions>(
  'local:overlayPositions',
  {
    fallback: {},
  },
);
