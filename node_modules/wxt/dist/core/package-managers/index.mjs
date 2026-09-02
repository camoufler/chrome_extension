import { npm } from "./npm.mjs";
import { bun } from "./bun.mjs";
import { yarn } from "./yarn.mjs";
import { pnpm } from "./pnpm.mjs";
import { deno } from "./deno.mjs";
import { addDependency, addDevDependency, detectPackageManager, ensureDependencyInstalled, installDependencies, removeDependency } from "nypm";
//#region src/core/package-managers/index.ts
async function createWxtPackageManager(root) {
	const pm = await detectPackageManager(root, { includeParentDirs: true });
	const requirePm = (cb) => {
		if (pm == null) throw Error("Could not detect package manager");
		return cb(pm);
	};
	return {
		get name() {
			return requirePm((pm) => pm.name);
		},
		get command() {
			return requirePm((pm) => pm.command);
		},
		get version() {
			return requirePm((pm) => pm.version);
		},
		get majorVersion() {
			return requirePm((pm) => pm.majorVersion);
		},
		get lockFile() {
			return requirePm((pm) => pm.lockFile);
		},
		get files() {
			return requirePm((pm) => pm.files);
		},
		addDependency,
		addDevDependency,
		ensureDependencyInstalled,
		installDependencies,
		removeDependency,
		get overridesKey() {
			return requirePm((pm) => packageManagers[pm.name].overridesKey);
		},
		downloadDependency(...args) {
			return requirePm((pm) => packageManagers[pm.name].downloadDependency(...args));
		},
		listDependencies(...args) {
			return requirePm((pm) => packageManagers[pm.name].listDependencies(...args));
		}
	};
}
const packageManagers = {
	npm,
	pnpm,
	bun,
	yarn,
	deno
};
//#endregion
export { createWxtPackageManager };
