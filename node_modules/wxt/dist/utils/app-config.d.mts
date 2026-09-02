import { WxtAppConfig } from "./define-app-config.mjs";

//#region src/utils/app-config.d.ts
/**
 * Get runtime config defined in `<srcDir>/app.config.ts`
 *
 * @see https://wxt.dev/guide/essentials/config/runtime.html
 */
declare function getAppConfig(): WxtAppConfig;
/**
 * Alias for {@link getAppConfig}.
 *
 * @deprecated Use {@link getAppConfig} instead. Same function, different name.
 * @see https://wxt.dev/guide/essentials/config/runtime.html
 */
declare function useAppConfig(): WxtAppConfig;
//#endregion
export { getAppConfig, useAppConfig };