import { unnormalizePath } from "../paths.mjs";
import { isCI } from "../env.mjs";
import { wxt } from "../../wxt.mjs";
import { findEntrypoints } from "./find-entrypoints.mjs";
import { groupEntrypoints } from "./group-entrypoints.mjs";
import { formatDuration } from "../time.mjs";
import { printBuildSummary } from "../log/printBuildSummary.mjs";
import "../log/index.mjs";
import { rebuild } from "./rebuild.mjs";
import { ValidationError, validateEntrypoints } from "../validation.mjs";
import { mkdir, rm } from "node:fs/promises";
import { glob } from "tinyglobby";
import { relative } from "node:path";
import { mergeJsonOutputs } from "@aklinker1/rollup-plugin-visualizer";
import { styleText } from "node:util";
import open from "tiny-open";
//#region src/core/utils/building/internal-build.ts
/**
* Builds the extension based on an internal config. No more config discovery is
* performed, the build is based on exactly what is passed in.
*
* This function:
*
* 1. Cleans the output directory
* 2. Executes the rebuild function with a blank previous output so everything is
*    built (see `rebuild` for more details)
* 3. Prints the summary
*/
async function internalBuild() {
	await wxt.hooks.callHook("build:before", wxt);
	const verb = wxt.config.command === "serve" ? "Pre-rendering" : "Building";
	const target = `${wxt.config.browser}-mv${wxt.config.manifestVersion}`;
	wxt.logger.info(`${verb} ${styleText("cyan", target)} for ${styleText("cyan", wxt.config.mode)} with ${styleText("green", `${wxt.builder.name} ${wxt.builder.version}`)}`);
	const startTime = Date.now();
	await rm(wxt.config.outDir, {
		recursive: true,
		force: true
	});
	await mkdir(wxt.config.outDir, { recursive: true });
	const entrypoints = await findEntrypoints();
	wxt.logger.debug("Detected entrypoints:", entrypoints);
	const validationResults = validateEntrypoints(entrypoints);
	if (validationResults.errorCount + validationResults.warningCount > 0) printValidationResults(validationResults);
	if (validationResults.errorCount > 0) throw new ValidationError(`Entrypoint validation failed`, { cause: validationResults });
	const groups = groupEntrypoints(entrypoints);
	await wxt.hooks.callHook("entrypoints:grouped", wxt, groups);
	const { output, warnings } = await rebuild(entrypoints, groups, void 0);
	await wxt.hooks.callHook("build:done", wxt, output);
	await printBuildSummary(wxt.logger.success, `Built extension in ${formatDuration(Date.now() - startTime)}`, output);
	for (const warning of warnings) wxt.logger.warn(...warning);
	if (wxt.config.analysis.enabled) {
		await combineAnalysisStats();
		const statsPath = relative(wxt.config.root, wxt.config.analysis.outputFile);
		wxt.logger.info(`Analysis complete:\n  ${styleText("gray", "└─")} ${styleText("yellow", statsPath)}`);
		if (wxt.config.analysis.open) if (isCI()) wxt.logger.debug(`Skipped opening ${styleText("yellow", statsPath)} in CI`);
		else {
			wxt.logger.info(`Opening ${styleText("yellow", statsPath)} in browser...`);
			await open(wxt.config.analysis.outputFile);
		}
	}
	return output;
}
async function combineAnalysisStats() {
	const absolutePaths = (await glob(`${wxt.config.analysis.outputName}-*.json`, {
		cwd: wxt.config.analysis.outputDir,
		absolute: true,
		expandDirectories: false
	})).map(unnormalizePath);
	await mergeJsonOutputs({
		inputs: absolutePaths,
		template: wxt.config.analysis.template,
		filename: wxt.config.analysis.outputFile
	});
	if (!wxt.config.analysis.keepArtifacts) await Promise.all(absolutePaths.map((statsFile) => rm(statsFile, { force: true })));
}
function printValidationResults({ errorCount, errors, warningCount }) {
	(errorCount > 0 ? wxt.logger.error : wxt.logger.warn)(`Entrypoint validation failed: ${errorCount} error${errorCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"}`);
	const cwd = process.cwd();
	const entrypointErrors = errors.reduce((map, error) => {
		const entryErrors = map.get(error.entrypoint) ?? [];
		entryErrors.push(error);
		map.set(error.entrypoint, entryErrors);
		return map;
	}, /* @__PURE__ */ new Map());
	Array.from(entrypointErrors.entries()).forEach(([entrypoint, errors]) => {
		wxt.logger.log(relative(cwd, entrypoint.inputPath) + "\n");
		errors.forEach((err) => {
			const type = err.type === "error" ? styleText("red", "ERROR") : styleText("yellow", "WARN");
			const received = styleText("dim", `(received: ${JSON.stringify(err.value)})`);
			wxt.logger.log(`  - ${type} ${err.message} ${received}`);
		});
		console.log();
	});
}
//#endregion
export { internalBuild };
