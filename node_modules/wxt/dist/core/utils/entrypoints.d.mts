import { Entrypoint } from "../../types.mjs";

//#region src/core/utils/entrypoints.d.ts
/**
 * Return's the entrypoint's output path relative to the output directory. Used
 * for paths in the manifest and rollup's bundle.
 */
declare function getEntrypointBundlePath(entrypoint: Entrypoint, outDir: string, ext: string): string;
//#endregion
export { getEntrypointBundlePath };