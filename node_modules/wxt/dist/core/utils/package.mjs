import { wxt } from "../wxt.mjs";
import { readJson } from "./fs.mjs";
import { resolve } from "node:path";
//#region src/core/utils/package.ts
/**
* Read the project's package.json.
*
* TODO: look in root and up directories until it's found
*/
async function getPackageJson() {
	const file = resolve(wxt.config.root, "package.json");
	try {
		return await readJson(file);
	} catch (err) {
		wxt.logger.debug(`Failed to read package.json at: ${file}. Returning undefined.`, err);
		return {};
	}
}
//#endregion
export { getPackageJson };
