import path from "node:path";
import { visualizer } from "@aklinker1/rollup-plugin-visualizer";
//#region src/core/builders/vite/plugins/bundleAnalysis.ts
let increment = 0;
function bundleAnalysis(config) {
	return visualizer({
		template: "raw-data",
		filename: path.resolve(config.analysis.outputDir, `${config.analysis.outputName}-${increment++}.json`)
	});
}
//#endregion
export { bundleAnalysis };
