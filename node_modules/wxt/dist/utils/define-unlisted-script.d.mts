import { UnlistedScriptDefinition } from "../types.mjs";

//#region src/utils/define-unlisted-script.d.ts
declare function defineUnlistedScript(main: () => void): UnlistedScriptDefinition;
declare function defineUnlistedScript(definition: UnlistedScriptDefinition): UnlistedScriptDefinition;
//#endregion
export { defineUnlistedScript };