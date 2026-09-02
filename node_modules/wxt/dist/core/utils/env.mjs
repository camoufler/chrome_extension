import { expand } from "dotenv-expand";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
//#region src/core/utils/env.ts
/** Returns true when running in a CI environment. */
function isCI() {
	return !!process.env.CI && process.env.CI !== "false";
}
/** Load environment files based on the current mode and browser. */
function loadEnv(mode, browser) {
	const envFiles = [
		`.env`,
		`.env.local`,
		`.env.${mode}`,
		`.env.${mode}.local`,
		`.env.${browser}`,
		`.env.${browser}.local`,
		`.env.${mode}.${browser}`,
		`.env.${mode}.${browser}.local`
	];
	const parsed = Object.fromEntries(envFiles.flatMap((filePath) => {
		if (!existsSync(filePath)) return [];
		try {
			const parsedEnv = parseEnv(readFileSync(filePath, "utf-8"));
			return Object.entries(parsedEnv);
		} catch {
			return [];
		}
	}));
	expand({ parsed });
	return parsed;
}
//#endregion
export { isCI, loadEnv };
