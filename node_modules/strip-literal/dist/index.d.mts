import { Token } from "js-tokens";
//#region src/types.d.ts
interface StripLiteralOptions {
  /**
   * Will be called for each string literal. Return false to skip stripping.
   */
  filter?: (s: string) => boolean;
  /**
   * Fill the stripped literal with this character.
   * It must be a single character.
   *
   * @default ' '
   */
  fillChar?: string;
}
//#endregion
//#region src/js-tokens.d.ts
/**
 * Strip literal from code.
 */
declare function stripLiteral(code: string, options?: StripLiteralOptions): string;
/**
 * Strip literal from code, return more detailed information.
 */
declare function stripLiteralDetailed(code: string, options?: StripLiteralOptions): {
  result: string;
  tokens: Token[];
};
//#endregion
export { StripLiteralOptions, stripLiteral, stripLiteralDetailed, stripLiteralDetailed as stripLiteralJsTokens };