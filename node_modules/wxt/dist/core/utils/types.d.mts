import { Browser } from "@wxt-dev/browser";

//#region src/core/utils/types.d.ts
type ManifestContentScript = NonNullable<Browser.runtime.Manifest['content_scripts']>[number];
//#endregion
export { ManifestContentScript };