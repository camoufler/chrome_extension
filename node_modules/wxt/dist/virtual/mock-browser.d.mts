import { fakeBrowser } from "wxt/testing/fake-browser";

//#region src/virtual/mock-browser.d.ts
declare const browser: any;
//#endregion
export { browser, fakeBrowser as default };