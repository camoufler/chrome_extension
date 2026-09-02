import { browser } from "wxt/browser";
//#region src/utils/inject-script.ts
/** @module wxt/utils/inject-script */
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
async function injectScript(path, options) {
	const url = browser.runtime.getURL(path);
	const script = document.createElement("script");
	const isManifestV2 = browser.runtime.getManifest().manifest_version === 2;
	if (isManifestV2) script.text = await fetch(url).then((res) => res.text());
	else script.src = url;
	const loadedPromise = isManifestV2 ? void 0 : makeLoadedPromise(script);
	await options?.modifyScript?.(script);
	(document.head ?? document.documentElement).append(script);
	if (!options?.keepInDom) script.remove();
	await loadedPromise;
	return { script };
}
function makeLoadedPromise(script) {
	return new Promise((resolve, reject) => {
		const onload = () => {
			resolve();
			cleanup();
		};
		const onerror = () => {
			reject(/* @__PURE__ */ new Error(`Failed to load script: ${script.src}`));
			cleanup();
		};
		const cleanup = () => {
			script.removeEventListener("load", onload);
			script.removeEventListener("error", onerror);
		};
		script.addEventListener("load", onload);
		script.addEventListener("error", onerror);
	});
}
//#endregion
export { injectScript };
