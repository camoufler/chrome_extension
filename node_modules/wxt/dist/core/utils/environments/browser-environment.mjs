import { parseHTML } from "linkedom";
//#region src/core/utils/environments/browser-environment.ts
function getBrowserEnvironmentGlobals() {
	const { window, document, global } = parseHTML(`
    <html>
      <head></head>
      <body></body>
    </html>
  `);
	return {
		...global,
		window,
		document,
		self: global
	};
}
//#endregion
export { getBrowserEnvironmentGlobals };
