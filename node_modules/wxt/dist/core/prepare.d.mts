import { InlineConfig } from "../types.mjs";

//#region src/core/prepare.d.ts
declare function prepare(config: InlineConfig): Promise<void>;
//#endregion
export { prepare };