//#region src/core/utils/eslint.ts
async function getEslintVersion() {
	try {
		const { ESLint } = await import("eslint");
		return ESLint.version?.split(".") ?? [];
	} catch {
		return [];
	}
}
//#endregion
export { getEslintVersion };
