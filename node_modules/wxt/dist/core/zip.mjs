import { normalizePath } from "./utils/paths.mjs";
import "./utils/index.mjs";
import { safeFilename } from "./utils/strings.mjs";
import { registerWxt, wxt } from "./wxt.mjs";
import { findEntrypoints } from "./utils/building/find-entrypoints.mjs";
import { formatDuration } from "./utils/time.mjs";
import { printFileList } from "./utils/log/printFileList.mjs";
import "./utils/log/index.mjs";
import { getPackageJson } from "./utils/package.mjs";
import { internalBuild } from "./utils/building/internal-build.mjs";
import "./utils/building/index.mjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { glob } from "tinyglobby";
import path from "node:path";
import { createZip } from "@aklinker1/zero-zip";
//#region src/core/zip.ts
/**
* Build and zip the extension for distribution.
*
* @param config Optional config that will override your `<root>/wxt.config.ts`.
* @returns A list of all files included in the ZIP.
*/
async function zip(config) {
	await registerWxt("build", config);
	const output = await internalBuild();
	await wxt.hooks.callHook("zip:start", wxt);
	const start = Date.now();
	wxt.logger.info("Zipping extension...");
	const zipFiles = [];
	const packageJson = await getPackageJson();
	const projectName = wxt.config.zip.name ?? safeFilename(packageJson?.name || path.basename(process.cwd()));
	const modeSuffix = {
		production: "",
		development: "-dev"
	}[wxt.config.mode] ?? `-${wxt.config.mode}`;
	const applyTemplate = (template) => template.replaceAll("{{name}}", projectName).replaceAll("{{browser}}", wxt.config.browser).replaceAll("{{version}}", output.manifest.version).replaceAll("{{versionName}}", output.manifest.version_name ?? output.manifest.version).replaceAll("{{packageVersion}}", packageJson?.version).replaceAll("{{modeSuffix}}", modeSuffix).replaceAll("{{mode}}", wxt.config.mode).replaceAll("{{manifestVersion}}", `mv${wxt.config.manifestVersion}`);
	await mkdir(wxt.config.outBaseDir, { recursive: true });
	await wxt.hooks.callHook("zip:extension:start", wxt);
	const outZipFilename = applyTemplate(wxt.config.zip.artifactTemplate);
	const outZipPath = path.resolve(wxt.config.outBaseDir, outZipFilename);
	await zipDir(wxt.config.outDir, outZipPath, { exclude: wxt.config.zip.exclude });
	zipFiles.push(outZipPath);
	await wxt.hooks.callHook("zip:extension:done", wxt, outZipPath);
	if (wxt.config.zip.zipSources) {
		const skippedEntrypoints = (await findEntrypoints()).filter((entry) => entry.skipped);
		const excludeSources = [...wxt.config.zip.excludeSources, ...skippedEntrypoints.map((entry) => path.relative(wxt.config.zip.sourcesRoot, entry.inputPath))].map((paths) => paths.replaceAll("\\", "/"));
		await wxt.hooks.callHook("zip:sources:start", wxt);
		const { overrides, files: downloadedPackages } = await downloadPrivatePackages();
		const sourcesZipFilename = applyTemplate(wxt.config.zip.sourcesTemplate);
		const sourcesZipPath = path.resolve(wxt.config.outBaseDir, sourcesZipFilename);
		const files = await zipDir(wxt.config.zip.sourcesRoot, sourcesZipPath, {
			include: wxt.config.zip.includeSources,
			exclude: excludeSources,
			transform(absolutePath, zipPath, content) {
				if (zipPath.endsWith("package.json")) return addOverridesToPackageJson(absolutePath, content, overrides);
			},
			additionalFiles: downloadedPackages,
			dot: wxt.config.zip.dotSources
		});
		zipFiles.push(sourcesZipPath);
		await wxt.hooks.callHook("zip:sources:done", wxt, sourcesZipPath);
		await printFileList(wxt.logger.info, `Sources included in \`${sourcesZipFilename}\``, wxt.config.zip.sourcesRoot, files);
	}
	await printFileList(wxt.logger.success, `Zipped extension in ${formatDuration(Date.now() - start)}`, wxt.config.outBaseDir, zipFiles);
	await wxt.hooks.callHook("zip:done", wxt, zipFiles);
	return zipFiles;
}
async function zipDir(directory, outputPath, options) {
	const archive = createZip({ level: wxt.config.zip.compressionLevel });
	const filesToZip = [...await glob(options?.include ?? ["**/*"], {
		cwd: directory,
		ignore: options?.exclude ?? [],
		onlyFiles: true,
		dot: options?.dot
	}), ...(options?.additionalFiles ?? []).map((file) => path.relative(directory, file))].sort();
	for (const file of filesToZip) {
		const absolutePath = path.resolve(directory, file);
		if (file.endsWith(".json")) {
			const content = await readFile(absolutePath, "utf-8");
			archive.addFile(file, await options?.transform?.(absolutePath, file, content) || content);
		} else {
			const content = await readFile(absolutePath);
			archive.addFile(file, content);
		}
	}
	await options?.additionalWork?.(archive);
	await writeFile(outputPath, await archive.toBuffer());
	return filesToZip;
}
async function downloadPrivatePackages() {
	const overrides = {};
	const files = [];
	if (wxt.config.zip.downloadPackages.length > 0) {
		const _downloadPackages = new Set(wxt.config.zip.downloadPackages);
		const downloadPackages = (await wxt.pm.listDependencies({
			all: true,
			cwd: wxt.config.root
		})).filter((pkg) => _downloadPackages.has(pkg.name));
		for (const pkg of downloadPackages) {
			wxt.logger.info(`Downloading package: ${pkg.name}@${pkg.version}`);
			const id = `${pkg.name}@${pkg.version}`;
			const tgzPath = await wxt.pm.downloadDependency(id, wxt.config.zip.downloadedPackagesDir);
			files.push(tgzPath);
			overrides[id] = tgzPath;
		}
	}
	return {
		overrides,
		files
	};
}
function addOverridesToPackageJson(absolutePackageJsonPath, content, overrides) {
	if (Object.keys(overrides).length === 0) return content;
	const packageJsonDir = path.dirname(absolutePackageJsonPath);
	const oldPackage = JSON.parse(content);
	const newPackage = {
		...oldPackage,
		[wxt.pm.overridesKey]: { ...oldPackage[wxt.pm.overridesKey] }
	};
	Object.entries(overrides).forEach(([key, absolutePath]) => {
		newPackage[wxt.pm.overridesKey][key] = "file://./" + normalizePath(path.relative(packageJsonDir, absolutePath));
	});
	return JSON.stringify(newPackage, null, 2);
}
//#endregion
export { zip };
