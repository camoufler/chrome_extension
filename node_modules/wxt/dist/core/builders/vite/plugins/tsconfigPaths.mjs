//#region src/core/builders/vite/plugins/tsconfigPaths.ts
function tsconfigPaths(config) {
	return {
		name: "wxt:aliases",
		async config() {
			return { resolve: { alias: config.alias } };
		}
	};
}
//#endregion
export { tsconfigPaths };
