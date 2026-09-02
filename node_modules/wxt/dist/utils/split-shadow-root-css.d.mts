//#region src/utils/split-shadow-root-css.d.ts
/** @module wxt/utils/split-shadow-root-css */
/**
 * Given a CSS string that will be loaded into a shadow root, split it into two
 * parts:
 *
 * - `documentCss`: CSS that needs to be applied to the document (like
 *   `@property`)
 * - `shadowCss`: CSS that needs to be applied to the shadow root
 *
 * @param css
 */
declare function splitShadowRootCss(css: string): {
  documentCss: string;
  shadowCss: string;
};
//#endregion
export { splitShadowRootCss };