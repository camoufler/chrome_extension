/**
* All the names of files in the `src/virtual/` and `dist/virtual/` directories,
* minus the extension.
*/
const virtualModuleNames = [
	...[
		"content-script-main-world",
		"content-script-isolated-world",
		"background",
		"unlisted-script"
	].map((name) => `${name}-entrypoint`),
	"mock-browser",
	"reload-html"
];
//#endregion
export { virtualModuleNames };
