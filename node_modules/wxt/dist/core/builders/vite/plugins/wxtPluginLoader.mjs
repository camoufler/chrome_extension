import { normalizePath } from "../../../utils/paths.mjs";
import "../../../utils/index.mjs";
import { parseHTML } from "linkedom";
//#region src/core/builders/vite/plugins/wxtPluginLoader.ts
/**
* Resolve and load plugins for each entrypoint. This handles both JS
* entrypoints via the `virtual:wxt-plugins` import, and HTML files by adding
* `virtual:wxt-html-plugins` to the document's `<head>`
*/
function wxtPluginLoader(config) {
	const virtualModuleId = "virtual:wxt-plugins";
	const resolvedVirtualModuleId = "\0" + virtualModuleId;
	const virtualHtmlModuleId = "virtual:wxt-html-plugins";
	const resolvedVirtualHtmlModuleId = "\0" + virtualHtmlModuleId;
	return {
		name: "wxt:plugin-loader",
		resolveId: {
			filter: { id: [new RegExp(`^${virtualModuleId}$`), new RegExp(`^${virtualHtmlModuleId}$`)] },
			handler(id) {
				if (id === virtualModuleId) return resolvedVirtualModuleId;
				return resolvedVirtualHtmlModuleId;
			}
		},
		load: {
			filter: { id: [new RegExp(`^${resolvedVirtualModuleId}$`), new RegExp(`^${resolvedVirtualHtmlModuleId}$`)] },
			handler(id) {
				if (id === resolvedVirtualModuleId) return `${config.plugins.map((plugin, i) => `import initPlugin${i} from '${normalizePath(plugin)}';`).join("\n")}\n\nexport function initPlugins() {\n${config.plugins.map((_, i) => `  initPlugin${i}();`).join("\n")}\n}`;
				else return `import { initPlugins } from '${virtualModuleId}';
            try {
              initPlugins();
            } catch (err) {
              console.error("[wxt] Failed to initialize plugins", err);
            }`;
			}
		},
		transformIndexHtml: {
			order: "pre",
			handler(html, _ctx) {
				const src = config.command === "serve" ? `${config.dev.server?.origin}/@id/${virtualHtmlModuleId}` : virtualHtmlModuleId;
				const { document } = parseHTML(html);
				if (document.querySelector(`script[src='${src}']`)) return;
				const script = document.createElement("script");
				script.type = "module";
				script.src = src;
				if (document.head == null) {
					const newHead = document.createElement("head");
					document.documentElement.prepend(newHead);
				}
				document.head?.prepend(script);
				return document.toString();
			}
		}
	};
}
//#endregion
export { wxtPluginLoader };
