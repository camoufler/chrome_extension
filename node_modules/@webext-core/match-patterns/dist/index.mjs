//#region src/index.ts
/**
* Class for parsing and performing operations on match patterns.
*
* @example
*   const pattern = new MatchPattern('*://google.com/*');
*
*   pattern.includes('https://google.com'); // true
*   pattern.includes('http://youtube.com/watch?v=123'); // false
*/
var MatchPattern = class MatchPattern {
	static {
		this.PROTOCOLS = [
			"http",
			"https",
			"file",
			"ftp",
			"urn",
			"ws",
			"wss"
		];
	}
	/**
	* Parse a match pattern string. If it is invalid, the constructor will throw an
	* `InvalidMatchPattern` error.
	*
	* @param matchPattern The match pattern to parse.
	*/
	constructor(matchPattern) {
		if (matchPattern === "<all_urls>") {
			this.isAllUrls = true;
			this.protocolMatches = [...MatchPattern.PROTOCOLS];
			this.hostnameMatch = "*";
			this.pathnameMatch = "*";
		} else {
			const groups = /(.*):\/\/(.*?)(\/.*)/.exec(matchPattern);
			if (groups == null) throw new InvalidMatchPattern(matchPattern, "Incorrect format");
			const [_, protocol, hostname, pathname] = groups;
			validateProtocol(matchPattern, protocol);
			validateHostname(matchPattern, hostname);
			this.protocolMatches = protocol === "*" ? ["http", "https"] : [protocol];
			this.hostnameMatch = hostname;
			this.pathnameMatch = pathname;
		}
	}
	/** Check if a URL is included in a pattern. */
	includes(url) {
		const u = typeof url === "string" ? new URL(url) : url instanceof Location ? new URL(url.href) : url;
		if (this.isAllUrls) return !this.isUnknownProtocol(u);
		return !!this.protocolMatches.find((protocol) => {
			if (protocol === "http") return this.isHttpMatch(u);
			if (protocol === "https") return this.isHttpsMatch(u);
			if (protocol === "file") return this.isFileMatch(u);
			if (protocol === "ftp") return this.isFtpMatch(u);
			if (protocol === "urn") return this.isUrnMatch(u);
		});
	}
	isHttpMatch(url) {
		return url.protocol === "http:" && this.isHostPathMatch(url);
	}
	isHttpsMatch(url) {
		return url.protocol === "https:" && this.isHostPathMatch(url);
	}
	isHostPathMatch(url) {
		if (!this.hostnameMatch || !this.pathnameMatch) return false;
		const hostnameMatchRegexs = [this.convertPatternToRegex(this.hostnameMatch), this.convertPatternToRegex(this.hostnameMatch.replace(/^\*\./, ""))];
		const pathnameMatchRegex = this.convertPatternToRegex(this.pathnameMatch);
		return !!hostnameMatchRegexs.find((regex) => regex.test(url.hostname)) && pathnameMatchRegex.test(url.pathname);
	}
	isUnknownProtocol(url) {
		return !this.protocolMatches.includes(url.protocol.slice(0, -1));
	}
	isPathMatch(url) {
		if (!this.pathnameMatch) return false;
		return this.convertPatternToRegex(this.pathnameMatch).test(url.pathname);
	}
	isFileMatch(url) {
		return url.protocol === "file:" && this.isPathMatch(url);
	}
	isFtpMatch(_url) {
		throw Error("Not implemented: ftp:// pattern matching. Open a PR to add support");
	}
	isUrnMatch(_url) {
		throw Error("Not implemented: urn:// pattern matching. Open a PR to add support");
	}
	convertPatternToRegex(pattern) {
		const starsReplaced = this.escapeForRegex(pattern).replace(/\\\*/g, ".*");
		return RegExp(`^${starsReplaced}$`);
	}
	escapeForRegex(string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
};
var InvalidMatchPattern = class extends Error {
	constructor(matchPattern, reason) {
		super(`Invalid match pattern "${matchPattern}": ${reason}`);
	}
};
function validateProtocol(matchPattern, protocol) {
	if (!MatchPattern.PROTOCOLS.includes(protocol) && protocol !== "*") throw new InvalidMatchPattern(matchPattern, `${protocol} not a valid protocol (${MatchPattern.PROTOCOLS.join(", ")})`);
}
function validateHostname(matchPattern, hostname) {
	if (hostname.includes(":")) throw new InvalidMatchPattern(matchPattern, `Hostname cannot include a port`);
	if (hostname.includes("*") && hostname.length > 1 && !hostname.startsWith("*.")) throw new InvalidMatchPattern(matchPattern, `If using a wildcard (*), it must go at the start of the hostname`);
}
//#endregion
export { InvalidMatchPattern, MatchPattern };
