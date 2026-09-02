//#region src/core/package-managers/deno.ts
const deno = {
	overridesKey: "na",
	downloadDependency() {
		throw Error("Deno not supported");
	},
	listDependencies() {
		throw Error("Deno not supported");
	}
};
//#endregion
export { deno };
