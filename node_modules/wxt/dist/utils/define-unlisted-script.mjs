//#region src/utils/define-unlisted-script.ts
function defineUnlistedScript(arg) {
	if (arg == null || typeof arg === "function") return { main: arg };
	return arg;
}
//#endregion
export { defineUnlistedScript };
