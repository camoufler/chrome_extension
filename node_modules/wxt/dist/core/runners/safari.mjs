import { wxt } from "../wxt.mjs";
import { relative } from "node:path";
//#region src/core/runners/safari.ts
/**
* The Safari runner just logs a warning message because `web-ext` doesn't work
* with Safari.
*/
function createSafariRunner() {
	return { async openBrowser() {
		wxt.logger.warn(`Cannot Safari using web-ext. Load "${relative(process.cwd(), wxt.config.outDir)}" as an unpacked extension manually`);
	} };
}
//#endregion
export { createSafariRunner };
