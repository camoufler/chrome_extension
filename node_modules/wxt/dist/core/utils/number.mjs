//#region src/core/utils/number.ts
function safeStringToNumber(str) {
	const num = Number(str);
	return isNaN(num) ? null : num;
}
//#endregion
export { safeStringToNumber };
