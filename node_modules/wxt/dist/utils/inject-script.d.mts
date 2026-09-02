import * as _$wxt_browser0 from "wxt/browser";

//#region src/utils/inject-script.d.ts
type ScriptPublicPath = Extract<_$wxt_browser0.PublicPath, `${string}.js`>;
/**
 * This function can only be called inside content scripts.
 *
 * Inject an unlisted script into the page. Scripts are added to the `<head>`
 * element or `document.documentElement` if there is no head.
 *
 * Make sure to add the injected script to your manifest's
 * `web_accessible_resources`.
 *
 * @returns A result object containing the created script element.
 */
declare function injectScript(path: ScriptPublicPath, options?: InjectScriptOptions): Promise<InjectScriptResult>;
interface InjectScriptOptions {
  /**
   * By default, the injected script is removed from the DOM after being
   * injected. To disable this behavior, set this flag to true.
   */
  keepInDom?: boolean;
  /**
   * Modify the script element just before it is added to the DOM.
   *
   * It can be used to e.g. modify `script.async`/`script.defer`, add event
   * listeners to the element, or pass data to the script via `script.dataset`
   * (which can be accessed by the script via `document.currentScript`).
   */
  modifyScript?: (script: HTMLScriptElement) => Promise<void> | void;
}
interface InjectScriptResult {
  /**
   * The created script element. It can be used to e.g. send messages to the
   * script in the form of custom events. The script can add an event listener
   * for them via `document.currentScript`.
   */
  script: HTMLScriptElement;
}
//#endregion
export { InjectScriptOptions, InjectScriptResult, ScriptPublicPath, injectScript };