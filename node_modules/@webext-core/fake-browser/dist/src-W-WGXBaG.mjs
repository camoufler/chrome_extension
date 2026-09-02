import merge from "lodash.merge";
//#region src/utils/callback-utils.ts
function callbackOrUndefined(value) {
	return typeof value === "function" ? value : void 0;
}
function promiseOrCallback(callback, fn) {
	const res = fn();
	if (callback == null) return res instanceof Promise ? res : Promise.resolve(res);
	if (res instanceof Promise) res.then(callback, (err) => {
		const chrome = globalThis.chrome;
		if (chrome?.runtime) chrome.runtime.lastError = { message: err instanceof Error ? err.message : String(err) };
		callback(void 0);
		if (chrome?.runtime) chrome.runtime.lastError = void 0;
	});
	else callback(res);
}
//#endregion
//#region src/utils/defineEventWithTrigger.ts
function defineEventWithTrigger() {
	const listeners = [];
	return {
		hasListener(callback) {
			return listeners.includes(callback);
		},
		hasListeners() {
			return listeners.length > 0;
		},
		addListener(callback) {
			listeners.push(callback);
		},
		removeListener(callback) {
			const index = listeners.indexOf(callback);
			if (index >= 0) listeners.splice(index, 1);
		},
		removeAllListeners() {
			listeners.length = 0;
		},
		async trigger(...args) {
			return await Promise.all(listeners.map((l) => l(...args)));
		},
		addRules() {
			throw Error("Not implemented");
		},
		getRules() {
			throw Error("Not implemented");
		},
		removeRules() {
			throw Error("Not implemented");
		}
	};
}
//#endregion
//#region src/apis/action.ts
const onClicked$1 = defineEventWithTrigger();
function withWindowId(t) {
	return t;
}
const DEFAULT_BADGE_BACKGROUND_COLOR = "#5F5D5B";
const DEFAULT_BADGE_TEXT_COLOR = "#FFFFFF";
const badgeTextColorState = {
	global: DEFAULT_BADGE_TEXT_COLOR,
	tabs: /* @__PURE__ */ new Map(),
	windows: /* @__PURE__ */ new Map()
};
const badgeTextState = {
	global: "",
	tabs: /* @__PURE__ */ new Map(),
	windows: /* @__PURE__ */ new Map()
};
const badgeBackgroundColorState = {
	global: hexToRgbaArray(DEFAULT_BADGE_BACKGROUND_COLOR),
	tabs: /* @__PURE__ */ new Map(),
	windows: /* @__PURE__ */ new Map()
};
const titleState = {
	global: "",
	tabs: /* @__PURE__ */ new Map(),
	windows: /* @__PURE__ */ new Map()
};
function hexToRgbaArray(hex) {
	hex = hex.replace("#", "");
	let hasAlpha = hex.length === 8;
	let bigint = parseInt(hex, 16);
	return [
		bigint >> (hasAlpha ? 24 : 16) & 255,
		bigint >> (hasAlpha ? 16 : 8) & 255,
		bigint >> (hasAlpha ? 8 : 0) & 255,
		hasAlpha ? bigint & 255 : 255
	];
}
function getScopedValue(state, details) {
	if (!details) return state.global;
	const { tabId, windowId } = withWindowId(details);
	if (tabId !== void 0) return state.tabs.get(tabId);
	if (windowId !== void 0) return state.windows.get(windowId);
	return state.global;
}
const action = {
	resetState() {
		onClicked$1.removeAllListeners();
		badgeTextState.global = "";
		badgeTextState.tabs.clear();
		badgeTextState.windows.clear();
		badgeBackgroundColorState.global = hexToRgbaArray(DEFAULT_BADGE_BACKGROUND_COLOR);
		badgeBackgroundColorState.tabs.clear();
		badgeBackgroundColorState.windows.clear();
		badgeTextColorState.global = DEFAULT_BADGE_TEXT_COLOR;
		badgeTextColorState.tabs.clear();
		badgeTextColorState.windows.clear();
		titleState.global = "";
		titleState.tabs.clear();
		titleState.windows.clear();
	},
	setTitle(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const { title, tabId, windowId } = withWindowId(details);
			if (tabId !== void 0) if (title === null || title === void 0) titleState.tabs.delete(tabId);
			else titleState.tabs.set(tabId, title);
			else if (windowId !== void 0) if (title === null || title === void 0) titleState.windows.delete(windowId);
			else titleState.windows.set(windowId, title);
			else titleState.global = title ?? "";
		});
	},
	getTitle(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => getScopedValue(titleState, details) ?? "");
	},
	setBadgeText(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const { text, tabId, windowId } = withWindowId(details);
			if (tabId !== void 0) if (text === null || text === void 0) badgeTextState.tabs.delete(tabId);
			else badgeTextState.tabs.set(tabId, text);
			else if (windowId !== void 0) if (text === null || text === void 0) badgeTextState.windows.delete(windowId);
			else badgeTextState.windows.set(windowId, text);
			else badgeTextState.global = text ?? "";
		});
	},
	getBadgeText(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => getScopedValue(badgeTextState, details) ?? "");
	},
	setBadgeBackgroundColor(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const { color, tabId, windowId } = withWindowId(details);
			let rgbaColor;
			if (typeof color === "string") rgbaColor = hexToRgbaArray(color);
			else if (Array.isArray(color)) rgbaColor = [...color];
			else rgbaColor = hexToRgbaArray(DEFAULT_BADGE_BACKGROUND_COLOR);
			if (tabId !== void 0) badgeBackgroundColorState.tabs.set(tabId, rgbaColor);
			else if (windowId !== void 0) badgeBackgroundColorState.windows.set(windowId, rgbaColor);
			else badgeBackgroundColorState.global = rgbaColor;
		});
	},
	getBadgeBackgroundColor(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			return getScopedValue(badgeBackgroundColorState, details) ?? hexToRgbaArray(DEFAULT_BADGE_BACKGROUND_COLOR);
		});
	},
	setBadgeTextColor(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const { color, tabId, windowId } = withWindowId(details);
			let normalizedColor = typeof color === "string" ? color : DEFAULT_BADGE_TEXT_COLOR;
			if (tabId !== void 0) if (color === null || color === void 0) badgeTextColorState.tabs.delete(tabId);
			else badgeTextColorState.tabs.set(tabId, normalizedColor);
			else if (windowId !== void 0) if (color === null || color === void 0) badgeTextColorState.windows.delete(windowId);
			else badgeTextColorState.windows.set(windowId, normalizedColor);
			else badgeTextColorState.global = normalizedColor;
		});
	},
	getBadgeTextColor(details, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			return getScopedValue(badgeTextColorState, details) ?? DEFAULT_BADGE_TEXT_COLOR;
		});
	},
	onClicked: onClicked$1
};
//#endregion
//#region src/apis/alarms.ts
const alarmList = [];
const onAlarm = defineEventWithTrigger();
const alarms = {
	resetState() {
		alarmList.length = 0;
		onAlarm.removeAllListeners();
	},
	clear(arg1, arg2) {
		let name = "";
		let callback;
		if (arg2 != null) {
			name = arg1;
			callback = arg2;
		} else if (typeof arg1 === "string") name = arg1;
		else if (arg1 != null) callback = arg1;
		return promiseOrCallback(callback, () => {
			const index = alarmList.findIndex((alarm) => alarm.name === name);
			if (index >= 0) {
				alarmList.splice(index, 1);
				return true;
			}
			return false;
		});
	},
	clearAll(arg1) {
		return promiseOrCallback(callbackOrUndefined(arg1), () => {
			const hasAlarms = alarmList.length > 0;
			alarmList.length = 0;
			return hasAlarms;
		});
	},
	create(arg1, arg2, arg3) {
		let name = "";
		let alarmInfo;
		let callback;
		if (arg3 != null) {
			name = arg1;
			alarmInfo = arg2;
			callback = arg3;
		} else if (arg2 != null) if (arg1 == null || typeof arg1 === "string") {
			name = arg1 ?? "";
			alarmInfo = arg2;
		} else {
			alarmInfo = arg1;
			callback = arg2;
		}
		else alarmInfo = arg1;
		return promiseOrCallback(callback, () => {
			const i = alarmList.findIndex((alarm) => alarm.name === name);
			if (i >= 0) alarmList.splice(i, 1);
			alarmList.push({
				name,
				scheduledTime: alarmInfo.when ?? Date.now() + (alarmInfo.delayInMinutes ?? 0) * 6e4,
				periodInMinutes: alarmInfo.periodInMinutes,
				persistAcrossSessions: alarmInfo.persistAcrossSessions
			});
		});
	},
	get(arg1, arg2) {
		let name = "";
		let callback;
		if (arg2 != null) {
			name = arg1;
			callback = arg2;
		} else if (typeof arg1 === "string") name = arg1;
		else if (arg1 != null) callback = arg1;
		return promiseOrCallback(callback, () => alarmList.find((alarm) => alarm.name === name));
	},
	getAll(arg1) {
		return promiseOrCallback(callbackOrUndefined(arg1), () => [...alarmList]);
	},
	onAlarm
};
//#endregion
//#region src/apis/notifications.ts
let notificationMap = {};
const onClosed = defineEventWithTrigger();
const onClicked = defineEventWithTrigger();
const onButtonClicked = defineEventWithTrigger();
const onShown = defineEventWithTrigger();
function notificationExists(id) {
	return !!notificationMap[id];
}
const notifications = {
	resetState() {
		notificationMap = {};
		onClosed.removeAllListeners();
		onClicked.removeAllListeners();
		onButtonClicked.removeAllListeners();
		onShown.removeAllListeners();
	},
	create(arg1, arg2, arg3) {
		let id;
		let options;
		let callback;
		if (arg3 != null) {
			id = arg1;
			options = arg2;
			callback = arg3;
		} else if (arg2 != null) if (typeof arg1 === "string") {
			id = arg1;
			options = arg2;
		} else {
			options = arg1;
			callback = arg2;
		}
		else options = arg1;
		return promiseOrCallback(callback, async () => {
			id ??= String(Math.random());
			if (notificationExists(id)) await notifications.clear(id);
			notificationMap[id] = options;
			return id;
		});
	},
	clear(notificationId, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const wasCleared = notificationExists(notificationId);
			delete notificationMap[notificationId];
			return wasCleared;
		});
	},
	getAllCreateOptions() {
		return { ...notificationMap };
	},
	getAll(arg1) {
		return promiseOrCallback(callbackOrUndefined(arg1), () => Object.fromEntries(Object.keys(notificationMap).map((k) => [k, true])));
	},
	onClosed,
	onClicked,
	onButtonClicked,
	onShown
};
//#endregion
//#region src/apis/runtime.ts
const onMessage = defineEventWithTrigger();
const onInstalled = defineEventWithTrigger();
const onStartup = defineEventWithTrigger();
const onSuspend = defineEventWithTrigger();
const onSuspendCanceled = defineEventWithTrigger();
const onUpdateAvailable = defineEventWithTrigger();
const TEST_ID = "test-extension-id";
const runtime = {
	resetState() {
		onMessage.removeAllListeners();
		onInstalled.removeAllListeners();
		onStartup.removeAllListeners();
		onSuspend.removeAllListeners();
		onSuspendCanceled.removeAllListeners();
		onUpdateAvailable.removeAllListeners();
		runtime.id = TEST_ID;
	},
	id: TEST_ID,
	getURL(path) {
		return `chrome-extension://${runtime.id}/${path.replace(/^\//, "")}`;
	},
	sendMessage(arg1, arg2, arg3, arg4) {
		let message;
		let callback;
		if (arg4 != null) {
			message = arg2;
			callback = arg4;
		} else if (arg3 != null) if ((typeof arg1 === "string" || arg1 == null) && typeof arg3 === "function") {
			message = arg2;
			callback = arg3;
		} else if (typeof arg1 === "string") message = arg2;
		else {
			message = arg1;
			callback = arg3;
		}
		else if (arg2 != null) if (typeof arg2 === "function") {
			message = arg1;
			callback = arg2;
		} else if (typeof arg2 === "object" && "includeTlsChannelId" in arg2) message = arg1;
		else message = arg2;
		else message = arg1;
		return promiseOrCallback(callback, async () => {
			if (!onMessage.hasListeners()) throw Error("No listeners available");
			const sender = {};
			let sendResponse;
			const responsePromise = new Promise((resolve) => {
				sendResponse = resolve;
			});
			if ((await onMessage.trigger(message, sender, sendResponse)).some((res) => res === true)) return await responsePromise;
		});
	},
	onInstalled,
	onMessage,
	onStartup,
	onSuspend,
	onSuspendCanceled,
	onUpdateAvailable
};
//#endregion
//#region src/apis/storage.ts
const globalOnChanged = defineEventWithTrigger();
function keysAndCallback(arg1, arg2) {
	let keys;
	let callback;
	if (arg2 != null) {
		keys = arg1;
		callback = arg2;
	} else if (typeof arg1 === "function") callback = arg1;
	else if (arg1 != null) keys = arg1;
	return {
		keys,
		callback
	};
}
function defineStorageArea(area) {
	const data = {};
	const onChanged = defineEventWithTrigger();
	function getKeyList(keys) {
		return Array.isArray(keys) ? keys : [keys];
	}
	return {
		resetState() {
			onChanged.removeAllListeners();
			for (const key of Object.keys(data)) delete data[key];
		},
		clear(arg1) {
			return promiseOrCallback(callbackOrUndefined(arg1), async () => {
				const changes = {};
				for (const key of Object.keys(data)) {
					changes[key] = {
						oldValue: data[key] ?? null,
						newValue: null
					};
					delete data[key];
				}
				await onChanged.trigger(changes);
				await globalOnChanged.trigger(changes, area);
			});
		},
		get(arg1, arg2) {
			const { keys, callback } = keysAndCallback(arg1, arg2);
			return promiseOrCallback(callback, () => {
				if (keys == null) return { ...data };
				const res = {};
				if (typeof keys === "object" && !Array.isArray(keys)) Object.keys(keys).forEach((key) => res[key] = data[key] ?? keys[key]);
				else getKeyList(keys).forEach((key) => res[key] = data[key]);
				return res;
			});
		},
		remove(arg1, arg2) {
			const { keys, callback } = keysAndCallback(arg1, arg2);
			return promiseOrCallback(callback, async () => {
				const changes = {};
				for (const key of getKeyList(keys)) {
					changes[key] = {
						oldValue: data[key] ?? null,
						newValue: null
					};
					delete data[key];
				}
				await onChanged.trigger(changes);
				await globalOnChanged.trigger(changes, area);
			});
		},
		set(items, arg2) {
			return promiseOrCallback(callbackOrUndefined(arg2), async () => {
				const changes = {};
				for (const [key, newValue] of Object.entries(JSON.parse(JSON.stringify(items)))) {
					if (newValue === void 0) continue;
					changes[key] = {
						oldValue: data[key] ?? null,
						newValue
					};
					if (newValue == null) delete data[key];
					else data[key] = newValue;
				}
				await onChanged.trigger(changes);
				await globalOnChanged.trigger(changes, area);
			});
		},
		onChanged
	};
}
const localStorage = defineStorageArea("local");
const managedStorage = defineStorageArea("managed");
const sessionStorage = defineStorageArea("session");
const syncStorage = {
	...defineStorageArea("sync"),
	getBytesInUse: () => {
		throw Error("Browser.storage.sync.getBytesInUse not implemented.");
	}
};
const storage = {
	resetState() {
		localStorage.resetState();
		managedStorage.resetState();
		sessionStorage.resetState();
		syncStorage.resetState();
		globalOnChanged.removeAllListeners();
	},
	local: localStorage,
	managed: managedStorage,
	session: sessionStorage,
	sync: syncStorage,
	onChanged: globalOnChanged
};
//#endregion
//#region src/apis/windows.ts
const onCreated$1 = defineEventWithTrigger();
const onRemoved$1 = defineEventWithTrigger();
const onFocusChanged = defineEventWithTrigger();
const DEFAULT_WINDOW = {
	id: 0,
	alwaysOnTop: false,
	incognito: false
};
const DEFAULT_NEXT_WINDOW_ID = 1;
const windowList = [DEFAULT_WINDOW];
let focusedWindowId;
let lastFocusedWindowId;
let nextWindowId = DEFAULT_NEXT_WINDOW_ID;
function setFocusedWindowId(id) {
	lastFocusedWindowId = focusedWindowId;
	focusedWindowId = id;
}
function getNextWindowId() {
	const id = nextWindowId;
	nextWindowId++;
	return id;
}
function mapWindow(window, getInfo) {
	return {
		...window,
		tabs: getInfo?.populate ? tabList.filter((tab) => tab.windowId === window.id).map(mapTab) : void 0,
		focused: window.id === focusedWindowId
	};
}
function mapCreateType(type) {
	if (type == null) return void 0;
	if (type == "detached_panel") return "panel";
	return type;
}
const windows = {
	resetState() {
		windowList.length = 1;
		windowList[0] = DEFAULT_WINDOW;
		focusedWindowId = void 0;
		lastFocusedWindowId = void 0;
		nextWindowId = DEFAULT_NEXT_WINDOW_ID;
		onCreated$1.removeAllListeners();
		onRemoved$1.removeAllListeners();
		onFocusChanged.removeAllListeners();
	},
	get(windowId, arg2, arg3) {
		const queryOptions = typeof arg2 === "function" ? void 0 : arg2;
		return promiseOrCallback(typeof arg2 === "function" ? arg2 : arg3, async () => {
			const window = windowList.find((window) => window.id === windowId);
			if (!window) return void 0;
			return mapWindow(window, queryOptions);
		});
	},
	getCurrent(arg1, arg2) {
		const queryOptions = typeof arg1 === "function" ? void 0 : arg1;
		return promiseOrCallback(typeof arg1 === "function" ? arg1 : arg2, () => {
			if (focusedWindowId == null) return void 0;
			return windows.get(focusedWindowId, queryOptions);
		});
	},
	getLastFocused(arg1, arg2) {
		const queryOptions = typeof arg1 === "function" ? void 0 : arg1;
		return promiseOrCallback(typeof arg1 === "function" ? arg1 : arg2, () => {
			if (lastFocusedWindowId == null) return void 0;
			return windows.get(lastFocusedWindowId, queryOptions);
		});
	},
	getAll(arg1, arg2) {
		const queryOptions = typeof arg1 === "function" ? void 0 : arg1;
		return promiseOrCallback(typeof arg1 === "function" ? arg1 : arg2, () => windowList.map((window) => mapWindow(window, queryOptions)));
	},
	create(arg1, arg2) {
		const createData = typeof arg1 === "function" ? void 0 : arg1;
		return promiseOrCallback(typeof arg1 === "function" ? arg1 : arg2, async () => {
			const newWindow = {
				id: getNextWindowId(),
				alwaysOnTop: false,
				incognito: createData?.incognito ?? false,
				height: createData?.height,
				left: createData?.left,
				state: createData?.state,
				top: createData?.top,
				type: mapCreateType(createData?.type),
				width: createData?.width
			};
			windowList.push(newWindow);
			if (createData?.focused) setFocusedWindowId(newWindow.id);
			const fullWindow = mapWindow(newWindow);
			await onCreated$1.trigger(fullWindow);
			if (createData?.focused) onFocusChanged.trigger(fullWindow.id);
			return fullWindow;
		});
	},
	update(windowId, arg2, arg3) {
		return promiseOrCallback(typeof arg2 === "function" ? arg2 : arg3, () => {
			const window = windowList.find((window) => window.id === windowId);
			if (!window) return void 0;
			return mapWindow(window);
		});
	},
	remove(windowId, arg1) {
		return promiseOrCallback(typeof arg1 === "function" ? arg1 : void 0, async () => {
			const index = windowList.findIndex((window) => window.id === windowId);
			if (index < 0) return;
			windowList.splice(index, 1);
			await onRemoved$1.trigger(windowId);
		});
	},
	onCreated: onCreated$1,
	onRemoved: onRemoved$1,
	onFocusChanged
};
//#endregion
//#region src/apis/tabs.ts
const onActivated = defineEventWithTrigger();
const onCreated = defineEventWithTrigger();
const onUpdated = defineEventWithTrigger();
const onHighlighted = defineEventWithTrigger();
const onRemoved = defineEventWithTrigger();
const DEFAULT_TAB = {
	id: 0,
	index: 0,
	highlighted: false,
	incognito: false,
	pinned: false,
	windowId: DEFAULT_WINDOW.id,
	autoDiscardable: false,
	discarded: false,
	frozen: false,
	groupId: 0,
	selected: false
};
const DEFAULT_NEXT_TAB_ID = 1;
const tabList = [DEFAULT_TAB];
let activeTabId;
let nextTabId = DEFAULT_NEXT_TAB_ID;
function setActiveTabId(id) {
	activeTabId = id;
}
function getNextTabId() {
	const id = nextTabId;
	nextTabId++;
	return id;
}
function mapTab(tab) {
	return {
		...tab,
		active: activeTabId === tab.id
	};
}
const tabs = {
	resetState() {
		tabList.length = 1;
		tabList[0] = DEFAULT_TAB;
		activeTabId = void 0;
		nextTabId = DEFAULT_NEXT_TAB_ID;
		onActivated.removeAllListeners();
		onCreated.removeAllListeners();
		onUpdated.removeAllListeners();
		onHighlighted.removeAllListeners();
		onRemoved.removeAllListeners();
	},
	get(tabId, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), () => {
			const tab = tabList.find((tab) => tab.id === tabId);
			if (!tab) return void 0;
			return mapTab(tab);
		});
	},
	getCurrent(arg1) {
		return promiseOrCallback(callbackOrUndefined(arg1), () => {
			if (activeTabId == null) return void 0;
			return tabs.get(activeTabId);
		});
	},
	create(createProperties, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), async () => {
			const window = createProperties.windowId ? await windows.get(createProperties.windowId, { populate: true }) : await windows.getCurrent({ populate: true });
			const newTab = {
				...DEFAULT_TAB,
				index: window?.tabs?.length ?? 0,
				pinned: createProperties.pinned ?? false,
				windowId: window?.id ?? 0,
				id: getNextTabId(),
				url: createProperties.url
			};
			if (createProperties.active) setActiveTabId(newTab.id);
			tabList.push(newTab);
			const fullTab = mapTab(newTab);
			await onCreated.trigger(fullTab);
			if (createProperties.active) await onActivated.trigger({
				tabId: newTab.id,
				windowId: newTab.windowId
			});
			return fullTab;
		});
	},
	duplicate(tabId, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), async () => {
			const tab = await tabs.get(tabId);
			const fullTab = mapTab({
				...tab,
				id: getNextTabId()
			});
			await onCreated.trigger(fullTab);
			return tab;
		});
	},
	query(queryInfo, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), async () => {
			const currentWindow = await windows.getCurrent();
			const lastFocusedWindow = await windows.getLastFocused();
			return tabList.filter((tab) => {
				let res = true;
				if (queryInfo.active != null) res = res && activeTabId === tab.id;
				if (queryInfo.audible != null) res = res && tab.audible === queryInfo.audible;
				if (queryInfo.autoDiscardable != null) res = res && tab.autoDiscardable === queryInfo.autoDiscardable;
				if (queryInfo.currentWindow != null && queryInfo.currentWindow) res = res && currentWindow.id === tab.windowId;
				if (queryInfo.currentWindow != null && !queryInfo.currentWindow) res = res && currentWindow.id !== tab.windowId;
				if (queryInfo.windowId != null) res = res && tab.windowId === queryInfo.windowId;
				if (queryInfo.discarded != null) res = res && tab.discarded === queryInfo.discarded;
				if (queryInfo.highlighted != null) res = res && tab.highlighted === queryInfo.highlighted;
				if (queryInfo.index != null) res = res && tab.index === queryInfo.index;
				if (queryInfo.lastFocusedWindow != null && queryInfo.lastFocusedWindow) res = res && lastFocusedWindow.id === tab.windowId;
				if (queryInfo.lastFocusedWindow != null && !queryInfo.lastFocusedWindow) res = res && lastFocusedWindow.id !== tab.windowId;
				if (queryInfo.muted != null) res = res && tab.mutedInfo?.muted === queryInfo.muted;
				if (queryInfo.pinned != null) res = res && tab.pinned === queryInfo.pinned;
				if (queryInfo.status != null) res = res && tab.status === queryInfo.status;
				if (queryInfo.title != null) res = res && tab.title == queryInfo.title;
				if (queryInfo.url != null) res = res && tab.url === queryInfo.url;
				if (queryInfo.windowType != null) res = false;
				return res;
			}).map(mapTab);
		});
	},
	highlight(highlightInfo, arg2) {
		return promiseOrCallback(callbackOrUndefined(arg2), async () => {
			const tabIds = Array.isArray(highlightInfo.tabs) ? highlightInfo.tabs : [highlightInfo.tabs];
			let window;
			for (const tabId of tabIds) {
				const tab = await tabs.get(tabId);
				if (tab) {
					window = await windows.get(tab.windowId);
					tab.highlighted = true;
				}
			}
			await onHighlighted.trigger({
				tabIds,
				windowId: window.id
			});
			return window;
		});
	},
	update(arg1, arg2, arg3) {
		let tabId;
		let updateInfo;
		let callback;
		if (arg3 != null) {
			tabId = arg1;
			updateInfo = arg2;
			callback = arg3;
		} else if (arg2 != null) if (typeof arg1 === "number") {
			tabId = arg1;
			updateInfo = arg2;
		} else {
			updateInfo = arg1;
			callback = arg2;
		}
		else updateInfo = arg1;
		return promiseOrCallback(callback, async () => {
			if (tabId == null) tabId = (await windows.getCurrent()).tabs.find((tab) => tab.active).id;
			const tab = await tabs.get(tabId);
			if (!tab) throw new Error("Tab not found");
			const updatedTab = {
				...tab,
				...updateInfo
			};
			const tabIndex = tabList.findIndex((tab) => tab.id === tabId);
			tabList[tabIndex] = updatedTab;
			const fullTab = mapTab(updatedTab);
			await onUpdated.trigger(fullTab.id, updateInfo, fullTab);
			if (updatedTab.active) {
				setActiveTabId(updatedTab.id);
				await onActivated.trigger({
					tabId: updatedTab.id,
					windowId: updatedTab.windowId
				});
			}
			return fullTab;
		});
	},
	remove(arg1, arg2) {
		const tabIds = Array.isArray(arg1) ? arg1 : [arg1];
		return promiseOrCallback(callbackOrUndefined(arg2), async () => {
			const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
			for (const id of ids) {
				const index = tabList.findIndex((tab) => tab.id === id);
				if (index >= 0) {
					const [removed] = tabList.splice(index, 1);
					const window = await windows.get(removed.id, { populate: true });
					await onRemoved.trigger(id, {
						isWindowClosing: false,
						windowId: window.id
					});
					if (!window.tabs?.length) await windows.remove(window.id);
				}
			}
		});
	},
	onCreated,
	onUpdated,
	onActivated,
	onHighlighted,
	onRemoved
};
//#endregion
//#region src/apis/webNavigation.ts
const webNavigation = {
	onBeforeNavigate: defineEventWithTrigger(),
	onCommitted: defineEventWithTrigger(),
	onCompleted: defineEventWithTrigger(),
	onCreatedNavigationTarget: defineEventWithTrigger(),
	onDOMContentLoaded: defineEventWithTrigger(),
	onErrorOccurred: defineEventWithTrigger(),
	onHistoryStateUpdated: defineEventWithTrigger(),
	onReferenceFragmentUpdated: defineEventWithTrigger(),
	onTabReplaced: defineEventWithTrigger()
};
//#endregion
//#region src/base.ts
var MockNotImplementedError = class extends Error {
	constructor(chain) {
		super(`${chain} not implemented: mock the function yourself using your testing framework, or submit a PR with an in-memory implementation.`);
	}
};
const notMockedFunction = (chain) => () => {
	throw new MockNotImplementedError(chain);
};
const notMockedEventWithRules = (chain) => ({
	addListener: notMockedFunction(`${chain}.addListener`),
	addRules: notMockedFunction(`${chain}.addRules`),
	removeListener: notMockedFunction(`${chain}.removeListener`),
	removeRules: notMockedFunction(`${chain}.removeRules`),
	hasListener: notMockedFunction(`${chain}.hasListener`),
	getRules: notMockedFunction(`${chain}.getRules`),
	hasListeners: notMockedFunction(`${chain}.hasListeners`)
});
const notMockedChromeSetting = (chain) => ({
	clear: notMockedFunction(`${chain}.clear`),
	set: notMockedFunction(`${chain}.set`),
	get: notMockedFunction(`${chain}.get`),
	onChange: notMockedEventWithRules(`${chain}.onChange`)
});
const notMockedContentSetting = (chain) => ({
	clear: notMockedFunction(`${chain}.clear`),
	get: notMockedFunction(`${chain}.get`),
	getResourceIdentifiers: notMockedFunction(`${chain}.getResourceIdentifiers`),
	set: notMockedFunction(`${chain}.set`)
});
const notMockedClass = (chain) => class {
	constructor() {
		throw new MockNotImplementedError(chain);
	}
};
const emptyEnum = () => ({});
/** An in-memory implementation of the `browser` global. */
const fakeBrowser = merge({
	accessibilityFeatures: {
		animationPolicy: notMockedChromeSetting("accessibilityFeatures.animationPolicy"),
		autoclick: notMockedChromeSetting("accessibilityFeatures.autoclick"),
		caretHighlight: notMockedChromeSetting("accessibilityFeatures.caretHighlight"),
		cursorColor: notMockedChromeSetting("accessibilityFeatures.cursorColor"),
		cursorHighlight: notMockedChromeSetting("accessibilityFeatures.cursorHighlight"),
		dictation: notMockedChromeSetting("accessibilityFeatures.dictation"),
		dockedMagnifier: notMockedChromeSetting("accessibilityFeatures.dockedMagnifier"),
		focusHighlight: notMockedChromeSetting("accessibilityFeatures.focusHighlight"),
		highContrast: notMockedChromeSetting("accessibilityFeatures.highContrast"),
		largeCursor: notMockedChromeSetting("accessibilityFeatures.largeCursor"),
		screenMagnifier: notMockedChromeSetting("accessibilityFeatures.screenMagnifier"),
		selectToSpeak: notMockedChromeSetting("accessibilityFeatures.selectToSpeak"),
		spokenFeedback: notMockedChromeSetting("accessibilityFeatures.spokenFeedback"),
		stickyKeys: notMockedChromeSetting("accessibilityFeatures.stickyKeys"),
		switchAccess: notMockedChromeSetting("accessibilityFeatures.switchAccess"),
		virtualKeyboard: notMockedChromeSetting("accessibilityFeatures.virtualKeyboard")
	},
	action: {
		disable: notMockedFunction("action.disable"),
		enable: notMockedFunction("action.enable"),
		getBadgeBackgroundColor: notMockedFunction("action.getBadgeBackgroundColor"),
		getBadgeText: notMockedFunction("action.getBadgeText"),
		getBadgeTextColor: notMockedFunction("action.getBadgeTextColor"),
		getPopup: notMockedFunction("action.getPopup"),
		getTitle: notMockedFunction("action.getTitle"),
		getUserSettings: notMockedFunction("action.getUserSettings"),
		isEnabled: notMockedFunction("action.isEnabled"),
		openPopup: notMockedFunction("action.openPopup"),
		setBadgeBackgroundColor: notMockedFunction("action.setBadgeBackgroundColor"),
		setBadgeText: notMockedFunction("action.setBadgeText"),
		setBadgeTextColor: notMockedFunction("action.setBadgeTextColor"),
		setIcon: notMockedFunction("action.setIcon"),
		setPopup: notMockedFunction("action.setPopup"),
		setTitle: notMockedFunction("action.setTitle"),
		onClicked: notMockedEventWithRules("action.onClicked"),
		onUserSettingsChanged: notMockedEventWithRules("action.onUserSettingsChanged")
	},
	alarms: {
		clear: notMockedFunction("alarms.clear"),
		clearAll: notMockedFunction("alarms.clearAll"),
		create: notMockedFunction("alarms.create"),
		get: notMockedFunction("alarms.get"),
		getAll: notMockedFunction("alarms.getAll"),
		onAlarm: notMockedEventWithRules("alarms.onAlarm")
	},
	audio: {
		DeviceType: emptyEnum(),
		StreamType: emptyEnum(),
		getDevices: notMockedFunction("audio.getDevices"),
		getMute: notMockedFunction("audio.getMute"),
		setActiveDevices: notMockedFunction("audio.setActiveDevices"),
		setMute: notMockedFunction("audio.setMute"),
		setProperties: notMockedFunction("audio.setProperties"),
		onDeviceListChanged: notMockedEventWithRules("audio.onDeviceListChanged"),
		onLevelChanged: notMockedEventWithRules("audio.onLevelChanged"),
		onMuteChanged: notMockedEventWithRules("audio.onMuteChanged")
	},
	bookmarks: {
		ROOT_NODE_ID: "0",
		MAX_WRITE_OPERATIONS_PER_HOUR: 1e6,
		MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: 1e6,
		BookmarkTreeNodeUnmodifiable: emptyEnum(),
		FolderType: emptyEnum(),
		create: notMockedFunction("bookmarks.create"),
		get: notMockedFunction("bookmarks.get"),
		getChildren: notMockedFunction("bookmarks.getChildren"),
		getRecent: notMockedFunction("bookmarks.getRecent"),
		getSubTree: notMockedFunction("bookmarks.getSubTree"),
		getTree: notMockedFunction("bookmarks.getTree"),
		move: notMockedFunction("bookmarks.move"),
		remove: notMockedFunction("bookmarks.remove"),
		removeTree: notMockedFunction("bookmarks.removeTree"),
		search: notMockedFunction("bookmarks.search"),
		update: notMockedFunction("bookmarks.update"),
		onChanged: notMockedEventWithRules("bookmarks.onChanged"),
		onChildrenReordered: notMockedEventWithRules("bookmarks.onChildrenReordered"),
		onCreated: notMockedEventWithRules("bookmarks.onCreated"),
		onImportBegan: notMockedEventWithRules("bookmarks.onImportBegan"),
		onImportEnded: notMockedEventWithRules("bookmarks.onImportEnded"),
		onMoved: notMockedEventWithRules("bookmarks.onMoved"),
		onRemoved: notMockedEventWithRules("bookmarks.onRemoved")
	},
	browserAction: {
		disable: notMockedFunction("action.disable"),
		enable: notMockedFunction("action.enable"),
		getBadgeBackgroundColor: notMockedFunction("action.getBadgeBackgroundColor"),
		getBadgeText: notMockedFunction("action.getBadgeText"),
		getPopup: notMockedFunction("action.getPopup"),
		getTitle: notMockedFunction("action.getTitle"),
		setBadgeBackgroundColor: notMockedFunction("action.setBadgeBackgroundColor"),
		setBadgeText: notMockedFunction("action.setBadgeText"),
		setIcon: notMockedFunction("action.setIcon"),
		setPopup: notMockedFunction("action.setPopup"),
		setTitle: notMockedFunction("action.setTitle"),
		onClicked: notMockedEventWithRules("action.onClicked")
	},
	browsingData: {
		settings: notMockedFunction("browsingData.settings"),
		removePluginData: notMockedFunction("removePluginData"),
		removeServiceWorkers: notMockedFunction("removeServiceWorkers"),
		removeFormData: notMockedFunction("removeFormData"),
		removeFileSystems: notMockedFunction("removeFileSystems"),
		remove: notMockedFunction("remove"),
		removePasswords: notMockedFunction("removePasswords"),
		removeCookies: notMockedFunction("removeCookies"),
		removeWebSQL: notMockedFunction("removeWebSQL"),
		removeAppcache: notMockedFunction("removeAppcache"),
		removeCacheStorage: notMockedFunction("removeCacheStorage"),
		removeDownloads: notMockedFunction("removeDownloads"),
		removeLocalStorage: notMockedFunction("removeLocalStorage"),
		removeCache: notMockedFunction("removeCache"),
		removeHistory: notMockedFunction("removeHistory"),
		removeIndexedDB: notMockedFunction("removeIndexedDB")
	},
	certificateProvider: {
		Algorithm: emptyEnum(),
		Error: emptyEnum(),
		Hash: emptyEnum(),
		PinRequestErrorType: emptyEnum(),
		PinRequestType: emptyEnum(),
		reportSignature: notMockedFunction("certificateProvider.reportSignature"),
		setCertificates: notMockedFunction("certificateProvider.setCertificates"),
		requestPin: notMockedFunction("certificateProvider.requestPin"),
		stopPinRequest: notMockedFunction("certificateProvider.stopPinRequest"),
		onCertificatesUpdateRequested: notMockedEventWithRules("certificateProvider.onCertificatesUpdateRequested"),
		onSignatureRequested: notMockedEventWithRules("certificateProvider.onSignatureRequested")
	},
	commands: {
		getAll: notMockedFunction("commands.getAll"),
		onCommand: notMockedEventWithRules("commands.onCommand")
	},
	contentSettings: {
		AutoVerifyContentSetting: emptyEnum(),
		CameraContentSetting: emptyEnum(),
		ClipboardContentSetting: emptyEnum(),
		CookiesContentSetting: emptyEnum(),
		FullscreenContentSetting: emptyEnum(),
		ImagesContentSetting: emptyEnum(),
		JavascriptContentSetting: emptyEnum(),
		LocationContentSetting: emptyEnum(),
		MicrophoneContentSetting: emptyEnum(),
		MouselockContentSetting: emptyEnum(),
		MultipleAutomaticDownloadsContentSetting: emptyEnum(),
		NotificationsContentSetting: emptyEnum(),
		PluginsContentSetting: emptyEnum(),
		PopupsContentSetting: emptyEnum(),
		PpapiBrokerContentSetting: emptyEnum(),
		Scope: emptyEnum(),
		SoundContentSetting: emptyEnum(),
		automaticDownloads: notMockedContentSetting("contentSettings.automaticDownloads"),
		autoVerify: notMockedContentSetting("contentSettings.autoVerify"),
		camera: notMockedContentSetting("contentSettings.camera"),
		clipboard: notMockedContentSetting("contentSettings.clipboard"),
		cookies: notMockedContentSetting("contentSettings.cookies"),
		fullscreen: notMockedContentSetting("contentSettings.fullscreen"),
		images: notMockedContentSetting("contentSettings.images"),
		javascript: notMockedContentSetting("contentSettings.javascript"),
		location: notMockedContentSetting("contentSettings.location"),
		microphone: notMockedContentSetting("contentSettings.microphone"),
		mouselock: notMockedContentSetting("contentSettings.mouselock"),
		notifications: notMockedContentSetting("contentSettings.notifications"),
		popups: notMockedContentSetting("contentSettings.popups"),
		plugins: notMockedContentSetting("contentSettings.plugins"),
		unsandboxedPlugins: notMockedContentSetting("contentSettings.unsandboxedPlugins")
	},
	contextMenus: {
		ACTION_MENU_TOP_LEVEL_LIMIT: 6,
		ContextType: emptyEnum(),
		ItemType: emptyEnum(),
		create: notMockedFunction("contextMenus.create"),
		remove: notMockedFunction("contextMenus.remove"),
		removeAll: notMockedFunction("contextMenus.removeAll"),
		update: notMockedFunction("contextMenus.update"),
		onClicked: notMockedEventWithRules("contextMenus.onClicked")
	},
	cookies: {
		OnChangedCause: emptyEnum(),
		SameSiteStatus: emptyEnum(),
		get: notMockedFunction("cookies.get"),
		getAll: notMockedFunction("cookies.getAll"),
		getAllCookieStores: notMockedFunction("cookies.getAllCookieStores"),
		getPartitionKey: notMockedFunction("cookies.getPartitionKey"),
		remove: notMockedFunction("cookies.remove"),
		set: notMockedFunction("cookies.set"),
		onChanged: notMockedEventWithRules("cookies.onChanged")
	},
	debugger: {
		DetachReason: emptyEnum(),
		TargetInfoType: emptyEnum(),
		attach: notMockedFunction("debugger.attach"),
		detach: notMockedFunction("debugger.detach"),
		getTargets: notMockedFunction("debugger.getTargets"),
		sendCommand: notMockedFunction("debugger.sendCommand"),
		onDetach: notMockedEventWithRules("debugger.onDetach"),
		onEvent: notMockedEventWithRules("debugger.onEvent")
	},
	declarativeContent: {
		onPageChanged: notMockedEventWithRules("declarativeContent.onPageChanged"),
		PageStateMatcher: notMockedClass("declarativeContent.PageStateMatcher"),
		ShowAction: notMockedClass("declarativeContent.ShowAction"),
		ShowPageAction: notMockedClass("declarativeContent.ShowPageAction"),
		SetIcon: notMockedClass("declarativeContent.SetIcon"),
		RequestContentScript: notMockedClass("declarativeContent.RequestContentScript")
	},
	declarativeNetRequest: {
		DYNAMIC_RULESET_ID: "_dynamic",
		SESSION_RULESET_ID: "_session",
		GETMATCHEDRULES_QUOTA_INTERVAL: 10,
		GUARANTEED_MINIMUM_STATIC_RULES: 3e4,
		MAX_GETMATCHEDRULES_CALLS_PER_INTERVAL: 20,
		MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES: 5e3,
		MAX_NUMBER_OF_DYNAMIC_RULES: 3e4,
		MAX_NUMBER_OF_SESSION_RULES: 5e3,
		MAX_NUMBER_OF_UNSAFE_DYNAMIC_RULES: 5e3,
		MAX_NUMBER_OF_UNSAFE_SESSION_RULES: 5e3,
		MAX_NUMBER_OF_REGEX_RULES: 1e3,
		MAX_NUMBER_OF_STATIC_RULESETS: 100,
		MAX_NUMBER_OF_ENABLED_STATIC_RULESETS: 50,
		DomainType: emptyEnum(),
		ResourceType: emptyEnum(),
		RuleActionType: emptyEnum(),
		HeaderOperation: emptyEnum(),
		RequestMethod: emptyEnum(),
		UnsupportedRegexReason: emptyEnum(),
		RuleConditionKeys: emptyEnum(),
		getAvailableStaticRuleCount: notMockedFunction("declarativeNetRequest.getAvailableStaticRuleCount"),
		getDisabledRuleIds: notMockedFunction("declarativeNetRequest.getDisabledRuleIds"),
		getDynamicRules: notMockedFunction("declarativeNetRequest.getDynamicRules"),
		getEnabledRulesets: notMockedFunction("declarativeNetRequest.getEnabledRulesets"),
		getMatchedRules: notMockedFunction("declarativeNetRequest.getMatchedRules"),
		getSessionRules: notMockedFunction("declarativeNetRequest.getSessionRules"),
		isRegexSupported: notMockedFunction("declarativeNetRequest.isRegexSupported"),
		setExtensionActionOptions: notMockedFunction("declarativeNetRequest.setExtensionActionOptions"),
		testMatchOutcome: notMockedFunction("declarativeNetRequest.testMatchOutcome"),
		updateDynamicRules: notMockedFunction("declarativeNetRequest.updateDynamicRules"),
		updateEnabledRulesets: notMockedFunction("declarativeNetRequest.updateEnabledRulesets"),
		updateSessionRules: notMockedFunction("declarativeNetRequest.updateSessionRules"),
		updateStaticRules: notMockedFunction("declarativeNetRequest.updateStaticRules"),
		onRuleMatchedDebug: notMockedEventWithRules("declarativeNetRequest.onRuleMatchedDebug")
	},
	desktopCapture: {
		DesktopCaptureSourceType: emptyEnum(),
		chooseDesktopMedia: notMockedFunction("desktopCapture.chooseDesktopMedia"),
		cancelChooseDesktopMedia: notMockedFunction("desktopCapture.cancelChooseDesktopMedia")
	},
	devtools: {
		inspectedWindow: {
			tabId: 0,
			eval: notMockedFunction("devtools.inspectedWindow.eval"),
			getResources: notMockedFunction("devtools.inspectedWindow.getResources"),
			reload: notMockedFunction("devtools.inspectedWindow.reload"),
			onResourceAdded: notMockedEventWithRules("devtools.inspectedWindow.onResourceAdded"),
			onResourceContentCommitted: notMockedEventWithRules("devtools.inspectedWindow.onResourceContentCommitted")
		},
		network: {
			getHAR: notMockedFunction("devtools.network.getHAR"),
			onNavigated: notMockedEventWithRules("devtools.network.onNavigated"),
			onRequestFinished: notMockedEventWithRules("devtools.network.onRequestFinished")
		},
		panels: {
			themeName: "default",
			create: notMockedFunction("devtools.panels.create"),
			setOpenResourceHandler: notMockedFunction("devtools.panels.setOpenResourceHandler"),
			openResource: notMockedFunction("devtools.panels.openResource"),
			setThemeChangeHandler: notMockedFunction("devtools.panels.setThemeChangeHandler"),
			elements: {
				createSidebarPane: notMockedFunction("devtools.panels.elements.createSidebarPane"),
				onSelectionChanged: notMockedEventWithRules("devtools.panels.elements.onSelectionChanged")
			},
			sources: {
				createSidebarPane: notMockedFunction("devtools.panels.sources.createSidebarPane"),
				onSelectionChanged: notMockedEventWithRules("devtools.panels.sources.onSelectionChanged")
			}
		},
		performance: {
			onProfilingStarted: notMockedEventWithRules("devtools.performance.onProfilingStarted"),
			onProfilingStopped: notMockedEventWithRules("devtools.performance.onProfilingStopped")
		},
		recorder: {
			createView: notMockedFunction("devtools.recorder.createView"),
			registerRecorderExtensionPlugin: notMockedFunction("devtools.recorder.registerRecorderExtensionPlugin")
		}
	},
	downloads: {
		DangerType: emptyEnum(),
		FilenameConflictAction: emptyEnum(),
		InterruptReason: emptyEnum(),
		State: emptyEnum(),
		HttpMethod: emptyEnum(),
		acceptDanger: notMockedFunction("downloads.acceptDanger"),
		cancel: notMockedFunction("downloads.cancel"),
		download: notMockedFunction("downloads.download"),
		erase: notMockedFunction("downloads.erase"),
		getFileIcon: notMockedFunction("downloads.getFileIcon"),
		open: notMockedFunction("downloads.open"),
		pause: notMockedFunction("downloads.pause"),
		removeFile: notMockedFunction("downloads.removeFile"),
		resume: notMockedFunction("downloads.resume"),
		search: notMockedFunction("downloads.search"),
		setShelfEnabled: notMockedFunction("downloads.setShelfEnabled"),
		setUiOptions: notMockedFunction("downloads.setUiOptions"),
		show: notMockedFunction("downloads.show"),
		showDefaultFolder: notMockedFunction("downloads.showDefaultFolder"),
		onCreated: notMockedEventWithRules("downloads.onCreated"),
		onChanged: notMockedEventWithRules("downloads.onChanged"),
		onDeterminingFilename: notMockedEventWithRules("downloads.onDeterminingFilename"),
		onErased: notMockedEventWithRules("downloads.onErased")
	},
	extension: {
		inIncognitoContext: false,
		lastError: void 0,
		ViewType: emptyEnum(),
		getBackgroundPage: notMockedFunction("extension.getBackgroundPage"),
		getURL: notMockedFunction("extension.getURL"),
		getViews: notMockedFunction("extension.getViews"),
		isAllowedFileSchemeAccess: notMockedFunction("extension.isAllowedFileSchemeAccess"),
		isAllowedIncognitoAccess: notMockedFunction("extension.isAllowedIncognitoAccess"),
		setUpdateUrlData: notMockedFunction("extension.setUpdateUrlData"),
		sendRequest: notMockedFunction("extension.sendRequest"),
		getExtensionTabs: notMockedFunction("extension.getExtensionTabs"),
		onRequest: notMockedEventWithRules("extension.onRequest"),
		onRequestExternal: notMockedEventWithRules("extension.onRequestExternal")
	},
	history: {
		TransitionType: emptyEnum(),
		addUrl: notMockedFunction("history.addUrl"),
		deleteAll: notMockedFunction("history.deleteAll"),
		deleteRange: notMockedFunction("history.deleteRange"),
		deleteUrl: notMockedFunction("history.deleteUrl"),
		getVisits: notMockedFunction("history.getVisits"),
		search: notMockedFunction("history.search"),
		onVisitRemoved: notMockedEventWithRules("history.onVisitRemoved"),
		onVisited: notMockedEventWithRules("history.onVisited")
	},
	i18n: {
		detectLanguage: notMockedFunction("i18n.detectLanguage"),
		getAcceptLanguages: notMockedFunction("i18n.getAcceptLanguages"),
		getMessage: notMockedFunction("i18n.getMessage"),
		getUILanguage: notMockedFunction("i18n.getUILanguage")
	},
	identity: {
		AccountStatus: emptyEnum(),
		getAccounts: notMockedFunction("identity.getAccounts"),
		getAuthToken: notMockedFunction("identity.getAuthToken"),
		getProfileUserInfo: notMockedFunction("identity.getProfileUserInfo"),
		getRedirectURL: notMockedFunction("identity.getRedirectURL"),
		launchWebAuthFlow: notMockedFunction("identity.launchWebAuthFlow"),
		removeCachedAuthToken: notMockedFunction("identity.removeCachedAuthToken"),
		clearAllCachedAuthTokens: notMockedFunction("identity.clearAllCachedAuthTokens"),
		onSignInChanged: notMockedEventWithRules("identity.onSignInChanged")
	},
	idle: {
		IdleState: emptyEnum(),
		queryState: notMockedFunction("idle.queryState"),
		setDetectionInterval: notMockedFunction("idle.setDetectionInterval"),
		getAutoLockDelay: notMockedFunction("idle.getAutoLockDelay"),
		onStateChanged: notMockedEventWithRules("idle.onStateChanged")
	},
	management: {
		ExtensionDisabledReason: emptyEnum(),
		ExtensionInstallType: emptyEnum(),
		ExtensionType: emptyEnum(),
		LaunchType: emptyEnum(),
		get: notMockedFunction("management.get"),
		getAll: notMockedFunction("management.getAll"),
		getSelf: notMockedFunction("management.getSelf"),
		launchApp: notMockedFunction("management.launchApp"),
		setEnabled: notMockedFunction("management.setEnabled"),
		setLaunchType: notMockedFunction("management.setLaunchType"),
		uninstall: notMockedFunction("management.uninstall"),
		uninstallSelf: notMockedFunction("management.uninstallSelf"),
		createAppShortcut: notMockedFunction("management.createAppShortcut"),
		generateAppForLink: notMockedFunction("management.generateAppForLink"),
		getPermissionWarningsById: notMockedFunction("management.getPermissionWarningsById"),
		getPermissionWarningsByManifest: notMockedFunction("management.getPermissionWarningsByManifest"),
		installReplacementWebApp: notMockedFunction("management.installReplacementWebApp"),
		onDisabled: notMockedEventWithRules("management.onDisabled"),
		onEnabled: notMockedEventWithRules("management.onEnabled"),
		onInstalled: notMockedEventWithRules("management.onInstalled"),
		onUninstalled: notMockedEventWithRules("management.onUninstalled")
	},
	notifications: {
		PermissionLevel: emptyEnum(),
		TemplateType: emptyEnum(),
		clear: notMockedFunction("notifications.clear"),
		create: notMockedFunction("notifications.create"),
		getAll: notMockedFunction("notifications.getAll"),
		getPermissionLevel: notMockedFunction("notifications.getPermissionLevel"),
		update: notMockedFunction("notifications.update"),
		onButtonClicked: notMockedEventWithRules("notifications.onButtonClicked"),
		onClicked: notMockedEventWithRules("notifications.onClicked"),
		onClosed: notMockedEventWithRules("notifications.onClosed"),
		onPermissionLevelChanged: notMockedEventWithRules("notifications.onPermissionLevelChanged"),
		onShowSettings: notMockedEventWithRules("notifications.onShowSettings")
	},
	omnibox: {
		OnInputEnteredDisposition: emptyEnum(),
		DescriptionStyleType: emptyEnum(),
		setDefaultSuggestion: notMockedFunction("omnibox.setDefaultSuggestion"),
		onInputCancelled: notMockedEventWithRules("omnibox.onInputCancelled"),
		onInputChanged: notMockedEventWithRules("omnibox.onInputChanged"),
		onInputEntered: notMockedEventWithRules("omnibox.onInputEntered"),
		onInputStarted: notMockedEventWithRules("omnibox.onInputStarted"),
		onDeleteSuggestion: notMockedEventWithRules("omnibox.onDeleteSuggestion")
	},
	pageAction: {
		getPopup: notMockedFunction("pageAction.getPopup"),
		getTitle: notMockedFunction("pageAction.getTitle"),
		hide: notMockedFunction("pageAction.hide"),
		setIcon: notMockedFunction("pageAction.setIcon"),
		setPopup: notMockedFunction("pageAction.setPopup"),
		setTitle: notMockedFunction("pageAction.setTitle"),
		show: notMockedFunction("pageAction.show"),
		onClicked: notMockedEventWithRules("pageAction.onClicked")
	},
	permissions: {
		contains: notMockedFunction("permissions.contains"),
		getAll: notMockedFunction("permissions.getAll"),
		remove: notMockedFunction("permissions.remove"),
		request: notMockedFunction("permissions.request"),
		addHostAccessRequest: notMockedFunction("permissions.addHostAccessRequest"),
		removeHostAccessRequest: notMockedFunction("permissions.removeHostAccessRequest"),
		onAdded: notMockedEventWithRules("permissions.onAdded"),
		onRemoved: notMockedEventWithRules("permissions.onRemoved")
	},
	proxy: {
		Mode: emptyEnum(),
		Scheme: emptyEnum(),
		settings: notMockedChromeSetting("proxy.settings"),
		onProxyError: notMockedEventWithRules("proxy.onProxyError")
	},
	runtime: {
		id: "extension-id",
		lastError: void 0,
		OnRestartRequiredReason: emptyEnum(),
		OnInstalledReason: emptyEnum(),
		PlatformArch: emptyEnum(),
		PlatformNaclArch: emptyEnum(),
		PlatformOs: emptyEnum(),
		RequestUpdateCheckStatus: emptyEnum(),
		connect: notMockedFunction("runtime.connect"),
		connectNative: notMockedFunction("runtime.connectNative"),
		getBackgroundPage: notMockedFunction("runtime.getBackgroundPage"),
		getManifest: notMockedFunction("runtime.getManifest"),
		getPlatformInfo: notMockedFunction("runtime.getPlatformInfo"),
		getURL: notMockedFunction("runtime.getURL"),
		openOptionsPage: notMockedFunction("runtime.openOptionsPage"),
		reload: notMockedFunction("runtime.reload"),
		requestUpdateCheck: notMockedFunction("runtime.requestUpdateCheck"),
		restart: notMockedFunction("runtime.restart"),
		restartAfterDelay: notMockedFunction("runtime.restartAfterDelay"),
		sendMessage: notMockedFunction("runtime.sendMessage"),
		sendNativeMessage: notMockedFunction("runtime.sendNativeMessage"),
		setUninstallURL: notMockedFunction("runtime.setUninstallURL"),
		getContexts: notMockedFunction("runtime.getContexts"),
		getPackageDirectoryEntry: notMockedFunction("runtime.getPackageDirectoryEntry"),
		getVersion: notMockedFunction("runtime.getVersion"),
		ContextType: emptyEnum(),
		onBrowserUpdateAvailable: notMockedEventWithRules("runtime.onBrowserUpdateAvailable"),
		onConnect: notMockedEventWithRules("runtime.onConnect"),
		onConnectExternal: notMockedEventWithRules("runtime.onConnectExternal"),
		onConnectNative: notMockedEventWithRules("runtime.onConnectNative"),
		onInstalled: notMockedEventWithRules("runtime.onInstalled"),
		onMessage: notMockedEventWithRules("runtime.onMessage"),
		onMessageExternal: notMockedEventWithRules("runtime.onMessageExternal"),
		onRestartRequired: notMockedEventWithRules("runtime.onRestartRequired"),
		onStartup: notMockedEventWithRules("runtime.onStartup"),
		onSuspend: notMockedEventWithRules("runtime.onSuspend"),
		onSuspendCanceled: notMockedEventWithRules("runtime.onSuspendCanceled"),
		onUpdateAvailable: notMockedEventWithRules("runtime.onUpdateAvailable"),
		onUserScriptMessage: notMockedEventWithRules("runtime.onUserScriptMessage"),
		onUserScriptConnect: notMockedEventWithRules("runtime.onUserScriptConnect")
	},
	scripting: {
		StyleOrigin: emptyEnum(),
		ExecutionWorld: emptyEnum(),
		executeScript: notMockedFunction("scripting.executeScript"),
		getRegisteredContentScripts: notMockedFunction("scripting.getRegisteredContentScripts"),
		insertCSS: notMockedFunction("scripting.insertCSS"),
		registerContentScripts: notMockedFunction("scripting.registerContentScripts"),
		removeCSS: notMockedFunction("scripting.removeCSS"),
		unregisterContentScripts: notMockedFunction("scripting.unregisterContentScripts"),
		updateContentScripts: notMockedFunction("scripting.updateContentScripts")
	},
	search: {
		Disposition: emptyEnum(),
		query: notMockedFunction("search.query")
	},
	sessions: {
		MAX_SESSION_RESULTS: 25,
		getRecentlyClosed: notMockedFunction("sessions.getRecentlyClosed"),
		getDevices: notMockedFunction("sessions.getDevices"),
		restore: notMockedFunction("sessions.restore"),
		onChanged: notMockedEventWithRules("sessions.onChanged")
	},
	storage: {
		AccessLevel: emptyEnum(),
		local: {
			get: notMockedFunction("storage.local.get"),
			getKeys: notMockedFunction("storage.local.getKeys"),
			getBytesInUse: notMockedFunction("storage.local.getBytesInUse"),
			set: notMockedFunction("storage.local.set"),
			remove: notMockedFunction("storage.local.remove"),
			clear: notMockedFunction("storage.local.clear"),
			setAccessLevel: notMockedFunction("storage.local.setAccessLevel"),
			onChanged: notMockedEventWithRules("storage.local.onChanged"),
			QUOTA_BYTES: 10485760
		},
		managed: {
			get: notMockedFunction("storage.managed.get"),
			getKeys: notMockedFunction("storage.managed.getKeys"),
			getBytesInUse: notMockedFunction("storage.managed.getBytesInUse"),
			set: notMockedFunction("storage.managed.set"),
			remove: notMockedFunction("storage.managed.remove"),
			clear: notMockedFunction("storage.managed.clear"),
			setAccessLevel: notMockedFunction("storage.managed.setAccessLevel"),
			onChanged: notMockedEventWithRules("storage.managed.onChanged")
		},
		sync: {
			get: notMockedFunction("storage.sync.get"),
			getKeys: notMockedFunction("storage.sync.getKeys"),
			getBytesInUse: notMockedFunction("storage.sync.getBytesInUse"),
			set: notMockedFunction("storage.sync.set"),
			remove: notMockedFunction("storage.sync.remove"),
			clear: notMockedFunction("storage.sync.clear"),
			setAccessLevel: notMockedFunction("storage.sync.setAccessLevel"),
			onChanged: notMockedEventWithRules("storage.sync.onChanged"),
			MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: 1e6,
			QUOTA_BYTES: 102400,
			QUOTA_BYTES_PER_ITEM: 8192,
			MAX_ITEMS: 512,
			MAX_WRITE_OPERATIONS_PER_HOUR: 1800,
			MAX_WRITE_OPERATIONS_PER_MINUTE: 120
		},
		session: {
			get: notMockedFunction("storage.session.get"),
			getKeys: notMockedFunction("storage.session.getKeys"),
			getBytesInUse: notMockedFunction("storage.session.getBytesInUse"),
			set: notMockedFunction("storage.session.set"),
			remove: notMockedFunction("storage.session.remove"),
			clear: notMockedFunction("storage.session.clear"),
			setAccessLevel: notMockedFunction("storage.session.setAccessLevel"),
			onChanged: notMockedEventWithRules("storage.session.onChanged"),
			QUOTA_BYTES: 10485760
		},
		onChanged: notMockedEventWithRules("storage.onChanged")
	},
	tabs: {
		TAB_ID_NONE: -1,
		MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND: 2,
		SPLIT_VIEW_ID_NONE: -1,
		TAB_INDEX_NONE: -1,
		MutedInfoReason: emptyEnum(),
		TabStatus: emptyEnum(),
		WindowType: emptyEnum(),
		ZoomSettingsMode: emptyEnum(),
		ZoomSettingsScope: emptyEnum(),
		captureVisibleTab: notMockedFunction("tabs.captureVisibleTab"),
		connect: notMockedFunction("tabs.connect"),
		create: notMockedFunction("tabs.create"),
		detectLanguage: notMockedFunction("tabs.detectLanguage"),
		discard: notMockedFunction("tabs.discard"),
		duplicate: notMockedFunction("tabs.duplicate"),
		executeScript: notMockedFunction("tabs.executeScript"),
		get: notMockedFunction("tabs.get"),
		getAllInWindow: notMockedFunction("tabs.getAllInWindow"),
		getCurrent: notMockedFunction("tabs.getCurrent"),
		getSelected: notMockedFunction("tabs.getSelected"),
		getZoom: notMockedFunction("tabs.getZoom"),
		getZoomSettings: notMockedFunction("tabs.getZoomSettings"),
		goBack: notMockedFunction("tabs.goBack"),
		goForward: notMockedFunction("tabs.goForward"),
		group: notMockedFunction("tabs.group"),
		highlight: notMockedFunction("tabs.highlight"),
		insertCSS: notMockedFunction("tabs.insertCSS"),
		move: notMockedFunction("tabs.move"),
		query: notMockedFunction("tabs.query"),
		reload: notMockedFunction("tabs.reload"),
		remove: notMockedFunction("tabs.remove"),
		sendMessage: notMockedFunction("tabs.sendMessage"),
		sendRequest: notMockedFunction("tabs.sendRequest"),
		setZoom: notMockedFunction("tabs.setZoom"),
		setZoomSettings: notMockedFunction("tabs.setZoomSettings"),
		ungroup: notMockedFunction("tabs.ungroup"),
		update: notMockedFunction("tabs.update"),
		onActivated: notMockedEventWithRules("tabs.onActivated"),
		onAttached: notMockedEventWithRules("tabs.onAttached"),
		onCreated: notMockedEventWithRules("tabs.onCreated"),
		onDetached: notMockedEventWithRules("tabs.onDetached"),
		onHighlighted: notMockedEventWithRules("tabs.onHighlighted"),
		onMoved: notMockedEventWithRules("tabs.onMoved"),
		onRemoved: notMockedEventWithRules("tabs.onRemoved"),
		onReplaced: notMockedEventWithRules("tabs.onReplaced"),
		onUpdated: notMockedEventWithRules("tabs.onUpdated"),
		onZoomChange: notMockedEventWithRules("tabs.onZoomChange"),
		onSelectionChanged: notMockedEventWithRules("tabs.onSelectionChanged"),
		onActiveChanged: notMockedEventWithRules("tabs.onActiveChanged"),
		onHighlightChanged: notMockedEventWithRules("tabs.onHighlightChanged")
	},
	topSites: { get: notMockedFunction("topSites.get") },
	tts: {
		EventType: emptyEnum(),
		VoiceGender: emptyEnum(),
		getVoices: notMockedFunction("tts.getVoices"),
		isSpeaking: notMockedFunction("tts.isSpeaking"),
		pause: notMockedFunction("tts.pause"),
		resume: notMockedFunction("tts.resume"),
		speak: notMockedFunction("tts.speak"),
		stop: notMockedFunction("tts.stop"),
		onVoicesChanged: notMockedEventWithRules("tts.onVoicesChanged")
	},
	webNavigation: {
		TransitionQualifier: emptyEnum(),
		TransitionType: emptyEnum(),
		getAllFrames: notMockedFunction("webNavigation.getAllFrames"),
		getFrame: notMockedFunction("webNavigation.getFrame"),
		onBeforeNavigate: notMockedEventWithRules("webNavigation.onBeforeNavigate"),
		onCommitted: notMockedEventWithRules("webNavigation.onCommitted"),
		onCompleted: notMockedEventWithRules("webNavigation.onCompleted"),
		onCreatedNavigationTarget: notMockedEventWithRules("webNavigation.onCreatedNavigationTarget"),
		onDOMContentLoaded: notMockedEventWithRules("webNavigation.onDOMContentLoaded"),
		onErrorOccurred: notMockedEventWithRules("webNavigation.onErrorOccurred"),
		onHistoryStateUpdated: notMockedEventWithRules("webNavigation.onHistoryStateUpdated"),
		onReferenceFragmentUpdated: notMockedEventWithRules("webNavigation.onReferenceFragmentUpdated"),
		onTabReplaced: notMockedEventWithRules("webNavigation.onTabReplaced")
	},
	webRequest: {
		MAX_HANDLER_BEHAVIOR_CHANGED_CALLS_PER_10_MINUTES: 20,
		IgnoredActionType: emptyEnum(),
		OnAuthRequiredOptions: emptyEnum(),
		OnBeforeRedirectOptions: emptyEnum(),
		OnBeforeRequestOptions: emptyEnum(),
		OnBeforeSendHeadersOptions: emptyEnum(),
		OnCompletedOptions: emptyEnum(),
		OnHeadersReceivedOptions: emptyEnum(),
		OnResponseStartedOptions: emptyEnum(),
		OnSendHeadersOptions: emptyEnum(),
		OnErrorOccurredOptions: emptyEnum(),
		ResourceType: emptyEnum(),
		handlerBehaviorChanged: notMockedFunction("webRequest.handlerBehaviorChanged"),
		onAuthRequired: notMockedEventWithRules("webRequest.onAuthRequired"),
		onBeforeRedirect: notMockedEventWithRules("webRequest.onBeforeRedirect"),
		onBeforeRequest: notMockedEventWithRules("webRequest.onBeforeRequest"),
		onBeforeSendHeaders: notMockedEventWithRules("webRequest.onBeforeSendHeaders"),
		onCompleted: notMockedEventWithRules("webRequest.onCompleted"),
		onErrorOccurred: notMockedEventWithRules("webRequest.onErrorOccurred"),
		onHeadersReceived: notMockedEventWithRules("webRequest.onHeadersReceived"),
		onResponseStarted: notMockedEventWithRules("webRequest.onResponseStarted"),
		onSendHeaders: notMockedEventWithRules("webRequest.onSendHeaders"),
		onActionIgnored: notMockedEventWithRules("webRequest.onActionIgnored")
	},
	windows: {
		WINDOW_ID_CURRENT: -2,
		WINDOW_ID_NONE: -1,
		CreateType: emptyEnum(),
		WindowState: emptyEnum(),
		WindowType: emptyEnum(),
		create: notMockedFunction("windows.create"),
		get: notMockedFunction("windows.get"),
		getAll: notMockedFunction("windows.getAll"),
		getCurrent: notMockedFunction("windows.getCurrent"),
		getLastFocused: notMockedFunction("windows.getLastFocused"),
		remove: notMockedFunction("windows.remove"),
		update: notMockedFunction("windows.update"),
		onCreated: notMockedEventWithRules("windows.onCreated"),
		onFocusChanged: notMockedEventWithRules("windows.onFocusChanged"),
		onRemoved: notMockedEventWithRules("windows.onRemoved"),
		onBoundsChanged: notMockedEventWithRules("windows.onBoundsChanged")
	},
	fontSettings: {
		GenericFamily: emptyEnum(),
		LevelOfControl: emptyEnum(),
		ScriptCode: emptyEnum(),
		clearFont: notMockedFunction("fontSettings.clearFont"),
		clearDefaultFixedFontSize: notMockedFunction("fontSettings.clearDefaultFixedFontSize"),
		clearDefaultFontSize: notMockedFunction("fontSettings.clearDefaultFontSize"),
		clearMinimumFontSize: notMockedFunction("fontSettings.clearMinimumFontSize"),
		getDefaultFixedFontSize: notMockedFunction("fontSettings.getDefaultFixedFontSize"),
		getDefaultFontSize: notMockedFunction("fontSettings.getDefaultFontSize"),
		getFont: notMockedFunction("fontSettings.getFont"),
		getFontList: notMockedFunction("fontSettings.getFontList"),
		getMinimumFontSize: notMockedFunction("fontSettings.getMinimumFontSize"),
		setDefaultFixedFontSize: notMockedFunction("fontSettings.setDefaultFixedFontSize"),
		setDefaultFontSize: notMockedFunction("fontSettings.setDefaultFontSize"),
		setFont: notMockedFunction("fontSettings.setFont"),
		setMinimumFontSize: notMockedFunction("fontSettings.setMinimumFontSize"),
		onDefaultFixedFontSizeChanged: notMockedEventWithRules("fontSettings.onDefaultFixedFontSizeChanged"),
		onDefaultFontSizeChanged: notMockedEventWithRules("fontSettings.onDefaultFontSizeChanged"),
		onFontChanged: notMockedEventWithRules("fontSettings.onFontChanged"),
		onMinimumFontSizeChanged: notMockedEventWithRules("fontSettings.onMinimumFontSizeChanged")
	},
	gcm: {
		MAX_MESSAGE_SIZE: 4096,
		register: notMockedFunction("gcm.register"),
		unregister: notMockedFunction("gcm.unregister"),
		send: notMockedFunction("gcm.send"),
		onMessage: notMockedEventWithRules("gcm.onMessage"),
		onMessagesDeleted: notMockedEventWithRules("gcm.onMessagesDeleted"),
		onSendError: notMockedEventWithRules("gcm.onSendError")
	},
	instanceID: {
		deleteID: notMockedFunction("instanceID.deleteID"),
		deleteToken: notMockedFunction("instanceID.deleteToken"),
		getCreationTime: notMockedFunction("instanceID.getCreationTime"),
		getID: notMockedFunction("instanceID.getID"),
		getToken: notMockedFunction("instanceID.getToken"),
		onTokenRefresh: notMockedEventWithRules("instanceID.onTokenRefresh")
	},
	loginState: {
		ProfileType: emptyEnum(),
		SessionState: emptyEnum(),
		getProfileType: notMockedFunction("loginState.getProfileType"),
		getSessionState: notMockedFunction("loginState.getSessionState"),
		onSessionStateChanged: notMockedEventWithRules("loginState.onSessionStateChanged")
	},
	offscreen: {
		Reason: emptyEnum(),
		createDocument: notMockedFunction("offscreen.createDocument"),
		closeDocument: notMockedFunction("offscreen.closeDocument"),
		hasDocument: notMockedFunction("offscreen.hasDocument")
	},
	tabGroups: {
		TAB_GROUP_ID_NONE: -1,
		Color: emptyEnum(),
		get: notMockedFunction("tabGroups.get"),
		move: notMockedFunction("tabGroups.move"),
		query: notMockedFunction("tabGroups.query"),
		update: notMockedFunction("tabGroups.update"),
		onCreated: notMockedEventWithRules("tabGroups.onCreated"),
		onMoved: notMockedEventWithRules("tabGroups.onMoved"),
		onRemoved: notMockedEventWithRules("tabGroups.onRemoved"),
		onUpdated: notMockedEventWithRules("tabGroups.onUpdated")
	},
	userScripts: {
		ExecutionWorld: emptyEnum(),
		register: notMockedFunction("userScripts.register"),
		unregister: notMockedFunction("userScripts.unregister"),
		update: notMockedFunction("userScripts.update"),
		getScripts: notMockedFunction("userScripts.getScripts"),
		configureWorld: notMockedFunction("userScripts.configureWorld"),
		resetWorldConfiguration: notMockedFunction("userScripts.resetWorldConfiguration"),
		getWorldConfigurations: notMockedFunction("userScripts.getWorldConfigurations"),
		execute: notMockedFunction("userScripts.execute")
	},
	vpnProvider: {
		PlatformMessage: emptyEnum(),
		UIEvent: emptyEnum(),
		VpnConnectionState: emptyEnum(),
		createConfig: notMockedFunction("vpnProvider.createConfig"),
		destroyConfig: notMockedFunction("vpnProvider.destroyConfig"),
		notifyConnectionStateChanged: notMockedFunction("vpnProvider.notifyConnectionStateChanged"),
		sendPacket: notMockedFunction("vpnProvider.sendPacket"),
		setParameters: notMockedFunction("vpnProvider.setParameters"),
		onConfigRemoved: notMockedEventWithRules("vpnProvider.onConfigRemoved"),
		onConfigCreated: notMockedEventWithRules("vpnProvider.onConfigCreated"),
		onPacketReceived: notMockedEventWithRules("vpnProvider.onPacketReceived"),
		onPlatformMessage: notMockedEventWithRules("vpnProvider.onPlatformMessage"),
		onUIEvent: notMockedEventWithRules("vpnProvider.onUIEvent")
	},
	webAuthenticationProxy: {
		attach: notMockedFunction("webAuthenticationProxy.attach"),
		detach: notMockedFunction("webAuthenticationProxy.detach"),
		completeCreateRequest: notMockedFunction("webAuthenticationProxy.completeCreateRequest"),
		completeGetRequest: notMockedFunction("webAuthenticationProxy.completeGetRequest"),
		completeIsUvpaaRequest: notMockedFunction("webAuthenticationProxy.completeIsUvpaaRequest"),
		onCreateRequest: notMockedEventWithRules("webAuthenticationProxy.onCreateRequest"),
		onGetRequest: notMockedEventWithRules("webAuthenticationProxy.onGetRequest"),
		onIsUvpaaRequest: notMockedEventWithRules("webAuthenticationProxy.onIsUvpaaRequest"),
		onRemoteSessionStateChange: notMockedEventWithRules("webAuthenticationProxy.onRemoteSessionStateChange"),
		onRequestCanceled: notMockedEventWithRules("webAuthenticationProxy.onRequestCanceled")
	},
	ttsEngine: {
		LanguageInstallStatus: emptyEnum(),
		TtsClientSource: emptyEnum(),
		VoiceGender: emptyEnum(),
		updateVoices: notMockedFunction("ttsEngine.updateVoices"),
		updateLanguage: notMockedFunction("ttsEngine.updateLanguage"),
		onSpeak: notMockedEventWithRules("ttsEngine.onSpeak"),
		onStop: notMockedEventWithRules("ttsEngine.onStop"),
		onPause: notMockedEventWithRules("ttsEngine.onPause"),
		onResume: notMockedEventWithRules("ttsEngine.onResume"),
		onInstallLanguageRequest: notMockedEventWithRules("ttsEngine.onInstallLanguageRequest"),
		onLanguageStatusRequest: notMockedEventWithRules("ttsEngine.onLanguageStatusRequest"),
		onSpeakWithAudioStream: notMockedEventWithRules("ttsEngine.onSpeakWithAudioStream"),
		onUninstallLanguageRequest: notMockedEventWithRules("ttsEngine.onUninstallLanguageRequest")
	},
	system: {
		cpu: { getInfo: notMockedFunction("system.cpu.getInfo") },
		memory: { getInfo: notMockedFunction("system.memory.getInfo") },
		storage: {
			EjectDeviceResultCode: emptyEnum(),
			StorageUnitType: emptyEnum(),
			getInfo: notMockedFunction("system.storage.getInfo"),
			ejectDevice: notMockedFunction("system.storage.ejectDevice"),
			getAvailableCapacity: notMockedFunction("system.storage.getAvailableCapacity"),
			onAttached: notMockedEventWithRules("system.storage.onAttached"),
			onDetached: notMockedEventWithRules("system.storage.onDetached")
		},
		display: {
			LayoutPosition: emptyEnum(),
			MirrorMode: emptyEnum(),
			ActiveState: emptyEnum(),
			getInfo: notMockedFunction("system.display.getInfo"),
			getDisplayLayout: notMockedFunction("system.display.getDisplayLayout"),
			setDisplayLayout: notMockedFunction("system.display.setDisplayLayout"),
			setDisplayProperties: notMockedFunction("system.display.setDisplayProperties"),
			showNativeTouchCalibration: notMockedFunction("system.display.showNativeTouchCalibration"),
			clearTouchCalibration: notMockedFunction("system.display.clearTouchCalibration"),
			enableUnifiedDesktop: notMockedFunction("system.display.enableUnifiedDesktop"),
			overscanCalibrationStart: notMockedFunction("system.display.overscanCalibrationStart"),
			overscanCalibrationAdjust: notMockedFunction("system.display.overscanCalibrationAdjust"),
			overscanCalibrationReset: notMockedFunction("system.display.overscanCalibrationReset"),
			overscanCalibrationComplete: notMockedFunction("system.display.overscanCalibrationComplete"),
			startCustomTouchCalibration: notMockedFunction("system.display.startCustomTouchCalibration"),
			completeCustomTouchCalibration: notMockedFunction("system.display.completeCustomTouchCalibration"),
			setMirrorMode: notMockedFunction("system.display.setMirrorMode"),
			onDisplayChanged: notMockedEventWithRules("system.display.onDisplayChanged")
		}
	},
	printing: {
		MAX_GET_PRINTER_INFO_CALLS_PER_MINUTE: 20,
		MAX_SUBMIT_JOB_CALLS_PER_MINUTE: 40,
		JobStatus: emptyEnum(),
		PrinterSource: emptyEnum(),
		PrinterStatus: emptyEnum(),
		SubmitJobStatus: emptyEnum(),
		getPrinters: notMockedFunction("printing.getPrinters"),
		getPrinterInfo: notMockedFunction("printing.getPrinterInfo"),
		submitJob: notMockedFunction("printing.submitJob"),
		cancelJob: notMockedFunction("printing.cancelJob"),
		getJobStatus: notMockedFunction("printing.getJobStatus"),
		onJobStatusChanged: notMockedEventWithRules("printing.onJobStatusChanged")
	},
	printingMetrics: {
		ColorMode: emptyEnum(),
		DuplexMode: emptyEnum(),
		PrinterSource: emptyEnum(),
		PrintJobStatus: emptyEnum(),
		PrintJobSource: emptyEnum(),
		getPrintJobs: notMockedFunction("printingMetrics.getPrintJobs"),
		onPrintJobFinished: notMockedEventWithRules("printingMetrics.onPrintJobFinished")
	},
	printerProvider: {
		PrintError: emptyEnum(),
		onGetPrintersRequested: notMockedEventWithRules("printerProvider.onGetPrintersRequested"),
		onGetUsbPrinterInfoRequested: notMockedEventWithRules("printerProvider.onGetUsbPrinterInfoRequested"),
		onGetCapabilityRequested: notMockedEventWithRules("printerProvider.onGetCapabilityRequested"),
		onPrintRequested: notMockedEventWithRules("printerProvider.onPrintRequested")
	},
	wallpaper: {
		WallpaperLayout: emptyEnum(),
		setWallpaper: notMockedFunction("wallpaper.setWallpaper")
	},
	fileBrowserHandler: { onExecute: notMockedEventWithRules("fileBrowserHandler.onExecute") },
	fileSystemProvider: {
		ChangeType: emptyEnum(),
		OpenFileMode: emptyEnum(),
		CommonActionId: emptyEnum(),
		ProviderError: emptyEnum(),
		mount: notMockedFunction("fileSystemProvider.mount"),
		unmount: notMockedFunction("fileSystemProvider.unmount"),
		getAll: notMockedFunction("fileSystemProvider.getAll"),
		get: notMockedFunction("fileSystemProvider.get"),
		notify: notMockedFunction("fileSystemProvider.notify"),
		onUnmountRequested: notMockedEventWithRules("fileSystemProvider.onUnmountRequested"),
		onGetMetadataRequested: notMockedEventWithRules("fileSystemProvider.onGetMetadataRequested"),
		onGetActionsRequested: notMockedEventWithRules("fileSystemProvider.onGetActionsRequested"),
		onReadDirectoryRequested: notMockedEventWithRules("fileSystemProvider.onReadDirectoryRequested"),
		onOpenFileRequested: notMockedEventWithRules("fileSystemProvider.onOpenFileRequested"),
		onCloseFileRequested: notMockedEventWithRules("fileSystemProvider.onCloseFileRequested"),
		onReadFileRequested: notMockedEventWithRules("fileSystemProvider.onReadDirectoryRequested"),
		onWriteFileRequested: notMockedEventWithRules("fileSystemProvider.onWriteFileRequested"),
		onTruncateRequested: notMockedEventWithRules("fileSystemProvider.onTruncateRequested"),
		onDeleteEntryRequested: notMockedEventWithRules("fileSystemProvider.onDeleteEntryRequested"),
		onCreateDirectoryRequested: notMockedEventWithRules("fileSystemProvider.onCreateDirectoryRequested"),
		onCreateFileRequested: notMockedEventWithRules("fileSystemProvider.onCreateFileRequested"),
		onCopyEntryRequested: notMockedEventWithRules("fileSystemProvider.onCopyEntryRequested"),
		onMoveEntryRequested: notMockedEventWithRules("fileSystemProvider.onMoveEntryRequested"),
		onAddWatcherRequested: notMockedEventWithRules("fileSystemProvider.onAddWatcherRequested"),
		onRemoveWatcherRequested: notMockedEventWithRules("fileSystemProvider.onRemoveWatcherRequested"),
		onConfigureRequested: notMockedEventWithRules("fileSystemProvider.onConfigureRequested"),
		onMountRequested: notMockedEventWithRules("fileSystemProvider.onMountRequested"),
		onExecuteActionRequested: notMockedEventWithRules("fileSystemProvider.onExecuteActionRequested"),
		onAbortRequested: notMockedEventWithRules("fileSystemProvider.onAbortRequested")
	},
	declarativeWebRequest: {
		Stage: emptyEnum(),
		onRequest: notMockedEventWithRules("declarativeWebRequest.onRequest"),
		onMessage: notMockedEventWithRules("declarativeWebRequest.onMessage")
	},
	documentScan: {
		Configurability: emptyEnum(),
		ConnectionType: emptyEnum(),
		ConstraintType: emptyEnum(),
		OperationResult: emptyEnum(),
		OptionType: emptyEnum(),
		OptionUnit: emptyEnum(),
		scan: notMockedFunction("documentScan.scan"),
		cancelScan: notMockedFunction("documentScan.cancelScan"),
		closeScanner: notMockedFunction("documentScan.closeScanner"),
		getOptionGroups: notMockedFunction("documentScan.getOptionGroups"),
		getScannerList: notMockedFunction("documentScan.getScannerList"),
		openScanner: notMockedFunction("documentScan.openScanner"),
		readScanData: notMockedFunction("documentScan.readScanData"),
		setOptions: notMockedFunction("documentScan.setOptions"),
		startScan: notMockedFunction("documentScan.startScan")
	},
	dom: { openOrClosedShadowRoot: notMockedFunction("dom.openOrClosedShadowRoot") },
	enterprise: {
		deviceAttributes: {
			getDirectoryDeviceId: notMockedFunction("enterprise.deviceAttributes.getDirectoryDeviceId"),
			getDeviceSerialNumber: notMockedFunction("enterprise.deviceAttributes.getDeviceSerialNumber"),
			getDeviceAssetId: notMockedFunction("enterprise.deviceAttributes.getDeviceAssetId"),
			getDeviceAnnotatedLocation: notMockedFunction("enterprise.deviceAttributes.getDeviceAnnotatedLocation"),
			getDeviceHostname: notMockedFunction("enterprise.deviceAttributes.getDeviceHostname")
		},
		platformKeys: {
			Algorithm: emptyEnum(),
			Scope: emptyEnum(),
			getTokens: notMockedFunction("enterprise.platformKeys.getTokens"),
			getCertificates: notMockedFunction("enterprise.platformKeys.getCertificates"),
			importCertificate: notMockedFunction("enterprise.platformKeys.importCertificate"),
			removeCertificate: notMockedFunction("enterprise.platformKeys.removeCertificate"),
			challengeMachineKey: notMockedFunction("enterprise.platformKeys.challengeMachineKey"),
			challengeUserKey: notMockedFunction("enterprise.platformKeys.challengeUserKey"),
			challengeKey: notMockedFunction("enterprise.platformKeys.challengeKey")
		},
		networkingAttributes: { getNetworkDetails: notMockedFunction("enterprise.networkingAttributes.getNetworkDetails") },
		hardwarePlatform: { getHardwarePlatformInfo: notMockedFunction("enterprise.hardwarePlatform.getHardwarePlatformInfo") },
		login: { exitCurrentManagedGuestSession: notMockedFunction("enterprise.login.exitCurrentManagedGuestSession") }
	},
	pageCapture: { saveAsMHTML: notMockedFunction("pageCapture.saveAsMHTML") },
	privacy: {
		IPHandlingPolicy: emptyEnum(),
		network: {
			networkPredictionEnabled: notMockedChromeSetting("privacy.network.networkPredictionEnabled"),
			webRTCIPHandlingPolicy: notMockedChromeSetting("privacy.network.webRTCIPHandlingPolicy")
		},
		services: {
			alternateErrorPagesEnabled: notMockedChromeSetting("privacy.services.alternateErrorPagesEnabled"),
			autofillEnabled: notMockedChromeSetting("privacy.services.autofillEnabled"),
			autofillAddressEnabled: notMockedChromeSetting("privacy.services.autofillAddressEnabled"),
			autofillCreditCardEnabled: notMockedChromeSetting("privacy.services.autofillCreditCardEnabled"),
			passwordSavingEnabled: notMockedChromeSetting("privacy.services.passwordSavingEnabled"),
			safeBrowsingEnabled: notMockedChromeSetting("privacy.services.safeBrowsingEnabled"),
			safeBrowsingExtendedReportingEnabled: notMockedChromeSetting("privacy.services.safeBrowsingExtendedReportingEnabled"),
			searchSuggestEnabled: notMockedChromeSetting("privacy.services.searchSuggestEnabled"),
			spellingServiceEnabled: notMockedChromeSetting("privacy.services.spellingServiceEnabled"),
			translationServiceEnabled: notMockedChromeSetting("privacy.services.translationServiceEnabled")
		},
		websites: {
			adMeasurementEnabled: notMockedChromeSetting("privacy.websites.adMeasurementEnabled"),
			fledgeEnabled: notMockedChromeSetting("privacy.websites.fledgeEnabled"),
			hyperlinkAuditingEnabled: notMockedChromeSetting("privacy.websites.hyperlinkAuditingEnabled"),
			referrersEnabled: notMockedChromeSetting("privacy.websites.referrersEnabled"),
			doNotTrackEnabled: notMockedChromeSetting("privacy.websites.doNotTrackEnabled"),
			protectedContentEnabled: notMockedChromeSetting("privacy.websites.protectedContentEnabled"),
			thirdPartyCookiesAllowed: notMockedChromeSetting("privacy.websites.thirdPartyCookiesAllowed"),
			topicsEnabled: notMockedChromeSetting("privacy.websites.topicsEnabled"),
			relatedWebsiteSetsEnabled: notMockedChromeSetting("privacy.websites.relatedWebsiteSetsEnabled")
		}
	},
	sidePanel: {
		Side: emptyEnum(),
		getOptions: notMockedFunction("sidePanel.getOptions"),
		setOptions: notMockedFunction("sidePanel.setOptions"),
		getPanelBehavior: notMockedFunction("sidePanel.getPanelBehavior"),
		setPanelBehavior: notMockedFunction("sidePanel.setPanelBehavior"),
		open: notMockedFunction("sidePanel.open"),
		close: notMockedFunction("sidePanel.close"),
		getLayout: notMockedFunction("sidePanel.getLayout"),
		onClosed: notMockedEventWithRules("sidePanel.onClosed"),
		onOpened: notMockedEventWithRules("sidePanel.onOpened")
	},
	input: { ime: {
		AssistiveWindowType: emptyEnum(),
		AssistiveWindowButton: emptyEnum(),
		MouseButton: emptyEnum(),
		KeyboardEventType: emptyEnum(),
		AutoCapitalizeType: emptyEnum(),
		InputContextType: emptyEnum(),
		MenuItemStyle: emptyEnum(),
		ScreenType: emptyEnum(),
		UnderlineStyle: emptyEnum(),
		WindowPosition: emptyEnum(),
		setComposition: notMockedFunction("input.ime.setComposition"),
		clearComposition: notMockedFunction("input.ime.clearComposition"),
		commitText: notMockedFunction("input.ime.commitText"),
		sendKeyEvents: notMockedFunction("input.ime.sendKeyEvents"),
		hideInputView: notMockedFunction("input.ime.hideInputView"),
		setCandidateWindowProperties: notMockedFunction("input.ime.setCandidateWindowProperties"),
		setCandidates: notMockedFunction("input.ime.setCandidates"),
		setCursorPosition: notMockedFunction("input.ime.setCursorPosition"),
		setMenuItems: notMockedFunction("input.ime.setMenuItems"),
		updateMenuItems: notMockedFunction("input.ime.updateMenuItems"),
		deleteSurroundingText: notMockedFunction("input.ime.deleteSurroundingText"),
		keyEventHandled: notMockedFunction("input.ime.keyEventHandled"),
		setAssistiveWindowProperties: notMockedFunction("input.ime.setAssistiveWindowProperties"),
		setAssistiveWindowButtonHighlighted: notMockedFunction("input.ime.setAssistiveWindowButtonHighlighted"),
		onActivate: notMockedEventWithRules("input.ime.onActivate"),
		onDeactivated: notMockedEventWithRules("input.ime.onDeactivated"),
		onFocus: notMockedEventWithRules("input.ime.onFocus"),
		onBlur: notMockedEventWithRules("input.ime.onBlur"),
		onInputContextUpdate: notMockedEventWithRules("input.ime.onInputContextUpdate"),
		onKeyEvent: notMockedEventWithRules("input.ime.onKeyEvent"),
		onCandidateClicked: notMockedEventWithRules("input.ime.onCandidateClicked"),
		onMenuItemActivated: notMockedEventWithRules("input.ime.onMenuItemActivated"),
		onSurroundingTextChanged: notMockedEventWithRules("input.ime.onSurroundingTextChanged"),
		onReset: notMockedEventWithRules("input.ime.onReset"),
		onAssistiveWindowButtonClicked: notMockedEventWithRules("input.ime.onAssistiveWindowButtonClicked")
	} },
	platformKeys: {
		ClientCertificateType: emptyEnum(),
		selectClientCertificates: notMockedFunction("platformKeys.selectClientCertificates"),
		getKeyPair: notMockedFunction("platformKeys.getKeyPair"),
		getKeyPairBySpki: notMockedFunction("platformKeys.getKeyPairBySpki"),
		subtleCrypto: notMockedFunction("platformKeys.subtleCrypto"),
		verifyTLSServerCertificate: notMockedFunction("platformKeys.verifyTLSServerCertificate")
	},
	power: {
		Level: emptyEnum(),
		requestKeepAwake: notMockedFunction("power.requestKeepAwake"),
		releaseKeepAwake: notMockedFunction("power.releaseKeepAwake"),
		reportActivity: notMockedFunction("power.reportActivity")
	},
	readingList: {
		addEntry: notMockedFunction("readingList.addEntry"),
		removeEntry: notMockedFunction("readingList.removeEntry"),
		updateEntry: notMockedFunction("readingList.updateEntry"),
		query: notMockedFunction("readingList.query"),
		onEntryAdded: notMockedEventWithRules("readingList.onEntryAdded"),
		onEntryRemoved: notMockedEventWithRules("readingList.onEntryRemoved"),
		onEntryUpdated: notMockedEventWithRules("readingList.onEntryUpdated")
	},
	systemLog: { add: notMockedFunction("systemLog.add") },
	tabCapture: {
		TabCaptureState: emptyEnum(),
		capture: notMockedFunction("tabCapture.capture"),
		getCapturedTabs: notMockedFunction("tabCapture.getCapturedTabs"),
		getMediaStreamId: notMockedFunction("tabCapture.getMediaStreamId"),
		onStatusChanged: notMockedEventWithRules("tabCapture.onStatusChanged")
	}
}, {
	reset() {
		for (const [name, api] of Object.entries(fakeBrowser)) if (name !== "reset" && typeof api?.resetState === "function") api.resetState();
	},
	alarms,
	notifications,
	runtime,
	storage,
	tabs,
	webNavigation,
	windows,
	action
});
//#endregion
export { fakeBrowser as t };
