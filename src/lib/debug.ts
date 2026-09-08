export const DEBUG = true;
export const DEBUG_VERBOSE = false;

export function debug(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[camoufler]', ...args);
  }
}

export function debugVerbose(...args: unknown[]): void {
  if (DEBUG && DEBUG_VERBOSE) {
    console.log('[camoufler]', ...args);
  }
}
