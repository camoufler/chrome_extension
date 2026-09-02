import definition from "virtual:user-content-script-main-world-entrypoint";
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
//#region src/virtual/content-script-main-world-entrypoint.ts
const result = (async () => {
	try {
		initPlugins();
		return await definition.main();
	} catch (err) {
		logger.error(`The content script "${import.meta.env.ENTRYPOINT}" crashed on startup!`, err);
		throw err;
	}
})();
//#endregion
export { result as default };
