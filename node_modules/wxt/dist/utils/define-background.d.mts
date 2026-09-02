import { BackgroundDefinition } from "../types.mjs";

//#region src/utils/define-background.d.ts
declare function defineBackground(main: () => void): BackgroundDefinition;
declare function defineBackground(definition: BackgroundDefinition): BackgroundDefinition;
//#endregion
export { defineBackground };