import { toArray } from "../arrays.mjs";
import { wxt } from "../../wxt.mjs";
import { getPublicFiles } from "../fs.mjs";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "path";
import { styleText } from "node:util";
//#region src/core/utils/building/build-entrypoints.ts
async function buildEntrypoints(groups, spinner) {
	const steps = [];
	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		const groupNames = toArray(group).map((e) => e.name);
		const groupNameColored = groupNames.join(styleText("dim", ", "));
		spinner.update({ text: styleText("dim", `[${i + 1}/${groups.length}]`) + ` ${groupNameColored}` });
		try {
			steps.push(await wxt.builder.build(group));
		} catch (err) {
			spinner.stop();
			spinner.clear();
			wxt.logger.error(err);
			throw Error(`Failed to build ${groupNames.join(", ")}`, { cause: err });
		}
	}
	return {
		publicAssets: await copyPublicDirectory(),
		steps
	};
}
async function copyPublicDirectory() {
	const files = (await getPublicFiles()).map((file) => ({
		absoluteSrc: resolve(wxt.config.publicDir, file),
		relativeDest: file
	}));
	await wxt.hooks.callHook("build:publicAssets", wxt, files);
	if (files.length === 0) return [];
	const publicAssets = [];
	for (const file of files) {
		const absoluteDest = resolve(wxt.config.outDir, file.relativeDest);
		await mkdir(dirname(absoluteDest), { recursive: true });
		if ("absoluteSrc" in file) await copyFile(file.absoluteSrc, absoluteDest);
		else await writeFile(absoluteDest, file.contents, "utf8");
		publicAssets.push({
			type: "asset",
			fileName: file.relativeDest
		});
	}
	return publicAssets;
}
//#endregion
export { buildEntrypoints };
