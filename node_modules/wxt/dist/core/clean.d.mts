import { InlineConfig } from "../types.mjs";

//#region src/core/clean.d.ts
/**
 * Remove generated/temp files from the directory.
 *
 * @example
 *   await clean();
 *
 * @param config Optional config that will override your `<root>/wxt.config.ts`.
 */
declare function clean(config?: InlineConfig): Promise<void>;
//#endregion
export { clean };