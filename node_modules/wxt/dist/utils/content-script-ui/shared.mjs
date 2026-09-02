import { logger } from "../internal/logger.mjs";
import { waitElement } from "@1natsu/wait-element";
import { isExist, isNotExist } from "@1natsu/wait-element/detectors";
//#region src/utils/content-script-ui/shared.ts
function applyPosition(root, positionedElement, options) {
	if (options.position === "inline") return;
	if (options.zIndex != null) root.style.zIndex = String(options.zIndex);
	root.style.overflow = "visible";
	root.style.position = "relative";
	root.style.width = "0";
	root.style.height = "0";
	root.style.display = "block";
	if (positionedElement) if (options.position === "overlay") {
		positionedElement.style.position = "absolute";
		if (options.alignment?.startsWith("bottom-")) positionedElement.style.bottom = "0";
		else positionedElement.style.top = "0";
		if (options.alignment?.endsWith("-right")) positionedElement.style.right = "0";
		else positionedElement.style.left = "0";
	} else {
		positionedElement.style.position = "fixed";
		positionedElement.style.top = "0";
		positionedElement.style.bottom = "0";
		positionedElement.style.left = "0";
		positionedElement.style.right = "0";
	}
}
function getAnchor(options) {
	if (options.anchor == null) return document.body;
	let resolved = typeof options.anchor === "function" ? options.anchor() : options.anchor;
	if (typeof resolved === "string") if (resolved.startsWith("/")) return document.evaluate(resolved, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ?? void 0;
	else return document.querySelector(resolved) ?? void 0;
	return resolved ?? void 0;
}
function mountUi(root, options) {
	const anchor = getAnchor(options);
	if (anchor == null) throw Error("Failed to mount content script UI: could not find anchor element");
	switch (options.append) {
		case void 0:
		case "last":
			anchor.append(root);
			break;
		case "first":
			anchor.prepend(root);
			break;
		case "replace":
			anchor.replaceWith(root);
			break;
		case "after":
			anchor.parentElement?.insertBefore(root, anchor.nextElementSibling);
			break;
		case "before":
			anchor.parentElement?.insertBefore(root, anchor);
			break;
		default: options.append(anchor, root);
	}
}
function createMountFunctions(baseFunctions, options) {
	let autoMountInstance;
	const stopAutoMount = () => {
		autoMountInstance?.stopAutoMount();
		autoMountInstance = void 0;
	};
	const mount = () => {
		baseFunctions.mount();
	};
	const unmount = baseFunctions.remove;
	const remove = () => {
		stopAutoMount();
		baseFunctions.remove();
	};
	const autoMount = (autoMountOptions) => {
		if (autoMountInstance) logger.warn("autoMount is already set.");
		autoMountInstance = autoMountUi({
			mount,
			unmount,
			stopAutoMount
		}, {
			...options,
			...autoMountOptions
		});
	};
	return {
		mount,
		remove,
		autoMount
	};
}
function autoMountUi(uiCallbacks, options) {
	const abortController = new AbortController();
	const EXPLICIT_STOP_REASON = "explicit_stop_auto_mount";
	const _stopAutoMount = () => {
		abortController.abort(EXPLICIT_STOP_REASON);
		options.onStop?.();
	};
	let resolvedAnchor = typeof options.anchor === "function" ? options.anchor() : options.anchor;
	if (resolvedAnchor instanceof Element) throw Error("autoMount and Element anchor option cannot be combined. Avoid passing `Element` directly or `() => Element` to the anchor.");
	async function observeElement(selector) {
		let isAnchorExist = !!getAnchor(options);
		if (isAnchorExist) uiCallbacks.mount();
		while (!abortController.signal.aborted) try {
			isAnchorExist = !!await waitElement(selector ?? "body", {
				customMatcher: () => getAnchor(options) ?? null,
				detector: isAnchorExist ? isNotExist : isExist,
				signal: abortController.signal
			});
			if (isAnchorExist) uiCallbacks.mount();
			else {
				uiCallbacks.unmount();
				if (options.once) uiCallbacks.stopAutoMount();
			}
		} catch (error) {
			if (abortController.signal.aborted && abortController.signal.reason === EXPLICIT_STOP_REASON) break;
			else throw error;
		}
	}
	observeElement(resolvedAnchor);
	return { stopAutoMount: _stopAutoMount };
}
//#endregion
export { applyPosition, createMountFunctions, mountUi };
