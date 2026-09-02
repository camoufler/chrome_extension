import { normalizePath } from "../../../utils/paths.mjs";
import "../../../utils/index.mjs";
import { virtualModuleNames } from "../../../utils/virtual-modules.mjs";
import { readFile } from "node:fs/promises";
import { resolve } from "path";
//#region src/core/builders/vite/plugins/resolveVirtualModules.ts
/**
* Resolve all the virtual modules to the `node_modules/wxt/dist/virtual`
* directory.
*/
function resolveVirtualModules(config) {
	return virtualModuleNames.map((name) => {
		const virtualId = `virtual:wxt-${name}?`;
		const resolvedVirtualId = "\0" + virtualId;
		return {
			name: `wxt:resolve-virtual-${name}`,
			resolveId: {
				filter: { id: new RegExp(virtualId) },
				handler(id) {
					return resolvedVirtualId + normalizePath(id.substring(id.indexOf(virtualId) + virtualId.length));
				}
			},
			load: {
				filter: { id: new RegExp(`^${resolvedVirtualId}`) },
				async handler(id) {
					const inputPath = id.replace(resolvedVirtualId, "");
					return (await readFile(resolve(config.wxtModuleDir, `dist/virtual/${name}.mjs`), "utf-8")).replace(`virtual:user-${name}`, inputPath);
				}
			}
		};
	});
}
//#endregion
export { resolveVirtualModules };
