//#region src/core/initialize.d.ts
declare function initialize(options: {
  directory?: string;
  template?: string;
  packageManager?: string;
}): Promise<void>;
//#endregion
export { initialize };