import { unnormalizePath } from "./utils/paths.mjs";
import { deinitWxtModules, initWxtModules, registerWxt, wxt } from "./wxt.mjs";
import { internalBuild } from "./utils/building/internal-build.mjs";
import "./utils/building/index.mjs";
import { createKeyboardShortcuts } from "./keyboard-shortcuts.mjs";
import { isBabelSyntaxError, logBabelSyntaxError } from "./utils/syntax-errors.mjs";
import { createFileReloader, reloadContentScripts } from "./utils/create-file-reloader.mjs";
import chokidar from "chokidar";
//#region src/core/create-server.ts
/**
* Creates a dev server and pre-builds all the files that need to exist before
* loading the extension.
*
* @example
*   const server = await wxt.createServer({
*     // Enter config...
*   });
*   await server.start();
*/
async function createServer(inlineConfig) {
	await registerWxt("serve", inlineConfig);
	wxt.server = await createServerInternal();
	await wxt.hooks.callHook("server:created", wxt, wxt.server);
	return wxt.server;
}
async function createServerInternal() {
	const getServerInfo = () => {
		const { host, port, origin } = wxt.config.dev.server;
		return {
			host,
			port,
			origin
		};
	};
	let builderServer = await wxt.builder.createServer(getServerInfo());
	let wasStopped = false;
	const server = {
		get host() {
			return getServerInfo().host;
		},
		get port() {
			return getServerInfo().port;
		},
		get origin() {
			return getServerInfo().origin;
		},
		get watcher() {
			return builderServer.watcher;
		},
		get ws() {
			return builderServer.ws;
		},
		currentOutput: void 0,
		async start() {
			if (wasStopped) {
				await wxt.reloadConfig();
				builderServer = await wxt.builder.createServer(getServerInfo());
				await initWxtModules();
			}
			await builderServer.listen();
			const hostInfo = server.host === "localhost" ? "" : ` (listening on ${server.host})`;
			wxt.logger.success(`Started dev server @ ${server.origin}${hostInfo}`);
			await wxt.hooks.callHook("server:started", wxt, server);
			server.ws.on("wxt:background-initialized", () => {
				if (server.currentOutput == null) return;
				reloadContentScripts(server.currentOutput.steps, server);
			});
			await buildAndOpenBrowser();
			const reloadOnChange = createFileReloader(server);
			server.watcher.on("all", async (...args) => {
				await reloadOnChange(args[0], args[1]);
			});
		},
		async stop() {
			wasStopped = true;
			keyboardShortcuts.stop();
			await wxt.config.runner.closeBrowser?.();
			await builderServer.close();
			await wxt.hooks.callHook("server:closed", wxt, server);
			deinitWxtModules();
			server.currentOutput = void 0;
		},
		async restart() {
			await server.stop();
			await server.start();
		},
		transformHtml(url, html, originalUrl) {
			return builderServer.transformHtml(url, html, originalUrl);
		},
		reloadContentScript(payload) {
			server.ws.send("wxt:reload-content-script", payload);
		},
		reloadPage(path) {
			server.ws.send("wxt:reload-page", path);
		},
		reloadExtension() {
			server.ws.send("wxt:reload-extension");
		},
		async restartBrowser() {
			await wxt.config.runner.closeBrowser?.();
			keyboardShortcuts.stop();
			await wxt.reloadConfig();
			await wxt.config.runner.openBrowser();
			keyboardShortcuts.start();
			keyboardShortcuts.printHelp({ canReopenBrowser: !wxt.config.webExt.config.disabled && !!wxt.config.runner.canOpen?.() });
		}
	};
	const keyboardShortcuts = createKeyboardShortcuts(server);
	const buildAndOpenBrowser = async () => {
		try {
			server.currentOutput = await internalBuild();
		} catch (err) {
			if (!isBabelSyntaxError(err)) throw err;
			logBabelSyntaxError(err);
			wxt.logger.info("Waiting for syntax error to be fixed...");
			await new Promise((resolve) => {
				const watcher = chokidar.watch(err.id, {
					...wxt.config.watchOptions,
					ignoreInitial: true
				});
				watcher.on("all", () => {
					watcher.close();
					wxt.logger.info("Syntax error resolved, rebuilding...");
					resolve();
				});
			});
			return buildAndOpenBrowser();
		}
		try {
			server.watcher.add(getExternalOutputDependencies(server));
		} catch (err) {
			wxt.config.logger.warn("Failed to register additional file paths:", err);
		}
		await wxt.config.runner.openBrowser();
		keyboardShortcuts.start();
		keyboardShortcuts.printHelp({ canReopenBrowser: !wxt.config.webExt.config.disabled && !!wxt.config.runner.canOpen?.() });
	};
	builderServer.on?.("close", () => keyboardShortcuts.stop());
	return server;
}
/**
* Based on the current build output, return a list of files that are:
*
* 1. Not in node_modules
* 2. Not inside project root
*/
function getExternalOutputDependencies(server) {
	return server.currentOutput?.steps.flatMap((step, i) => {
		if (Array.isArray(step.entrypoints) && i === 0) return [];
		return step.chunks.flatMap((chunk) => {
			if (chunk.type === "asset") return [];
			return chunk.moduleIds;
		});
	}).filter((file) => !file.includes("node_modules") && !file.startsWith("\0")).map(unnormalizePath).filter((file) => !file.startsWith(wxt.config.root)) ?? [];
}
//#endregion
export { createServer };
