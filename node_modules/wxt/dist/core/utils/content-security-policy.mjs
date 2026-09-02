//#region src/core/utils/content-security-policy.ts
var ContentSecurityPolicy = class ContentSecurityPolicy {
	static DIRECTIVE_ORDER = {
		"default-src": 0,
		"script-src": 1,
		"object-src": 2
	};
	data;
	constructor(csp) {
		if (csp) this.data = csp.split(";").map((section) => section.trim()).reduce((data, section) => {
			const [key, ...values] = section.split(" ").map((item) => item.trim());
			if (key) data[key] = values;
			return data;
		}, {});
		else this.data = {};
	}
	/** Ensure a set of values are listed under a directive. */
	add(directive, ...newValues) {
		const values = this.data[directive] ?? [];
		newValues.forEach((newValue) => {
			if (!values.includes(newValue)) values.push(newValue);
		});
		this.data[directive] = values;
		return this;
	}
	toString() {
		return Object.entries(this.data).sort(([l], [r]) => {
			return (ContentSecurityPolicy.DIRECTIVE_ORDER[l] ?? 2) - (ContentSecurityPolicy.DIRECTIVE_ORDER[r] ?? 2);
		}).map((entry) => entry.flat().join(" ")).join("; ") + ";";
	}
};
//#endregion
export { ContentSecurityPolicy };
