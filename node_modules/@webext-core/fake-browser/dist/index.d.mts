import { Browser } from "@wxt-dev/browser";
//#region src/types.d.ts
interface EventForTesting<TParams extends any[], TReturn = void> {
  /** Trigger all listeners for an event and return all their responses. */
  trigger(...args: TParams): Promise<TReturn[]>;
  /** Remove all listeners for the event. */
  removeAllListeners(): void;
}
type StorageChanges = {
  [key: string]: Browser.storage.StorageChange;
};
//#endregion
//#region src/apis/action.d.ts
type ActionOverrides = Pick<typeof Browser.action, 'setTitle' | 'getTitle' | 'getBadgeText' | 'setBadgeText' | 'setBadgeTextColor' | 'getBadgeTextColor' | 'getBadgeBackgroundColor' | 'setBadgeBackgroundColor'> & {
  resetState(): void;
  onClicked: EventForTesting<[tab: Browser.tabs.Tab]>;
};
//#endregion
//#region src/apis/alarms.d.ts
type AlarmsOverrides = typeof Browser.alarms & {
  resetState(): void;
  onAlarm: EventForTesting<[alarm: Browser.alarms.Alarm]>;
};
//#endregion
//#region src/apis/notifications.d.ts
type NotificationsOverrides = Pick<typeof Browser.notifications, 'clear' | 'create' | 'getAll'> & {
  resetState(): void;
  /**
   * Alternative to `getAll` that returns the objects used to create the notifications, not just
   * true.
   */
  getAllCreateOptions(): {
    [id: string]: Browser.notifications.NotificationCreateOptions;
  };
  onClosed: EventForTesting<[notificationId: string, byUser: boolean]>;
  onClicked: EventForTesting<[notificationId: string]>;
  onButtonClicked: EventForTesting<[notificationId: string, buttonIndex: number]>;
  onShown: EventForTesting<[notificationId: string]>;
};
//#endregion
//#region src/apis/runtime.d.ts
type RuntimeOverrides = Pick<typeof Browser.runtime, 'getURL' | 'sendMessage'> & {
  id: string;
  resetState(): void;
  onSuspend: EventForTesting<[]>;
  onSuspendCanceled: EventForTesting<[]>;
  onStartup: EventForTesting<[]>;
  onInstalled: EventForTesting<[details: Browser.runtime.InstalledDetails]>;
  onUpdateAvailable: EventForTesting<[details: Browser.runtime.UpdateAvailableDetails]>;
  onMessage: EventForTesting<[message: any, sender: Browser.runtime.MessageSender, sendResponse: (res: any) => void], void | Promise<any>>;
};
//#endregion
//#region src/apis/storage.d.ts
type StorageAreaOverrides = Pick<Browser.storage.StorageArea, 'clear' | 'get' | 'remove' | 'set'> & {
  resetState(): void;
  onChanged: EventForTesting<[changes: StorageChanges]>;
};
type StorageOverrides = {
  /** Remove all listeners and clear in-memory storages. */
  resetState(): void;
  local: StorageAreaOverrides;
  session: StorageAreaOverrides;
  sync: StorageAreaOverrides;
  managed: StorageAreaOverrides;
  onChanged: EventForTesting<[changes: Record<string, Browser.storage.StorageChange>, areaName: string]>;
};
//#endregion
//#region src/apis/tabs.d.ts
type TabsOverrides = Pick<typeof Browser.tabs, 'get' | 'getCurrent' | 'create' | 'duplicate' | 'query' | 'highlight' | 'remove' | 'update'> & {
  resetState(): void;
  onCreated: EventForTesting<[tab: Browser.tabs.Tab]>;
  onUpdated: EventForTesting<[tabId: number, changeInfo: Browser.tabs.OnUpdatedInfo, tab: Browser.tabs.Tab]>;
  onHighlighted: EventForTesting<[highlightInfo: Browser.tabs.OnHighlightedInfo]>;
  onActivated: EventForTesting<[activeInfo: Browser.tabs.OnActivatedInfo]>;
  onRemoved: EventForTesting<[tabId: number, removeInfo: Browser.tabs.OnRemovedInfo]>;
};
//#endregion
//#region src/apis/webNavigation.d.ts
type WebNavigationOverrides = {
  onBeforeNavigate: EventForTesting<[details: Browser.webNavigation.WebNavigationBaseCallbackDetails]>;
  onCommitted: EventForTesting<[details: Browser.webNavigation.WebNavigationTransitionCallbackDetails]>;
  onDOMContentLoaded: EventForTesting<[details: Browser.webNavigation.WebNavigationFramedCallbackDetails]>;
  onCompleted: EventForTesting<[details: Browser.webNavigation.WebNavigationFramedCallbackDetails]>;
  onErrorOccurred: EventForTesting<[details: Browser.webNavigation.WebNavigationFramedErrorCallbackDetails]>;
  onCreatedNavigationTarget: EventForTesting<[details: Browser.webNavigation.WebNavigationSourceCallbackDetails]>;
  onReferenceFragmentUpdated: EventForTesting<[details: Browser.webNavigation.WebNavigationTransitionCallbackDetails]>;
  onTabReplaced: EventForTesting<[details: Browser.webNavigation.WebNavigationReplacementCallbackDetails]>;
  onHistoryStateUpdated: EventForTesting<[details: Browser.webNavigation.WebNavigationTransitionCallbackDetails]>;
};
//#endregion
//#region src/apis/windows.d.ts
type WindowOverrides = Pick<typeof Browser.windows, 'get' | 'getAll' | 'create' | 'getCurrent' | 'getLastFocused' | 'remove' | 'update'> & {
  resetState(): void;
  onCreated: EventForTesting<[window: Browser.windows.Window]>;
  onRemoved: EventForTesting<[windowId: number]>;
  onFocusChanged: EventForTesting<[windowId: number]>;
};
//#endregion
//#region src/index.d.ts
interface BrowserOverrides {
  /**
   * Reset the fake browser. Remove all listeners and clear all in-memory state, like storage,
   * windows, and tabs.
   *
   * This is often called before each test.
   */
  reset(): void;
  action: ActionOverrides;
  alarms: AlarmsOverrides;
  notifications: NotificationsOverrides;
  runtime: RuntimeOverrides;
  storage: StorageOverrides;
  tabs: TabsOverrides;
  webNavigation: WebNavigationOverrides;
  windows: WindowOverrides;
}
/**
 * The standard `chrome`/`browser` interface from `@wxt-dev/browser`, but with additional functions
 * for triggering events and resetting state.
 */
type FakeBrowser = BrowserOverrides & typeof Browser;
/** An in-memory implementation of the `browser` global. */
declare const fakeBrowser: FakeBrowser;
//#endregion
export { BrowserOverrides, FakeBrowser, fakeBrowser };