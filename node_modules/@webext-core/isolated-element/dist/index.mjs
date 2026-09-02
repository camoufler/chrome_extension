import isPotentialCustomElementName from "is-potential-custom-element-name";
//#region src/index.ts
/**
* Built-in elements that can have a shadow root attached to them.
*
* @see https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to
*/
const ALLOWED_SHADOW_ELEMENTS = [
	"article",
	"aside",
	"blockquote",
	"body",
	"div",
	"footer",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"main",
	"nav",
	"p",
	"section",
	"span"
];
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
async function createIsolatedElement(options) {
	const { name, mode = "closed", css, isolateEvents = false } = options;
	if (!ALLOWED_SHADOW_ELEMENTS.includes(name) && !isPotentialCustomElementName(name)) throw Error(`"${name}" cannot have a shadow root attached to it. It must be two words and kebab-case, with a few exceptions. See https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#elements_you_can_attach_a_shadow_to`);
	const parentElement = document.createElement(name);
	const shadow = parentElement.attachShadow({ mode });
	const isolatedElement = document.createElement("div");
	if (css) {
		const style = document.createElement("style");
		if ("url" in css) style.textContent = await fetch(css.url).then((res) => res.text());
		else style.textContent = css.textContent;
		shadow.appendChild(style);
	}
	shadow.appendChild(isolatedElement);
	if (isolateEvents) (Array.isArray(isolateEvents) ? isolateEvents : [
		"keydown",
		"keyup",
		"keypress"
	]).forEach((eventType) => {
		shadow.addEventListener(eventType, (e) => e.stopPropagation());
	});
	return {
		parentElement,
		shadow,
		isolatedElement
	};
}
//#endregion
export { createIsolatedElement };
