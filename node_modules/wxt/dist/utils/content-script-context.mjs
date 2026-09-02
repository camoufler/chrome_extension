import { logger } from "./internal/logger.mjs";
import { getUniqueEventName } from "./internal/custom-events.mjs";
import { createLocationWatcher } from "./internal/location-watcher.mjs";
import { browser } from "wxt/browser";
//#region src/utils/content-script-context.ts
/**
* Implements
* [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController).
* Used to detect and stop content script code when the script is invalidated.
*
* It also provides several utilities like `ctx.setTimeout` and
* `ctx.setInterval` that should be used in content scripts instead of
* `window.setTimeout` or `window.setInterval`.
*
* To create context for testing, you can use the class's constructor:
*
* ```ts
* import { ContentScriptContext } from 'wxt/utils/content-scripts-context';
*
* test('storage listener should be removed when context is invalidated', () => {
*   const ctx = new ContentScriptContext('test');
*   const item = storage.defineItem('local:count', { defaultValue: 0 });
*   const watcher = vi.fn();
*
*   const unwatch = item.watch(watcher);
*   ctx.onInvalidated(unwatch); // Listen for invalidate here
*
*   await item.setValue(1);
*   expect(watcher).toBeCalledTimes(1);
*   expect(watcher).toBeCalledWith(1, 0);
*
*   ctx.notifyInvalidated(); // Use this function to invalidate the context
*   await item.setValue(2);
*   expect(watcher).toBeCalledTimes(1);
* });
* ```
*/
var ContentScriptContext = class ContentScriptContext {
	static SCRIPT_STARTED_MESSAGE_TYPE = getUniqueEventName("wxt:content-script-started");
	id;
	abortController;
	locationWatcher = createLocationWatcher(this);
	constructor(contentScriptName, options) {
		this.contentScriptName = contentScriptName;
		this.options = options;
		this.id = Math.random().toString(36).slice(2);
		this.abortController = new AbortController();
		this.stopOldScripts();
		this.listenForNewerScripts();
	}
	get signal() {
		return this.abortController.signal;
	}
	abort(reason) {
		return this.abortController.abort(reason);
	}
	get isInvalid() {
		if (browser.runtime?.id == null) this.notifyInvalidated();
		return this.signal.aborted;
	}
	get isValid() {
		return !this.isInvalid;
	}
	/**
	* Add a listener that is called when the content script's context is
	* invalidated.
	*
	* @example
	*   browser.runtime.onMessage.addListener(cb);
	*   const removeInvalidatedListener = ctx.onInvalidated(() => {
	*     browser.runtime.onMessage.removeListener(cb);
	*   });
	*   // ...
	*   removeInvalidatedListener();
	*
	* @returns A function to remove the listener.
	*/
	onInvalidated(cb) {
		this.signal.addEventListener("abort", cb);
		return () => this.signal.removeEventListener("abort", cb);
	}
	/**
	* Return a promise that never resolves. Useful if you have an async function
	* that shouldn't run after the context is expired.
	*
	* @example
	*   const getValueFromStorage = async () => {
	*     if (ctx.isInvalid) return ctx.block();
	*
	*     // ...
	*   };
	*/
	block() {
		return new Promise(() => {});
	}
	/**
	* Wrapper around `window.setInterval` that automatically clears the interval
	* when invalidated.
	*
	* Intervals can be cleared by calling the normal `clearInterval` function.
	*/
	setInterval(handler, timeout) {
		const id = setInterval(() => {
			if (this.isValid) handler();
		}, timeout);
		this.onInvalidated(() => clearInterval(id));
		return id;
	}
	/**
	* Wrapper around `window.setTimeout` that automatically clears the interval
	* when invalidated.
	*
	* Timeouts can be cleared by calling the normal `setTimeout` function.
	*/
	setTimeout(handler, timeout) {
		const id = setTimeout(() => {
			if (this.isValid) handler();
		}, timeout);
		this.onInvalidated(() => clearTimeout(id));
		return id;
	}
	/**
	* Wrapper around `window.requestAnimationFrame` that automatically cancels
	* the request when invalidated.
	*
	* Callbacks can be canceled by calling the normal `cancelAnimationFrame`
	* function.
	*/
	requestAnimationFrame(callback) {
		const id = requestAnimationFrame((...args) => {
			if (this.isValid) callback(...args);
		});
		this.onInvalidated(() => cancelAnimationFrame(id));
		return id;
	}
	/**
	* Wrapper around `window.requestIdleCallback` that automatically cancels the
	* request when invalidated.
	*
	* Callbacks can be canceled by calling the normal `cancelIdleCallback`
	* function.
	*/
	requestIdleCallback(callback, options) {
		const id = requestIdleCallback((...args) => {
			if (!this.signal.aborted) callback(...args);
		}, options);
		this.onInvalidated(() => cancelIdleCallback(id));
		return id;
	}
	addEventListener(target, type, handler, options) {
		if (type === "wxt:locationchange") {
			if (this.isValid) this.locationWatcher.run();
		}
		target.addEventListener?.(type.startsWith("wxt:") ? getUniqueEventName(type) : type, handler, {
			...options,
			signal: this.signal
		});
	}
	/**
	* @internal
	* Abort the abort controller and execute all `onInvalidated` listeners.
	*/
	notifyInvalidated() {
		this.abort("Content script context invalidated");
		logger.debug(`Content script "${this.contentScriptName}" context invalidated`);
	}
	stopOldScripts() {
		document.dispatchEvent(new CustomEvent(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, { detail: {
			contentScriptName: this.contentScriptName,
			messageId: this.id
		} }));
		if (!this.options?.noScriptStartedPostMessage) window.postMessage({
			type: ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE,
			contentScriptName: this.contentScriptName,
			messageId: this.id
		}, "*");
	}
	verifyScriptStartedEvent(event) {
		const isSameContentScript = event.detail?.contentScriptName === this.contentScriptName;
		const isFromSelf = event.detail?.messageId === this.id;
		return isSameContentScript && !isFromSelf;
	}
	listenForNewerScripts() {
		const cb = (event) => {
			if (!(event instanceof CustomEvent) || !this.verifyScriptStartedEvent(event)) return;
			this.notifyInvalidated();
		};
		document.addEventListener(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, cb);
		this.onInvalidated(() => document.removeEventListener(ContentScriptContext.SCRIPT_STARTED_MESSAGE_TYPE, cb));
	}
};
//#endregion
export { ContentScriptContext };
