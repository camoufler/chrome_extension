import { ContentScriptDefinition } from "../types.mjs";

//#region src/utils/define-content-script.d.ts
declare function defineContentScript(definition: ContentScriptDefinition): ContentScriptDefinition;
//#endregion
export { defineContentScript };