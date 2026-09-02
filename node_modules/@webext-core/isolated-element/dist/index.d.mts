//#region src/options.d.ts
/** Options that can be passed into `createIsolatedElement`. */
interface CreateIsolatedElementOptions {
  /**
   * An HTML tag name used for the shadow root container.
   *
   * Note that you can't attach a shadow root to every type of element. There are some that can't
   * have a shadow DOM for security reasons (for example <a>).
   *
   * @example
   *   'sticky-note';
   *
   * @example
   *   'anime-skip-player';
   *
   * @example
   *   'github-better-line-count-diff';
   *
   * @example
   *   'div';
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to
   */
  name: string;
  /**
   * See [`ShadowRoot.mode`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode).
   *
   * @default 'closed'
   */
  mode?: 'open' | 'closed';
  /**
   * Either the URL to a CSS file or the text contents of a CSS file. The styles will be mounted
   * inside the shadow DOM so they don't effect the rest of the page.
   */
  css?: {
    url: string;
  } | {
    textContent: string;
  };
  /**
   * When enabled, `event.stopPropagation` will be called on events trying to bubble out of the
   * shadow root.
   *
   * - Set to `true` to stop the propagation of a default set of events, `["keyup", "keydown",
   *   "keypress"]`
   * - Set to an array of event names to stop the propagation of a custom list of events
   */
  isolateEvents?: boolean | string[];
}
//#endregion
//#region src/index.d.ts
/**
 * Create an HTML element that has isolated styles from the rest of the page.
 *
 * @example
 *   const { isolatedElement, parentElement } = createIsolatedElement({
 *     name: 'example-ui',
 *     css: { textContent: 'p { color: red }' },
 *     isolateEvents: true, // or ['keydown', 'keyup', 'keypress']
 *   });
 *
 *   // Create and mount your app inside the isolation
 *   const ui = document.createElement('p');
 *   ui.textContent = 'Example UI';
 *   isolatedElement.appendChild(ui);
 *
 *   // Add the UI to the DOM
 *   document.body.appendChild(parentElement);
 *
 * @param options
 * @returns A `parentElement` that can be added to the DOM, the `shadow` root, and an
 *   `isolatedElement` that you should mount your UI to.
 */
declare function createIsolatedElement(options: CreateIsolatedElementOptions): Promise<{
  parentElement: HTMLElement;
  isolatedElement: HTMLElement;
  shadow: ShadowRoot;
}>;
//#endregion
export { type CreateIsolatedElementOptions, createIsolatedElement };