import { normalizePath } from "../paths.mjs";
import { every, some } from "../arrays.mjs";
import { wxt } from "../../wxt.mjs";
//#region src/core/utils/building/detect-dev-changes.ts
/**
* Compare the changed files vs the build output and determine what kind of
* reload needs to happen:
*
* - Do nothing
*
*   - CSS or JS file associated with an HTML page is changed - this is handled
*       automatically by the dev server
*   - Change isn't used by any of the entrypoints
* - Reload Content script
*
*   - CSS or JS file associated with a content script
*   - Background script will be told to reload the content script
* - Reload HTML file
*
*   - HTML file itself is saved - HMR doesn't handle this because the HTML pages
*       are pre-rendered
*   - Chrome is OK reloading the page when the HTML file is changed without
*       reloading the whole extension. Not sure about firefox, this might need
*       to change to an extension reload
* - Reload extension
*
*   - Background script is changed
*   - Manifest is different
* - Restart browser
*
*   - Web-ext.config.ts (runner config changes)
* - Full dev server restart
*
*   - Wxt.config.ts (main config file)
*   - Modules/* (any file related to WXT modules)
*   - .env (environment variable changed could effect build)
*/
function detectDevChanges(changedFiles, currentOutput) {
	const relevantChangedFiles = getRelevantDevChangedFiles(changedFiles, currentOutput);
	if (some(relevantChangedFiles, (file) => file === wxt.config.userConfigMetadata.configFile)) return { type: "full-restart" };
	if (some(relevantChangedFiles, (file) => file.startsWith(wxt.config.modulesDir))) return { type: "full-restart" };
	if (some(relevantChangedFiles, (file) => file === wxt.config.webExt.configFile)) return { type: "browser-restart" };
	const changedSteps = new Set(relevantChangedFiles.flatMap((changedFile) => findEffectedSteps(changedFile, currentOutput)));
	if (changedSteps.size === 0) if (some(relevantChangedFiles, (file) => file.startsWith(wxt.config.publicDir))) return {
		type: "extension-reload",
		rebuildGroups: [],
		cachedOutput: currentOutput
	};
	else return { type: "no-change" };
	const unchangedOutput = {
		manifest: currentOutput.manifest,
		steps: [],
		publicAssets: [...currentOutput.publicAssets]
	};
	const changedOutput = {
		manifest: currentOutput.manifest,
		steps: [],
		publicAssets: []
	};
	for (const step of currentOutput.steps) if (changedSteps.has(step)) changedOutput.steps.push(step);
	else unchangedOutput.steps.push(step);
	if (relevantChangedFiles.length > 0 && every(relevantChangedFiles, (file) => file.endsWith(".html"))) return {
		type: "html-reload",
		cachedOutput: unchangedOutput,
		rebuildGroups: changedOutput.steps.map((step) => step.entrypoints)
	};
	if (changedOutput.steps.length > 0 && every(changedOutput.steps.flatMap((step) => step.entrypoints), (entry) => entry.type === "content-script")) return {
		type: "content-script-reload",
		cachedOutput: unchangedOutput,
		changedSteps: changedOutput.steps,
		rebuildGroups: changedOutput.steps.map((step) => step.entrypoints)
	};
	return {
		type: "extension-reload",
		cachedOutput: unchangedOutput,
		rebuildGroups: changedOutput.steps.map((step) => step.entrypoints)
	};
}
function getRelevantDevChangedFiles(changedFiles, currentOutput) {
	return Array.from(new Set(changedFiles)).filter((changedFile) => {
		if (changedFile === wxt.config.userConfigMetadata.configFile) return true;
		if (changedFile.startsWith(wxt.config.modulesDir)) return true;
		if (changedFile === wxt.config.webExt.configFile) return true;
		if (changedFile.startsWith(wxt.config.publicDir)) return true;
		return findEffectedSteps(changedFile, currentOutput).length > 0;
	});
}
/**
* For a single change, return all the step of the build output that were
* effected by it.
*/
function findEffectedSteps(changedFile, currentOutput) {
	const changes = [];
	const changedPath = normalizePath(changedFile);
	const isChunkEffected = (chunk) => {
		switch (chunk.type) {
			case "asset": return changedPath.replace("/index.html", ".html").endsWith(chunk.fileName);
			case "chunk": return chunk.moduleIds.map((path) => path.split("?")[0]).includes(changedPath);
			default: return false;
		}
	};
	for (const step of currentOutput.steps) if (step.chunks.find((chunk) => isChunkEffected(chunk))) changes.push(step);
	return changes;
}
//#endregion
export { detectDevChanges, getRelevantDevChangedFiles };
