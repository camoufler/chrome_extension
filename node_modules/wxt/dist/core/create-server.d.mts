import { InlineConfig, WxtDevServer } from "../types.mjs";

//#region src/core/create-server.d.ts
/**
 * Creates a dev server and pre-builds all the files that need to exist before
 * loading the extension.
 *
 * @example
 *   const server = await wxt.createServer({
 *     // Enter config...
 *   });
 *   await server.start();
 */
declare function createServer(inlineConfig?: InlineConfig): Promise<WxtDevServer>;
//#endregion
export { createServer };