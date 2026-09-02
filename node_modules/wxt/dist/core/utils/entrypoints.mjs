import { normalizePath } from "./paths.mjs";
import path, { extname, relative, resolve } from "node:path";
//#region src/core/utils/entrypoints.ts
function getEntrypointName(entrypointsDir, inputPath) {
	return path.relative(entrypointsDir, inputPath).split(/[./\\]/, 2)[0];
}
function getEntrypointOutputFile(entrypoint, ext) {
	return resolve(entrypoint.outputDir, `${entrypoint.name}${ext}`);
}
/**
* Return's the entrypoint's output path relative to the output directory. Used
* for paths in the manifest and rollup's bundle.
*/
function getEntrypointBundlePath(entrypoint, outDir, ext) {
	return normalizePath(relative(outDir, getEntrypointOutputFile(entrypoint, ext)));
}
/** Given an entrypoint option, resolve it's value based on a target browser. */
function resolvePerBrowserOption(option, browser) {
	if (typeof option === "object" && !Array.isArray(option)) return option[browser];
	return option;
}
/**
* Given an entrypoint option, resolve it's value based on a target browser.
*
* DefaultIcon is special, it's the only key that's a record, which can confuse
* this function. So it's been manually excluded from resolution.
*/
function resolvePerBrowserOptions(options, browser) {
	return Object.fromEntries(Object.entries(options).map(([key, value]) => [key, key === "defaultIcon" ? value : resolvePerBrowserOption(value, browser)]));
}
/**
* Returns true when the entrypoint is an HTML entrypoint.
*
* Naively just checking the file extension of the input path.
*/
function isHtmlEntrypoint(entrypoint) {
	const ext = extname(entrypoint.inputPath);
	return [".html"].includes(ext);
}
/**
* Returns true when the entrypoint is a JS entrypoint.
*
* Naively just checking the file extension of the input path.
*/
function isJsEntrypoint(entrypoint) {
	const ext = extname(entrypoint.inputPath);
	return [
		".js",
		".jsx",
		".ts",
		".tsx"
	].includes(ext);
}
//#endregion
export { getEntrypointBundlePath, getEntrypointName, isHtmlEntrypoint, isJsEntrypoint, resolvePerBrowserOptions };
