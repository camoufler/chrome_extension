import path from "node:path";
//#region src/core/builders/vite/plugins/extensionApiMock.ts
/**
* Mock `wxt/browser` and stub the global `browser`/`chrome` types with a fake
* version of the extension APIs
*/
function extensionApiMock(config) {
	const virtualSetupModule = "virtual:wxt-setup";
	const resolvedVirtualSetupModule = "\0" + virtualSetupModule;
	return {
		name: "wxt:extension-api-mock",
		config() {
			const replacement = path.resolve(config.wxtModuleDir, "dist/virtual/mock-browser");
			return {
				test: { setupFiles: [virtualSetupModule] },
				resolve: { alias: [{
					find: "wxt/browser",
					replacement
				}] },
				ssr: { noExternal: ["wxt"] }
			};
		},
		resolveId: {
			filter: { id: new RegExp(`${virtualSetupModule}$`) },
			handler() {
				return resolvedVirtualSetupModule;
			}
		},
		load: {
			filter: { id: new RegExp(`^${resolvedVirtualSetupModule}$`) },
			handler() {
				return setupTemplate;
			}
		}
	};
}
const setupTemplate = `
  import { vi } from 'vitest';
  import { fakeBrowser } from 'wxt/testing/fake-browser';

  vi.stubGlobal("chrome", fakeBrowser);
  vi.stubGlobal("browser", fakeBrowser);
`;
//#endregion
export { extensionApiMock };
