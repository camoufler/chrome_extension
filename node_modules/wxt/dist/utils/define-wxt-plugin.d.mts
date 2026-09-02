import { WxtPlugin } from "../types.mjs";

//#region src/utils/define-wxt-plugin.d.ts
declare function defineWxtPlugin(plugin: WxtPlugin): WxtPlugin;
//#endregion
export { defineWxtPlugin };