import { builtinModules } from "../builtin-modules/index.mjs";
import { createViteBuilder } from "./builders/vite/index.mjs";
import { createWxtPackageManager } from "./package-managers/index.mjs";
import { resolveConfig } from "./resolve-config.mjs";
import { createHooks } from "hookable";
import { relative } from "path";
//#region src/core/wxt.ts
/**
* Global variable set once `createWxt` is called once. Since this variable is
* used everywhere, this global can be used instead of passing the variable as a
* function parameter everywhere.
*/
let wxt;
/**
* Create and register a global instance of the Wxt interface for use throughout
* the project.
*/
async function registerWxt(command, inlineConfig = {}) {
	process.env.NODE_ENV ??= inlineConfig.mode ?? (command === "serve" ? "development" : "production");
	const hooks = createHooks();
	const config = await resolveConfig(inlineConfig, command);
	const [builder, pm] = await Promise.all([createViteBuilder(config, hooks, () => wxt.server), createWxtPackageManager(config.root)]);
	wxt = {
		config,
		hooks,
		hook: hooks.hook.bind(hooks),
		get logger() {
			return config.logger;
		},
		async reloadConfig() {
			if (wxt.config.dev.server?.port) {
				inlineConfig.dev ??= {};
				inlineConfig.dev.server ??= {};
				inlineConfig.dev.server.port = wxt.config.dev.server.port;
				inlineConfig.dev.server.strictPort = true;
			}
			wxt.config = await resolveConfig(inlineConfig, command);
			await wxt.hooks.callHook("config:resolved", wxt);
		},
		pm,
		builder,
		server: void 0
	};
	await initWxtModules();
}
async function initWxtModules() {
	for (const mod of builtinModules) await initWxtModule(mod);
	for (const mod of wxt.config.userModules) await initWxtModule(mod);
	wxt.hooks.addHooks(wxt.config.hooks);
	if (wxt.config.debug) {
		const order = [
			...builtinModules.map((module) => module.name),
			...wxt.config.userModules.map((module) => relative(wxt.config.root, module.id)),
			"wxt.config.ts > hooks"
		];
		wxt.logger.debug("Hook execution order:");
		order.forEach((name, i) => {
			wxt.logger.debug(`  ${i + 1}. ${name}`);
		});
	}
	await wxt.hooks.callHook("ready", wxt);
	await wxt.hooks.callHook("config:resolved", wxt);
}
async function initWxtModule(module) {
	if (module.hooks) wxt.hooks.addHooks(module.hooks);
	await module.setup?.(wxt, module.configKey ? wxt.config[module.configKey] : void 0);
}
/** Unloads WXT modules. */
function deinitWxtModules() {
	wxt.hooks.removeAllHooks();
}
//#endregion
export { deinitWxtModules, initWxtModules, registerWxt, wxt };
