//#region src/utils/internal/custom-events.d.ts
declare class WxtLocationChangeEvent extends Event {
  readonly newUrl: URL;
  readonly oldUrl: URL;
  static EVENT_NAME: string;
  constructor(newUrl: URL, oldUrl: URL);
}
//#endregion
export { WxtLocationChangeEvent };