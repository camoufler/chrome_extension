import { createEnvironment } from "./environment.mjs";
import { getBrowserEnvironmentGlobals } from "./browser-environment.mjs";
import { fakeBrowser } from "@webext-core/fake-browser";
//#region src/core/utils/environments/extension-environment.ts
function createExtensionEnvironment() {
	return createEnvironment(getExtensionEnvironmentGlobals);
}
function getExtensionEnvironmentGlobals() {
	return {
		...getBrowserEnvironmentGlobals(),
		chrome: fakeBrowser,
		browser: fakeBrowser
	};
}
//#endregion
export { createExtensionEnvironment, getExtensionEnvironmentGlobals };
