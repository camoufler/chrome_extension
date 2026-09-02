import { wxt } from "../wxt.mjs";
import { relative } from "node:path";
//#region src/core/runners/wsl.ts
/**
* The WSL runner just logs a warning message because `web-ext` doesn't work in
* WSL.
*/
function createWslRunner() {
	return { async openBrowser() {
		wxt.logger.warn(`Cannot open browser when using WSL. Load "${relative(process.cwd(), wxt.config.outDir)}" as an unpacked extension manually`);
	} };
}
//#endregion
export { createWslRunner };
