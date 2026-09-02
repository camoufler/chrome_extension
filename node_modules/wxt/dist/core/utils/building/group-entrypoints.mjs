//#region src/core/utils/building/group-entrypoints.ts
/**
* Entrypoints are built in groups. HTML pages can all be built together in a
* single step, content scripts must be build individually, etc.
*
* This function returns the entrypoints put into these types of groups.
*/
function groupEntrypoints(entrypoints) {
	const groupIndexMap = {};
	const groups = [];
	for (const entry of entrypoints) {
		if (entry.skipped) continue;
		let group = ENTRY_TYPE_TO_GROUP_MAP[entry.type];
		if (entry.type === "background" && entry.options.type === "module") group = "esm";
		if (group === "individual") groups.push(entry);
		else {
			let groupIndex = groupIndexMap[group];
			if (groupIndex == null) {
				groupIndex = groups.push([]) - 1;
				groupIndexMap[group] = groupIndex;
			}
			groups[groupIndex].push(entry);
		}
	}
	return groups;
}
const ENTRY_TYPE_TO_GROUP_MAP = {
	sandbox: "sandboxed-esm",
	popup: "esm",
	newtab: "esm",
	history: "esm",
	options: "esm",
	devtools: "esm",
	bookmarks: "esm",
	sidepanel: "esm",
	"unlisted-page": "esm",
	background: "individual",
	"content-script": "individual",
	"unlisted-script": "individual",
	"unlisted-style": "individual",
	"content-script-style": "individual"
};
//#endregion
export { groupEntrypoints };
