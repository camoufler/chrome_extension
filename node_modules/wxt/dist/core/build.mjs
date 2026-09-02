import { registerWxt } from "./wxt.mjs";
import { internalBuild } from "./utils/building/internal-build.mjs";
import "./utils/building/index.mjs";
//#region src/core/build.ts
/**
* Bundles the extension for production. Returns a promise of the build result.
* Discovers the `wxt.config.ts` file in the root directory, and merges that
* config with what is passed in.
*
* @example
*   // Use config from `wxt.config.ts`
*   const res = await build();
*
*   // or override config `from wxt.config.ts`
*   const res = await build({
*     // Override config...
*   });
*/
async function build(config) {
	await registerWxt("build", config);
	return await internalBuild();
}
//#endregion
export { build };
