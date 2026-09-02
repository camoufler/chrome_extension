import { normalizePath } from "./paths.mjs";
import { wxt } from "../wxt.mjs";
//#region src/core/utils/theme-icons.ts
/**
* Firefox only.
*
* If the manifest has an `action` (MV3) or `browser_action` (MV2) and the user
* has not already set `theme_icons` on it, discover light/dark icon pairs from
* the public assets and attach them.
*/
function addDiscoveredThemeIcons(manifest, buildOutput) {
	const action = manifest.action ?? manifest.browser_action;
	if (action == null) return;
	if (action.theme_icons != null) return;
	const themeIcons = discoverThemeIcons(buildOutput);
	if (themeIcons == null) return;
	action.theme_icons = themeIcons;
}
/**
* Scan `publicAssets` for paired `-light`/`-dark` icon files and return the
* sizes where both variants exist, sorted ascending. Returns `undefined` if no
* complete pairs are found so callers can short-circuit.
*/
function discoverThemeIcons(buildOutput) {
	const bySize = /* @__PURE__ */ new Map();
	for (const asset of buildOutput.publicAssets) for (const regex of themeIconRegex) {
		const match = asset.fileName.match(regex);
		if (match?.groups == null) continue;
		const size = Number(match.groups.size);
		const variant = match.groups.variant;
		const entry = bySize.get(size) ?? {};
		const incoming = normalizePath(asset.fileName);
		const existing = entry[variant];
		if (existing != null && existing !== incoming) {
			wxt.logger.warn(`Multiple theme icon files matched size ${size} variant "${variant}": keeping "${existing}", ignoring "${incoming}". Use a single naming pattern per (size, variant).`);
			break;
		}
		entry[variant] = incoming;
		bySize.set(size, entry);
		break;
	}
	const pairs = [];
	for (const [size, entry] of bySize) {
		if (entry.light != null && entry.dark != null) {
			pairs.push({
				light: entry.light,
				dark: entry.dark,
				size
			});
			continue;
		}
		const present = entry.light != null ? "light" : "dark";
		const missing = entry.light != null ? "dark" : "light";
		const file = entry.light ?? entry.dark;
		wxt.logger.warn(`Skipping theme icon size ${size}: found ${present} variant ("${file}") but no matching ${missing} variant. Add the missing file to include this size in theme_icons.`);
	}
	pairs.sort((a, b) => a.size - b.size);
	return pairs.length > 0 ? pairs : void 0;
}
const themeIconRegex = [
	/^icon-(?<variant>light|dark)-(?<size>[0-9]+)\.png$/,
	/^icon-(?<variant>light|dark)-(?<size>[0-9]+)x[0-9]+\.png$/,
	/^icon-(?<size>[0-9]+)-(?<variant>light|dark)\.png$/,
	/^icon-(?<size>[0-9]+)x[0-9]+-(?<variant>light|dark)\.png$/,
	/^icons?[/\\](?<variant>light|dark)-(?<size>[0-9]+)\.png$/,
	/^icons?[/\\](?<variant>light|dark)-(?<size>[0-9]+)x[0-9]+\.png$/,
	/^icons?[/\\](?<size>[0-9]+)-(?<variant>light|dark)\.png$/,
	/^icons?[/\\](?<size>[0-9]+)x[0-9]+-(?<variant>light|dark)\.png$/
];
//#endregion
export { addDiscoveredThemeIcons };
