import { wxt } from "../wxt.mjs";
import { relative } from "node:path";
import { styleText } from "node:util";
//#region src/core/utils/syntax-errors.ts
function isBabelSyntaxError(error) {
	return error instanceof SyntaxError && error.code === "BABEL_PARSER_SYNTAX_ERROR";
}
function logBabelSyntaxError(error) {
	let filename = relative(wxt.config.root, error.id);
	if (filename.startsWith("..")) filename = error.id;
	let message = error.message.replace(/\(\d+:\d+\)$/, `(${filename}:${error.loc.line}:${error.loc.column + 1})`);
	if (error.frame) message += "\n\n" + styleText("red", error.frame);
	wxt.logger.error(message);
}
//#endregion
export { isBabelSyntaxError, logBabelSyntaxError };
