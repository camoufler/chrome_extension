import { writeFileIfDifferent } from "./fs.mjs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "path";
//#region src/core/utils/cache.ts
/**
* A basic file system cache stored at `<srcDir>/.wxt/cache/<key>`. Just caches
* a string in a file for the given key.
*
* @param srcDir Absolute path to source directory. See `InternalConfig.srcDir`
*/
function createFsCache(wxtDir) {
	const getPath = (key) => resolve(wxtDir, "cache", encodeURIComponent(key));
	return {
		async set(key, value) {
			const path = getPath(key);
			await mkdir(dirname(path), { recursive: true });
			await writeFileIfDifferent(path, value);
		},
		async get(key) {
			const path = getPath(key);
			try {
				return await readFile(path, "utf-8");
			} catch {
				return;
			}
		}
	};
}
//#endregion
export { createFsCache };
