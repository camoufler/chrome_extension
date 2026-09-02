import { storage } from 'wxt/utils/storage';
import { DEFAULT_SETTINGS, type AppSettings } from './settings';

export const settingsStorage = storage.defineItem<AppSettings>('local:settings', {
  fallback: DEFAULT_SETTINGS,
});
