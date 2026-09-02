//#region src/core/builders/vite/plugins/defineImportMeta.ts
/**
* Overrides definitions for `import.meta.*`
*
* - `import.meta.url`: Without this, background service workers crash trying to
*   access `document.location`, see https://github.com/wxt-dev/wxt/issues/392
*/
function defineImportMeta() {
	return {
		name: "wxt:define",
		config() {
			return { define: { "import.meta.url": "self.location.href" } };
		}
	};
}
//#endregion
export { defineImportMeta };
