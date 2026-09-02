import { WebExtConfig } from "../types.mjs";

//#region src/core/define-web-ext-config.d.ts
/**
 * Configure how [`web-ext`](https://github.com/mozilla/web-ext) starts the
 * browser during development.
 */
declare function defineWebExtConfig(config: WebExtConfig): WebExtConfig;
//#endregion
export { defineWebExtConfig };