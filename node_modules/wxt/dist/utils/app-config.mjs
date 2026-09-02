import appConfig from "virtual:app-config";
//#region src/utils/app-config.ts
/** @module wxt/utils/app-config */
/**
* Get runtime config defined in `<srcDir>/app.config.ts`
*
* @see https://wxt.dev/guide/essentials/config/runtime.html
*/
function getAppConfig() {
	return appConfig;
}
/**
* Alias for {@link getAppConfig}.
*
* @deprecated Use {@link getAppConfig} instead. Same function, different name.
* @see https://wxt.dev/guide/essentials/config/runtime.html
*/
function useAppConfig() {
	if (import.meta.env.DEV) console.warn("[wxt] `useAppConfig` is deprecated. Please use `getAppConfig` instead.");
	return getAppConfig();
}
//#endregion
export { getAppConfig, useAppConfig };
