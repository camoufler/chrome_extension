//#region src/utils/define-app-config.d.ts
/** @module wxt/utils/define-app-config */
interface WxtAppConfig {}
/**
 * Runtime app config defined in `<srcDir>/app.config.ts`.
 *
 * You can add fields to this interface via ["Module
 * Augmentation"](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation):
 *
 * ```ts
 * // app.config.ts
 * import 'wxt/utils/define-app-config';
 *
 * declare module 'wxt/utils/define-app-config' {
 *   export interface WxtAppConfig {
 *     analytics: AnalyticsConfig;
 *   }
 * }
 * ```
 */
declare function defineAppConfig(config: WxtAppConfig): WxtAppConfig;
//#endregion
export { WxtAppConfig, defineAppConfig };