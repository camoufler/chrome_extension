import { normalizePath } from "../../../utils/paths.mjs";
import "../../../utils/index.mjs";
import { removeMainFunctionCode } from "../../../utils/transform.mjs";
import { resolve } from "node:path";
//#region src/core/builders/vite/plugins/removeEntrypointMainFunction.ts
/**
* Transforms entrypoints, removing the main function from the entrypoint if it
* exists.
*/
function removeEntrypointMainFunction(config, path) {
	const absPath = normalizePath(resolve(config.root, path));
	return {
		name: "wxt:remove-entrypoint-main-function",
		transform: {
			order: "pre",
			filter: { id: new RegExp(`^${absPath}$`) },
			handler(code) {
				const newCode = removeMainFunctionCode(code);
				config.logger.debug("transformed entrypoint", path);
				config.logger.debug(`Original:\n---\n${code}\n---`);
				config.logger.debug(`Transformed:\n---\n${newCode.code}\n---`);
				return newCode;
			}
		}
	};
}
//#endregion
export { removeEntrypointMainFunction };
