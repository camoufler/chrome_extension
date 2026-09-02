import { pathExists } from "../../../utils/fs.mjs";
import { resolve } from "node:path";
//#region src/core/builders/vite/plugins/resolveAppConfig.ts
/**
* When importing `virtual:app-config`, resolve it to the `app.config.ts` file
* in the project.
*/
function resolveAppConfig(config) {
	const virtualModuleId = "virtual:app-config";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;
	const appConfigFile = resolve(config.srcDir, "app.config.ts");
	return {
		name: "wxt:resolve-app-config",
		config() {
			return { optimizeDeps: { exclude: [virtualModuleId] } };
		},
		resolveId: {
			filter: { id: new RegExp(`^${virtualModuleId}$`) },
			async handler() {
				return await pathExists(appConfigFile) ? appConfigFile : resolvedVirtualModuleId;
			}
		},
		load: {
			filter: { id: new RegExp(`^${resolvedVirtualModuleId}$`) },
			handler() {
				return `export default {}`;
			}
		}
	};
}
//#endregion
export { resolveAppConfig };
