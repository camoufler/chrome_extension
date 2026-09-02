import { tsconfigPaths } from "../core/builders/vite/plugins/tsconfigPaths.mjs";
import { globals } from "../core/builders/vite/plugins/globals.mjs";
import { extensionApiMock } from "../core/builders/vite/plugins/extensionApiMock.mjs";
import { resolveAppConfig } from "../core/builders/vite/plugins/resolveAppConfig.mjs";
import "../core/builders/vite/plugins/index.mjs";
import { registerWxt, wxt } from "../core/wxt.mjs";
import UnimportPlugin from "unimport/unplugin";
//#region src/testing/wxt-vitest-plugin.ts
/**
* Vite plugin that configures Vitest with everything required to test a WXT
* extension, based on the `<root>/wxt.config.ts`
*
* ```ts
* // vitest.config.ts
* import { defineConfig } from 'vitest/config';
* import { WxtVitest } from 'wxt/testing/vitest-plugin';
*
* export default defineConfig({
*   plugins: [WxtVitest()],
* });
* ```
*
* @param inlineConfig Customize WXT's config for testing. Any config specified
*   here overrides the config from your `wxt.config.ts` file.
*/
async function WxtVitest(inlineConfig) {
	await registerWxt("serve", inlineConfig ?? {});
	const plugins = [
		globals(wxt.config),
		tsconfigPaths(wxt.config),
		resolveAppConfig(wxt.config),
		extensionApiMock(wxt.config)
	];
	plugins.push(UnimportPlugin.vite(wxt.config.imports));
	return plugins;
}
//#endregion
export { WxtVitest };
