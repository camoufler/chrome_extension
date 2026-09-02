//#region src/core/utils/arrays.ts
/** Checks if `predicate` returns truthy for all elements of the array. */
function every(array, predicate) {
	for (let i = 0; i < array.length; i++) if (!predicate(array[i], i)) return false;
	return true;
}
/** Returns true when any of the predicates return true; */
function some(array, predicate) {
	for (let i = 0; i < array.length; i++) if (predicate(array[i], i)) return true;
	return false;
}
/** Convert an item or array to an array. */
function toArray(a) {
	return Array.isArray(a) ? a : [a];
}
function filterTruthy(array) {
	return array.filter((item) => !!item);
}
//#endregion
export { every, filterTruthy, some, toArray };
