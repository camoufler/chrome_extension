//#region src/core/builders/vite/plugins/devServerGlobals.ts
/**
* Defines global constants about the dev server. Helps scripts connect to the
* server's web socket.
*/
function devServerGlobals(config, server) {
	return {
		name: "wxt:dev-server-globals",
		config() {
			if (server == null || config.command == "build") return;
			return { define: { __DEV_SERVER_ORIGIN__: JSON.stringify(server.origin.replace(/^http(s?):/, "ws$1:")) } };
		}
	};
}
//#endregion
export { devServerGlobals };
