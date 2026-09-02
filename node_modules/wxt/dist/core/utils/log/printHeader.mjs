import { version } from "../../../version.mjs";
import { consola as consola$1 } from "consola";
import { styleText } from "node:util";
//#region src/core/utils/log/printHeader.ts
function printHeader() {
	consola$1.log(`\n${styleText("gray", "WXT")} ${styleText(["bold", "gray"], version)}`);
}
//#endregion
export { printHeader };
