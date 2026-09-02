import { wxt } from "../wxt.mjs";
import { formatDuration } from "../utils/time.mjs";
import defu from "defu";
import webExt from "web-ext";
import { consoleStream } from "web-ext/util/logger";
//#region src/core/runners/web-ext.ts
/** Create an `ExtensionRunner` backed by `web-ext`. */
function createWebExtRunner() {
	let runner;
	return {
		canOpen() {
			return true;
		},
		async openBrowser() {
			const startTime = Date.now();
			consoleStream.write = ({ level, msg, name }) => {
				if (level >= ERROR_LOG_LEVEL) wxt.logger.error(name, msg);
				if (level >= WARN_LOG_LEVEL) wxt.logger.warn(msg);
			};
			const wxtUserConfig = wxt.config.webExt.config;
			const finalConfig = {
				browserConsole: wxtUserConfig?.openConsole,
				devtools: wxtUserConfig?.openDevtools,
				startUrl: wxtUserConfig?.startUrls,
				keepProfileChanges: wxtUserConfig?.keepProfileChanges,
				chromiumPort: wxtUserConfig?.chromiumPort,
				...wxt.config.browser === "firefox" ? {
					firefox: wxtUserConfig?.binaries?.firefox,
					firefoxProfile: wxtUserConfig?.firefoxProfile,
					pref: wxtUserConfig?.firefoxPref,
					args: wxtUserConfig?.firefoxArgs
				} : {
					chromiumBinary: wxtUserConfig?.binaries?.[wxt.config.browser],
					chromiumProfile: wxtUserConfig?.chromiumProfile,
					chromiumPref: defu(wxtUserConfig?.chromiumPref, DEFAULT_CHROMIUM_PREFS),
					args: ["--unsafely-disable-devtools-self-xss-warnings", ...wxtUserConfig?.chromiumArgs ?? []]
				},
				target: wxt.config.browser === "firefox" ? "firefox-desktop" : "chromium",
				sourceDir: wxt.config.outDir,
				noReloadManagerExtension: true,
				noReload: true,
				noInput: true
			};
			const options = { shouldExitProgram: false };
			wxt.logger.debug("web-ext config:", finalConfig);
			wxt.logger.debug("web-ext options:", options);
			runner = await webExt.cmd.run(finalConfig, options);
			const duration = Date.now() - startTime;
			wxt.logger.success(`Opened browser in ${formatDuration(duration)}`);
		},
		async closeBrowser() {
			await runner?.exit();
		}
	};
}
const WARN_LOG_LEVEL = 40;
const ERROR_LOG_LEVEL = 50;
const DEFAULT_CHROMIUM_PREFS = { devtools: { synced_preferences_sync_disabled: {
	skipContentScripts: false,
	"skip-content-scripts": false
} } };
//#endregion
export { createWebExtRunner };
