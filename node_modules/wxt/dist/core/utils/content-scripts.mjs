import { getEntrypointBundlePath } from "./entrypoints.mjs";
//#region src/core/utils/content-scripts.ts
/**
* Returns a unique and consistent string hash based on a content scripts
* options.
*
* It is able to recognize default values,
*/
function hashContentScriptOptions(options) {
	const simplifiedOptions = mapWxtOptionsToContentScript(options, void 0, void 0);
	Object.keys(simplifiedOptions).forEach((key) => {
		if (simplifiedOptions[key] == null) delete simplifiedOptions[key];
	});
	const withDefaults = {
		exclude_globs: [],
		exclude_matches: [],
		include_globs: [],
		match_about_blank: false,
		run_at: "document_idle",
		all_frames: false,
		match_origin_as_fallback: false,
		world: "ISOLATED",
		...simplifiedOptions
	};
	return JSON.stringify(Object.entries(withDefaults).map(([key, value]) => {
		if (Array.isArray(value)) return [key, value.sort()];
		else return [key, value];
	}).sort((l, r) => l[0].localeCompare(r[0])));
}
function mapWxtOptionsToContentScript(options, js, css) {
	return {
		matches: options.matches ?? [],
		all_frames: options.allFrames,
		match_about_blank: options.matchAboutBlank,
		exclude_globs: options.excludeGlobs,
		exclude_matches: options.excludeMatches,
		include_globs: options.includeGlobs,
		run_at: options.runAt,
		css,
		js,
		match_origin_as_fallback: options.matchOriginAsFallback,
		world: options.world
	};
}
function mapWxtOptionsToRegisteredContentScript(options, js, css) {
	return {
		allFrames: options.allFrames,
		excludeMatches: options.excludeMatches,
		matches: options.matches,
		runAt: options.runAt,
		js,
		css,
		world: options.world
	};
}
function getContentScriptJs(config, entrypoint) {
	return [getEntrypointBundlePath(entrypoint, config.outDir, ".js")];
}
//#endregion
export { getContentScriptJs, hashContentScriptOptions, mapWxtOptionsToContentScript, mapWxtOptionsToRegisteredContentScript };
