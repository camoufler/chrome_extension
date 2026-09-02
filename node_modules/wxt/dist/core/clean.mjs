import { registerWxt, wxt } from "./wxt.mjs";
import { rm } from "node:fs/promises";
import { glob } from "tinyglobby";
import path from "node:path";
import { styleText } from "node:util";
//#region src/core/clean.ts
/**
* Remove generated/temp files from the directory.
*
* @example
*   await clean();
*
* @param config Optional config that will override your `<root>/wxt.config.ts`.
*/
async function clean(config) {
	await registerWxt("build", config);
	wxt.logger.info("Cleaning Project");
	const root = wxt.config.root;
	const tempDirs = [
		"node_modules/.vite",
		"node_modules/.cache",
		"{,**/}.wxt",
		`${path.relative(root, wxt.config.outBaseDir)}/*`
	];
	wxt.logger.debug("Looking for:", tempDirs.map((dir) => styleText("cyan", dir)).join(", "));
	const directories = await glob(tempDirs, {
		cwd: root,
		absolute: true,
		onlyDirectories: true,
		deep: 2,
		expandDirectories: false
	});
	if (directories.length === 0) {
		wxt.logger.debug("No generated files found.");
		return;
	}
	wxt.logger.debug("Found:", directories.map((dir) => styleText("cyan", path.relative(root, dir))).join(", "));
	for (const directory of directories) {
		await rm(directory, {
			force: true,
			recursive: true
		});
		wxt.logger.debug("Deleted " + styleText("cyan", path.relative(root, directory)));
	}
}
//#endregion
export { clean };
