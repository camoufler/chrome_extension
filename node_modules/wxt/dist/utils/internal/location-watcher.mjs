import { WxtLocationChangeEvent } from "./custom-events.mjs";
//#region src/utils/internal/location-watcher.ts
const supportsNavigationApi = typeof globalThis.navigation?.addEventListener === "function";
/**
* Create a util that watches for URL changes, dispatching the custom event when
* detected. Stops watching when content script is invalidated. Uses Navigation
* API when available, otherwise falls back to polling.
*/
function createLocationWatcher(ctx) {
	let lastUrl;
	let watching = false;
	return { run() {
		if (watching) return;
		watching = true;
		lastUrl = new URL(location.href);
		if (supportsNavigationApi) globalThis.navigation.addEventListener("navigate", (event) => {
			const newUrl = new URL(event.destination.url);
			if (newUrl.href === lastUrl.href) return;
			window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
			lastUrl = newUrl;
		}, { signal: ctx.signal });
		else ctx.setInterval(() => {
			const newUrl = new URL(location.href);
			if (newUrl.href !== lastUrl.href) {
				window.dispatchEvent(new WxtLocationChangeEvent(newUrl, lastUrl));
				lastUrl = newUrl;
			}
		}, 1e3);
	} };
}
//#endregion
export { createLocationWatcher };
