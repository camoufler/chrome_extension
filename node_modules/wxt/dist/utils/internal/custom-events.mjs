import { browser } from "wxt/browser";
//#region src/utils/internal/custom-events.ts
var WxtLocationChangeEvent = class WxtLocationChangeEvent extends Event {
	static EVENT_NAME = getUniqueEventName("wxt:locationchange");
	constructor(newUrl, oldUrl) {
		super(WxtLocationChangeEvent.EVENT_NAME, {});
		this.newUrl = newUrl;
		this.oldUrl = oldUrl;
	}
};
/**
* Returns an event name unique to the extension and content script that's
* running.
*/
function getUniqueEventName(eventName) {
	return `${browser?.runtime?.id}:${import.meta.env.ENTRYPOINT}:${eventName}`;
}
//#endregion
export { WxtLocationChangeEvent, getUniqueEventName };
