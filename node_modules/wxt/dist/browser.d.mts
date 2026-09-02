import { ScriptPublicPath } from "./utils/inject-script.mjs";
import { Browser, browser as browser$1 } from "@wxt-dev/browser";

//#region src/browser.d.ts
/**
 * This interface is empty because it is generated per-project when running `wxt
 * prepare`. See:
 *
 * - `.wxt/types/paths.d.ts`
 */
interface WxtRuntime {}
/**
 * This interface is empty because it is generated per-project when running `wxt
 * prepare`. See:
 *
 * - `.wxt/types/i18n.d.ts`
 */
interface WxtI18n {}
type ScriptInjection<Args extends any[], Result> = Browser.scripting.ScriptInjection<Args, Result> extends infer T ? T extends {
  files: string[];
} ? Omit<T, 'files'> & {
  files: ScriptPublicPath[];
} : T : never;
type InjectionResult<Result> = Array<Browser.scripting.InjectionResult<Awaited<Result>>>;
interface WxtScripting {
  executeScript: {
    /** @see {@link Browser.scripting.executeScript} */<Args extends any[], Result>(injection: ScriptInjection<Args, Result>): Promise<InjectionResult<Result>>;
    <Args extends any[], Result>(injection: ScriptInjection<Args, Result>, callback: (results: InjectionResult<Result>) => void): void;
  };
}
type WxtBrowser = Omit<typeof browser$1, 'runtime' | 'i18n' | 'scripting'> & {
  runtime: WxtRuntime & Omit<(typeof browser$1)['runtime'], 'getURL'>;
  i18n: WxtI18n & Omit<(typeof browser$1)['i18n'], 'getMessage'>;
  scripting: WxtScripting & Omit<(typeof browser$1)['scripting'], 'executeScript'>;
};
declare const browser: WxtBrowser;
//#endregion
export { Browser, WxtBrowser, WxtI18n, WxtRuntime, WxtScripting, browser };