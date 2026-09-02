import { fakeBrowser } from "wxt/testing/fake-browser";
//#region src/virtual/mock-browser.ts
const browser = fakeBrowser;
var mock_browser_default = fakeBrowser;
//#endregion
export { browser, mock_browser_default as default };
