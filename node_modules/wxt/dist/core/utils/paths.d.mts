//#region src/core/utils/paths.d.ts
/**
 * Converts system paths to normalized bundler path. On Windows, this returns
 * paths with `/` instead of `\`.
 */
declare function normalizePath(path: string): string;
//#endregion
export { normalizePath };