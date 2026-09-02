import { registerWxt, wxt } from "./wxt.mjs";
import { findEntrypoints } from "./utils/building/find-entrypoints.mjs";
import { generateWxtDir } from "./generate-wxt-dir.mjs";
import "./utils/building/index.mjs";
//#region src/core/prepare.ts
async function prepare(config) {
	await registerWxt("build", config);
	wxt.logger.info("Generating types...");
	await generateWxtDir(await findEntrypoints());
}
//#endregion
export { prepare };
