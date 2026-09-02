import definition from "virtual:user-unlisted-script-entrypoint";
import { initPlugins } from "virtual:wxt-plugins";
//#region src/utils/internal/logger.ts
function print(method, ...args) {
	if (import.meta.env.MODE === "production") return;
	if (typeof args[0] === "string") method(`[wxt] ${args.shift()}`, ...args);
	else method("[wxt]", ...args);
}
/** Wrapper around `console` with a "[wxt]" prefix */
const logger = {
	debug: (...args) => print(console.debug, ...args),
	log: (...args) => print(console.log, ...args),
	warn: (...args) => print(console.warn, ...args),
	error: (...args) => print(console.error, ...args)
};
//#endregion
//#region src/virtual/unlisted-script-entrypoint.ts
const result = (() => {
	try {
		initPlugins();
	} catch (err) {
		logger.error(`Failed to initialize plugins for "${import.meta.env.ENTRYPOINT}"`, err);
		throw err;
	}
	let result;
	try {
		result = definition.main();
		if (result instanceof Promise) result = result.catch((err) => {
			logger.error(`The unlisted script "${import.meta.env.ENTRYPOINT}" crashed on startup!`, err);
			throw err;
		});
	} catch (err) {
		logger.error(`The unlisted script "${import.meta.env.ENTRYPOINT}" crashed on startup!`, err);
		throw err;
	}
	return result;
})();
//#endregion
export { result as default };
