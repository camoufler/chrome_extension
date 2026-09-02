import { wxt } from "../wxt.mjs";
import { relative } from "node:path";
//#region src/core/runners/manual.ts
/** The manual runner tells the user to load the unpacked extension manually. */
function createManualRunner() {
	return { async openBrowser() {
		wxt.logger.info(`Load "${relative(process.cwd(), wxt.config.outDir)}" as an unpacked extension manually`);
	} };
}
//#endregion
export { createManualRunner };
