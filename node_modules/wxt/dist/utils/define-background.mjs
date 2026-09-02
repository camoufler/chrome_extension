//#region src/utils/define-background.ts
function defineBackground(arg) {
	if (arg == null || typeof arg === "function") return { main: arg };
	return arg;
}
//#endregion
export { defineBackground };
