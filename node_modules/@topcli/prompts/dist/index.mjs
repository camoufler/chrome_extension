import EventEmitter, { once } from "node:events";
import { EOL } from "node:os";
import readline from "node:readline";
import { Writable } from "node:stream";
import { stripVTControlCharacters, styleText } from "node:util";
import process$1 from "node:process";
//#region src/validators.ts
function required() {
	return { validate: (input) => {
		const isValid = Array.isArray(input) ? input.length > 0 : Boolean(input);
		return isValid ? null : {
			isValid,
			error: "required"
		};
	} };
}
function isValid(result) {
	if (typeof result === "object") return result?.isValid !== false;
	if (typeof result === "string") return result.length === 0;
	return true;
}
function isValidTransformation(result) {
	return typeof result === "object" && result.isValid === true;
}
function resultError(result) {
	if (typeof result === "object") return result.error;
	return result;
}
//#endregion
//#region src/prompt-agent.ts
var PromptAgent = class PromptAgent {
	/**
	* The prompts answers queue.
	* When not empty, any prompt will be answered by the first answer in this list.
	*/
	nextAnswers = [];
	static #sharedInstance;
	static shared() {
		this.#sharedInstance ??= new PromptAgent();
		return this.#sharedInstance;
	}
	/**
	* Programmatically set the next answer for any prompt (`question()`, `confirm()`, `select()`)
	*
	* This is useful for testing.
	*
	* @example
	* ```js
	* const promptAgent = PromptAgent.shared();
	* promptAgent.nextAnswer("toto");
	*
	* const input = await question("what is your name?");
	* assert.equal(input, "toto");
	* ```
	*/
	nextAnswer(value) {
		if (Array.isArray(value)) this.nextAnswers.push(...value);
		else this.nextAnswers.push(value);
	}
	clear() {
		this.nextAnswers = [];
	}
};
//#endregion
//#region src/transformers.ts
function number() {
	return { transform(input) {
		if (input.trim() === "") return {
			isValid: false,
			error: "not a number"
		};
		const parsed = Number(input.replace(",", "."));
		if (Number.isNaN(parsed)) return {
			isValid: false,
			error: "not a number"
		};
		return {
			isValid: true,
			transformed: parsed
		};
	} };
}
function integer() {
	return { transform(input) {
		if (input.trim() === "") return {
			isValid: false,
			error: "not an integer"
		};
		const parsed = Number(input);
		if (Number.isNaN(parsed) || !Number.isInteger(parsed)) return {
			isValid: false,
			error: "not an integer"
		};
		return {
			isValid: true,
			transformed: parsed
		};
	} };
}
function url() {
	return { transform(input) {
		if (URL.canParse(input)) return {
			isValid: true,
			transformed: new URL(input)
		};
		try {
			const parsed = new URL(`https://${input}`);
			if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") return {
				isValid: false,
				error: "invalid URL"
			};
			return {
				isValid: true,
				transformed: parsed
			};
		} catch {
			return {
				isValid: false,
				error: "invalid URL"
			};
		}
	} };
}
//#endregion
//#region src/errors/abort.ts
var AbortError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AbortError";
	}
};
//#endregion
//#region src/prompts/abstract.ts
function kNoopTransformer(input) {
	return input;
}
var AbstractPrompt = class AbstractPrompt extends EventEmitter {
	stdin;
	stdout;
	message;
	signal;
	skip;
	history;
	agent;
	transformer = kNoopTransformer;
	rl;
	#signalHandler;
	constructor(options) {
		super();
		if (this.constructor === AbstractPrompt) throw new Error("AbstractPrompt can't be instantiated.");
		const { stdin: input = process.stdin, stdout: output = process.stdout, message, signal, skip = false, agent = PromptAgent.shared() } = options;
		if (typeof message !== "string") throw new TypeError(`message must be string, ${typeof message} given.`);
		if (!output.isTTY) Object.assign(output, {
			moveCursor: () => void 0,
			clearScreenDown: () => void 0
		});
		this.stdin = input;
		this.stdout = output;
		this.message = message;
		this.signal = signal;
		this.skip = skip;
		this.history = [];
		this.agent = agent;
		if (this.stdout.isTTY) this.stdin.setRawMode(true);
		this.rl = readline.createInterface({
			input,
			output: new Writable({ write: (chunk, encoding, callback) => {
				if (chunk) {
					const transformed = this.transformer(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
					if (transformed !== null) this.stdout.write(transformed, encoding);
				}
				callback();
			} }),
			terminal: true
		});
		if (this.signal) {
			this.#signalHandler = () => {
				this.rl.close();
				for (let i = 0; i < this.history.length; i++) this.clearLastLine();
				this.emit("error", new AbortError("Prompt aborted"));
			};
			if (this.signal.aborted) this.#signalHandler();
			this.signal.addEventListener("abort", this.#signalHandler, { once: true });
		}
	}
	reset() {
		this.transformer = kNoopTransformer;
	}
	write(data) {
		const formattedData = stripVTControlCharacters(data).replace(EOL, "");
		if (formattedData) this.history.push(formattedData);
		return this.stdout.write(data);
	}
	clearLastLine() {
		const lastLine = this.history.pop();
		if (!lastLine) return;
		const lastLineRows = Math.ceil(stripVTControlCharacters(lastLine).length / this.stdout.columns);
		this.stdout.moveCursor(-this.stdout.columns, -lastLineRows);
		this.stdout.clearScreenDown();
	}
	destroy() {
		this.rl.close();
		if (this.signal) this.signal.removeEventListener("abort", this.#signalHandler);
	}
};
//#endregion
//#region src/utils.ts
function isSeparator(choice) {
	return typeof choice === "object" && choice !== null && choice.type === "separator";
}
const kLenSegmenter = new Intl.Segmenter();
/**
* @see https://github.com/sindresorhus/is-unicode-supported
*/
function isUnicodeSupported() {
	if (process$1.platform !== "win32") return process$1.env.TERM !== "linux";
	return Boolean(process$1.env.WT_SESSION) || Boolean(process$1.env.TERMINUS_SUBLIME) || process$1.env.ConEmuTask === "{cmd::Cmder}" || process$1.env.TERM_PROGRAM === "Terminus-Sublime" || process$1.env.TERM_PROGRAM === "vscode" || process$1.env.TERM === "xterm-256color" || process$1.env.TERM === "alacritty" || process$1.env.TERMINAL_EMULATOR === "JetBrains-JediTerm";
}
function stringLength(string) {
	if (string === "") return 0;
	let length = 0;
	for (const _ of kLenSegmenter.segment(stripVTControlCharacters(string))) length++;
	return length;
}
//#endregion
//#region src/constants.ts
const kSymbols = isUnicodeSupported() || process.env.CI ? {
	tick: "✔",
	cross: "✖",
	pointer: "›",
	previous: "⭡",
	next: "⭣",
	active: "●",
	inactive: "○",
	separator: "─"
} : {
	tick: "√",
	cross: "×",
	pointer: ">",
	previous: "↑",
	next: "↓",
	active: "(+)",
	inactive: "(-)",
	separator: "-"
};
const kPointer = styleText("gray", kSymbols.pointer);
const SYMBOLS = {
	QuestionMark: styleText(["blue", "bold"], "?"),
	Tick: styleText(["green", "bold"], kSymbols.tick),
	Cross: styleText(["red", "bold"], kSymbols.cross),
	Pointer: kPointer,
	Previous: kSymbols.previous,
	Next: kSymbols.next,
	ShowCursor: "\x1B[?25h",
	HideCursor: "\x1B[?25l",
	Active: styleText("cyan", kSymbols.active),
	Inactive: styleText("gray", kSymbols.inactive),
	SeparatorLine: kSymbols.separator
};
//#endregion
//#region src/prompts/question.ts
var QuestionPrompt = class extends AbstractPrompt {
	defaultValue;
	hint;
	tip;
	questionSuffixError;
	answer;
	answerBuffer;
	#validators;
	#transformer;
	#transformedAnswer;
	#secure;
	#securePlaceholder = null;
	constructor(options) {
		const { defaultValue, hint, validators = [], transformer, secure = false, ...baseOptions } = options;
		super({ ...baseOptions });
		if (validators.length > 0 && transformer !== void 0) throw new Error("validators and transformer are mutually exclusive");
		if (defaultValue && typeof defaultValue !== "string") throw new TypeError("defaultValue must be a string");
		this.defaultValue = defaultValue;
		this.hint = hint;
		this.tip = this.defaultValue ? ` (${this.defaultValue})` : "";
		this.#validators = validators;
		this.#transformer = transformer;
		if (typeof secure === "object") {
			this.#secure = true;
			this.#securePlaceholder = secure.placeholder;
		} else this.#secure = Boolean(secure);
		this.questionSuffixError = "";
	}
	get formattedHint() {
		return this.hint ? styleText("gray", this.hint) : "";
	}
	#question() {
		const { resolve, promise } = Promise.withResolvers();
		const questionQuery = this.#getQuestionQuery();
		this.history.push(questionQuery);
		this.rl.question(questionQuery, (answer) => {
			this.history.push(questionQuery + answer);
			this.reset();
			resolve(answer);
		});
		if (this.#securePlaceholder !== null) this.transformer = (input) => Buffer.from(this.#securePlaceholder.repeat(input.length), "utf-8");
		return promise;
	}
	#getQuestionQuery() {
		const hintPart = this.formattedHint ? ` ${this.formattedHint}` : "";
		return `${styleText("bold", `${SYMBOLS.QuestionMark} ${this.message}${this.tip}`)}${hintPart} ${this.questionSuffixError}`;
	}
	#setQuestionSuffixError(error) {
		const suffix = styleText("red", `[${error}] `);
		this.questionSuffixError = suffix;
	}
	#writeAnswer() {
		const prefix = this.answer ? SYMBOLS.Tick : SYMBOLS.Cross;
		const answer = this.answer ?? "";
		const maskedAnswer = this.#securePlaceholder ? this.#securePlaceholder.repeat(answer.length) : answer;
		const stylizedAnswer = styleText("yellow", this.#secure && this.#securePlaceholder === null ? "CONFIDENTIAL" : maskedAnswer);
		this.write(`${prefix} ${styleText("bold", this.message)} ${SYMBOLS.Pointer} ${stylizedAnswer}${EOL}`);
	}
	#getValidatingQuery(dotCount) {
		return `${styleText("bold", `${SYMBOLS.QuestionMark} ${this.message}${this.tip}`)}${this.formattedHint ? ` ${this.formattedHint}` : ""} ${styleText("yellow", `[validating${".".repeat(dotCount)}]`)}${EOL}`;
	}
	async #runTransformer() {
		const result = this.#transformer.transform(this.answer);
		if (result instanceof Promise) {
			let dotCount = 1;
			this.write(this.#getValidatingQuery(dotCount));
			const spinnerInterval = setInterval(() => {
				dotCount = dotCount % 3 + 1;
				this.clearLastLine();
				this.write(this.#getValidatingQuery(dotCount));
			}, 300);
			try {
				return await result;
			} finally {
				clearInterval(spinnerInterval);
				this.clearLastLine();
			}
		}
		return result;
	}
	async #onQuestionAnswer() {
		const questionLineCount = Math.ceil(stringLength(this.#getQuestionQuery() + this.answer) / this.stdout.columns);
		this.stdout.moveCursor(-this.stdout.columns, -questionLineCount);
		this.stdout.clearScreenDown();
		if (this.#transformer) {
			const result = await this.#runTransformer();
			if (isValidTransformation(result) === false) {
				this.#setQuestionSuffixError(resultError(result));
				this.answerBuffer = this.#question();
				return;
			}
			this.#transformedAnswer = result.transformed;
			this.answerBuffer = void 0;
			this.#writeAnswer();
			return;
		}
		for (const validator of this.#validators) {
			let validationResult;
			const result = validator.validate(this.answer);
			if (result instanceof Promise) {
				let dotCount = 1;
				this.write(this.#getValidatingQuery(dotCount));
				const spinnerInterval = setInterval(() => {
					dotCount = dotCount % 3 + 1;
					this.clearLastLine();
					this.write(this.#getValidatingQuery(dotCount));
				}, 300);
				try {
					validationResult = await result;
				} finally {
					clearInterval(spinnerInterval);
					this.clearLastLine();
				}
			} else validationResult = result;
			if (isValid(validationResult) === false) {
				this.#setQuestionSuffixError(resultError(validationResult));
				this.answerBuffer = this.#question();
				return;
			}
		}
		this.answerBuffer = void 0;
		this.#writeAnswer();
	}
	async listen() {
		if (this.skip) {
			this.destroy();
			if (this.#transformer) {
				const rawValue = this.defaultValue ?? "";
				const result = await this.#transformer.transform(rawValue);
				if (isValidTransformation(result) === false) throw new Error(`Transformer failed for default value "${rawValue}": ${resultError(result)}`);
				return result.transformed;
			}
			return this.defaultValue ?? "";
		}
		const agentAnswer = this.agent.nextAnswers.shift();
		if (agentAnswer !== void 0) {
			this.answer = agentAnswer;
			this.#writeAnswer();
			this.destroy();
			if (this.#transformer) {
				const result = await this.#transformer.transform(agentAnswer);
				if (isValidTransformation(result) === false) throw new Error(`(PromptAgent) transformer failed for answer "${agentAnswer}": ${resultError(result)}`);
				return result.transformed;
			}
			return this.answer;
		}
		this.answer = await this.#question();
		if (this.answer === "" && this.defaultValue) this.answer = this.defaultValue;
		await this.#onQuestionAnswer();
		while (this.answerBuffer !== void 0) {
			this.answer = await this.answerBuffer;
			await this.#onQuestionAnswer();
		}
		this.destroy();
		return this.#transformedAnswer ?? this.answer;
	}
};
//#endregion
//#region src/prompts/confirm.ts
const kToggleKeys = /* @__PURE__ */ new Set([
	"left",
	"right",
	"tab",
	"q",
	"a",
	"d",
	"h",
	"j",
	"k",
	"l",
	"space"
]);
var ConfirmPrompt = class extends AbstractPrompt {
	initial;
	selectedValue;
	fastAnswer;
	#boundKeyPressEvent;
	#boundExitEvent;
	constructor(options) {
		const { initial = false, ...baseOptions } = options;
		super({ ...baseOptions });
		this.initial = initial;
		this.selectedValue = initial;
	}
	#getHint() {
		const Yes = styleText([
			"cyan",
			"bold",
			"underline"
		], "Yes");
		const No = styleText([
			"cyan",
			"bold",
			"underline"
		], "No");
		return this.selectedValue ? `${Yes}/No` : `Yes/${No}`;
	}
	#render() {
		this.write(this.#getQuestionQuery());
	}
	#onKeypress(resolve, _value, key) {
		this.stdout.moveCursor(-this.stdout.columns, -Math.floor(stringLength(this.#getQuestionQuery()) / this.stdout.columns));
		this.stdout.clearScreenDown();
		if (key.name === "return") {
			resolve(this.selectedValue);
			return;
		}
		if (kToggleKeys.has(key.name ?? "")) this.selectedValue = !this.selectedValue;
		if (key.name === "y") {
			this.selectedValue = true;
			resolve(true);
			this.fastAnswer = true;
		} else if (key.name === "n") {
			this.selectedValue = false;
			resolve(false);
			this.fastAnswer = true;
		}
		if (!this.fastAnswer) this.#render();
	}
	#onProcessExit() {
		this.stdin.off("keypress", this.#boundKeyPressEvent);
	}
	#getQuestionQuery() {
		return `${styleText("bold", `${SYMBOLS.QuestionMark} ${this.message}`)} ${this.#getHint()}`;
	}
	#onQuestionAnswer() {
		this.clearLastLine();
		this.stdout.moveCursor(-this.stdout.columns, -Math.floor(stringLength(this.#getQuestionQuery()) / this.stdout.columns));
		this.stdout.clearScreenDown();
		this.write(`${this.selectedValue ? SYMBOLS.Tick : SYMBOLS.Cross} ${styleText("bold", this.message)}${EOL}`);
	}
	async listen() {
		if (this.skip) {
			this.destroy();
			return this.initial;
		}
		const answer = this.agent.nextAnswers.shift();
		if (answer !== void 0) {
			this.selectedValue = answer;
			this.#onQuestionAnswer();
			this.destroy();
			return answer;
		}
		this.write(SYMBOLS.HideCursor);
		try {
			const { resolve, promise } = Promise.withResolvers();
			const questionQuery = this.#getQuestionQuery();
			this.write(questionQuery);
			this.#boundKeyPressEvent = this.#onKeypress.bind(this, resolve);
			this.stdin.on("keypress", this.#boundKeyPressEvent);
			this.#boundExitEvent = this.#onProcessExit.bind(this);
			process.once("exit", this.#boundExitEvent);
			await promise;
			this.#onQuestionAnswer();
		} finally {
			this.write(SYMBOLS.ShowCursor);
			this.#onProcessExit();
			process.off("exit", this.#boundExitEvent);
			this.destroy();
		}
		return this.selectedValue;
	}
};
//#endregion
//#region src/prompts/select.ts
const kRequiredChoiceProperties$1 = ["label", "value"];
var SelectPrompt = class extends AbstractPrompt {
	#boundExitEvent = () => void 0;
	#boundKeyPressEvent = () => void 0;
	#validators;
	#isValidating = false;
	activeIndex = 0;
	questionMessage;
	autocompleteValue = "";
	options;
	lastRender;
	get choices() {
		return this.options.choices;
	}
	get filteredChoices() {
		if (!(this.options.autocomplete && this.autocompleteValue.length > 0)) return this.choices;
		const isCaseSensitive = this.options.caseSensitive;
		const autocompleteValue = isCaseSensitive ? this.autocompleteValue : this.autocompleteValue.toLowerCase();
		return this.choices.filter((choice) => !isSeparator(choice) && this.#filterChoice(choice, autocompleteValue, isCaseSensitive));
	}
	#filterChoice(choice, autocompleteValue, isCaseSensitive = false) {
		const choiceValue = typeof choice === "string" ? isCaseSensitive ? choice : choice.toLowerCase() : isCaseSensitive ? choice.label : choice.label.toLowerCase();
		if (autocompleteValue.includes(" ")) return this.#filterMultipleWords(choiceValue, autocompleteValue, isCaseSensitive);
		return choiceValue.includes(autocompleteValue);
	}
	#filterMultipleWords(choiceValue, autocompleteValue, isCaseSensitive) {
		return autocompleteValue.split(" ").every((word) => {
			const wordValue = isCaseSensitive ? word : word.toLowerCase();
			return choiceValue.includes(wordValue) || choiceValue.includes(autocompleteValue);
		});
	}
	#isChoiceDisabled(choice) {
		return typeof choice !== "string" && Boolean(choice.disabled);
	}
	#findNextEnabledIndex(from, direction) {
		const total = this.filteredChoices.length;
		if (total === 0) return from;
		let index = (from + direction + total) % total;
		while (index !== from) {
			const choice = this.filteredChoices[index];
			if (!isSeparator(choice) && !this.#isChoiceDisabled(choice)) return index;
			index = (index + direction + total) % total;
		}
		return from;
	}
	#findFirstEnabledIndex() {
		const index = this.filteredChoices.findIndex((choice) => !isSeparator(choice) && !this.#isChoiceDisabled(choice));
		return index === -1 ? 0 : index;
	}
	get longestChoice() {
		const selectableChoices = this.filteredChoices.filter((choice) => !isSeparator(choice));
		if (selectableChoices.length === 0) return 0;
		return Math.max(...selectableChoices.map((choice) => {
			if (typeof choice === "string") return choice.length;
			return choice.label.length;
		}));
	}
	constructor(options) {
		const { choices, validators = [], ...baseOptions } = options;
		super({ ...baseOptions });
		this.options = options;
		if (!choices?.length) {
			this.destroy();
			throw new TypeError("Missing required param: choices");
		}
		this.#validators = validators;
		for (const choice of choices) {
			if (typeof choice === "string" || isSeparator(choice)) continue;
			for (const prop of kRequiredChoiceProperties$1) if (!choice[prop]) {
				this.destroy();
				throw new TypeError(`Missing ${prop} for choice ${JSON.stringify(choice)}`);
			}
		}
		if (choices.findIndex((choice) => !isSeparator(choice)) === -1) {
			this.destroy();
			throw new TypeError("choices must contain at least one non-separator item");
		}
		this.activeIndex = this.#findFirstEnabledIndex();
	}
	#getFormattedChoice(choiceIndex) {
		const choice = this.filteredChoices[choiceIndex];
		if (typeof choice === "string") return {
			value: choice,
			label: choice
		};
		return choice;
	}
	#getVisibleChoices() {
		const maxVisible = this.options.maxVisible || 8;
		let startIndex = Math.min(this.filteredChoices.length - maxVisible, this.activeIndex - Math.floor(maxVisible / 2));
		if (startIndex < 0) startIndex = 0;
		const endIndex = Math.min(startIndex + maxVisible, this.filteredChoices.length);
		return {
			startIndex,
			endIndex
		};
	}
	#showChoices() {
		const { startIndex, endIndex } = this.#getVisibleChoices();
		this.lastRender = {
			startIndex,
			endIndex
		};
		if (this.options.autocomplete) this.write(`${SYMBOLS.Pointer} ${this.autocompleteValue}${EOL}`);
		for (let choiceIndex = startIndex; choiceIndex < endIndex; choiceIndex++) {
			const rawChoice = this.filteredChoices[choiceIndex];
			if (isSeparator(rawChoice)) {
				const separatorLabel = rawChoice.label ? `  ${rawChoice.label}  ` : "";
				this.write(`  ${styleText("gray", `${SYMBOLS.SeparatorLine}${SYMBOLS.SeparatorLine}${separatorLabel}${SYMBOLS.SeparatorLine}${SYMBOLS.SeparatorLine}`)}${EOL}`);
				continue;
			}
			const formattedChoice = this.#getFormattedChoice(choiceIndex);
			const isChoiceSelected = choiceIndex === this.activeIndex;
			const isChoiceDisabled = this.#isChoiceDisabled(rawChoice);
			const showPreviousChoicesArrow = startIndex > 0 && choiceIndex === startIndex;
			const showNextChoicesArrow = endIndex < this.filteredChoices.length && choiceIndex === endIndex - 1;
			let prefixArrow = " ";
			if (showPreviousChoicesArrow) prefixArrow = SYMBOLS.Previous;
			else if (showNextChoicesArrow) prefixArrow = SYMBOLS.Next;
			const prefix = isChoiceDisabled ? `${prefixArrow}  ` : `${prefixArrow}${isChoiceSelected ? `${SYMBOLS.Pointer} ` : "  "}`;
			const formattedLabel = formattedChoice.label.padEnd(this.longestChoice < 10 ? this.longestChoice : 0);
			const formattedDescription = formattedChoice.description ? ` - ${formattedChoice.description}` : "";
			const disabledMessage = isChoiceDisabled && typeof rawChoice !== "string" && typeof rawChoice.disabled === "string" ? ` [${rawChoice.disabled}]` : "";
			let textStyles;
			if (isChoiceDisabled) textStyles = ["gray", "dim"];
			else if (isChoiceSelected) textStyles = ["white", "bold"];
			else textStyles = ["gray"];
			const str = `${prefix}${styleText(textStyles, `${formattedLabel}${formattedDescription}${disabledMessage}`)}${EOL}`;
			this.write(str);
		}
	}
	async #handleReturn(resolve, render) {
		const activeChoice = this.filteredChoices[this.activeIndex];
		if (isSeparator(activeChoice)) return;
		if (activeChoice !== void 0 && this.#isChoiceDisabled(activeChoice)) return;
		this.#isValidating = true;
		try {
			const choice = activeChoice ?? "";
			const label = typeof choice === "string" ? choice : choice.label;
			const value = typeof choice === "string" ? choice : choice.value;
			for (const validator of this.#validators) {
				let validationResult;
				const result = validator.validate(value);
				if (result instanceof Promise) {
					let dotCount = 1;
					render({ validating: `validating${".".repeat(dotCount)}` });
					const spinnerInterval = setInterval(() => {
						dotCount = dotCount % 3 + 1;
						render({ validating: `validating${".".repeat(dotCount)}` });
					}, 300);
					try {
						validationResult = await result;
					} finally {
						clearInterval(spinnerInterval);
					}
				} else validationResult = result;
				if (isValid(validationResult) === false) {
					render({ error: resultError(validationResult) });
					return;
				}
			}
			render({ clearRender: true });
			if (!this.options.ignoreValues?.includes(value)) this.#showAnsweredQuestion(label);
			this.write(SYMBOLS.ShowCursor);
			this.destroy();
			this.#onProcessExit();
			process.off("exit", this.#boundExitEvent);
			resolve(value);
		} finally {
			this.#isValidating = false;
		}
	}
	#showAnsweredQuestion(label) {
		const prefix = `${label === "" ? SYMBOLS.Cross : SYMBOLS.Tick} ${styleText("bold", this.message)} ${SYMBOLS.Pointer}`;
		const formattedChoice = styleText("yellow", label);
		this.write(`${prefix} ${formattedChoice}${EOL}`);
	}
	#onProcessExit() {
		this.stdin.off("keypress", this.#boundKeyPressEvent);
		this.stdout.moveCursor(-this.stdout.columns, 0);
		this.stdout.clearScreenDown();
		this.write(SYMBOLS.ShowCursor);
	}
	#onKeypress(...args) {
		const [resolve, render, , key] = args;
		if (this.#isValidating) return;
		if (key.name === "up") {
			this.activeIndex = this.#findNextEnabledIndex(this.activeIndex, -1);
			render();
		} else if (key.name === "down") {
			this.activeIndex = this.#findNextEnabledIndex(this.activeIndex, 1);
			render();
		} else if (key.name === "return") this.#handleReturn(resolve, render);
		else {
			if (!key.ctrl && this.options.autocomplete) {
				this.activeIndex = this.#findFirstEnabledIndex();
				if (key.name === "backspace" && this.autocompleteValue.length > 0) this.autocompleteValue = this.autocompleteValue.slice(0, -1);
				else if (key.name !== "backspace") this.autocompleteValue += key.sequence;
			}
			render();
		}
	}
	async listen() {
		if (this.skip) {
			this.destroy();
			const firstSelectable = this.filteredChoices.find((choice) => !isSeparator(choice));
			return typeof firstSelectable === "string" ? firstSelectable : firstSelectable?.value ?? "";
		}
		const answer = this.agent.nextAnswers.shift();
		if (answer !== void 0) {
			this.#showAnsweredQuestion(answer);
			this.destroy();
			return answer;
		}
		this.transformer = () => null;
		this.write(SYMBOLS.HideCursor);
		this.#showQuestion();
		const render = (options = {}) => {
			const { initialRender = false, clearRender = false, error = null, validating = null } = options;
			if (!initialRender) {
				let linesToClear = this.lastRender.endIndex - this.lastRender.startIndex;
				while (linesToClear > 0) {
					this.clearLastLine();
					linesToClear--;
				}
				if (this.options.autocomplete) {
					let linesToClear = Math.ceil(stringLength(`${SYMBOLS.Pointer} ${this.autocompleteValue}`) / this.stdout.columns);
					while (linesToClear > 0) {
						this.clearLastLine();
						linesToClear--;
					}
				}
			}
			if (clearRender) {
				this.clearLastLine();
				return;
			}
			if (error || validating) {
				this.clearLastLine();
				this.#showQuestion(error, validating);
			}
			this.#showChoices();
		};
		render({ initialRender: true });
		this.#boundExitEvent = this.#onProcessExit.bind(this);
		process.once("exit", this.#boundExitEvent);
		const { resolve, promise } = Promise.withResolvers();
		this.#boundKeyPressEvent = this.#onKeypress.bind(this, resolve, render);
		this.stdin.on("keypress", this.#boundKeyPressEvent);
		return promise;
	}
	#showQuestion(error = null, validating = null) {
		let hint = "";
		if (validating) hint = styleText("yellow", `[${validating}]`);
		else if (error) hint += `${hint.length > 0 ? " " : ""}${styleText(["red", "bold"], `[${error}]`)}`;
		this.questionMessage = `${SYMBOLS.QuestionMark} ${styleText("bold", this.message)}${hint.length > 0 ? ` ${hint}` : ""}`;
		this.write(`${this.questionMessage}${EOL}`);
	}
};
//#endregion
//#region src/prompts/multiselect.ts
const kRequiredChoiceProperties = ["label", "value"];
var MultiselectPrompt = class extends AbstractPrompt {
	#boundExitEvent = () => void 0;
	#boundKeyPressEvent = () => void 0;
	#validators;
	#showHint;
	#isValidating = false;
	activeIndex = 0;
	selectedIndexes = /* @__PURE__ */ new Set();
	questionMessage;
	autocompleteValue = "";
	options;
	lastRender;
	get choices() {
		return this.options.choices;
	}
	get filteredChoices() {
		if (!(this.options.autocomplete && this.autocompleteValue.length > 0)) return this.choices;
		const isCaseSensitive = this.options.caseSensitive;
		const autocompleteValue = isCaseSensitive ? this.autocompleteValue : this.autocompleteValue.toLowerCase();
		return this.choices.filter((choice) => !isSeparator(choice) && this.#filterChoice(choice, autocompleteValue, isCaseSensitive));
	}
	#filterChoice(choice, autocompleteValue, isCaseSensitive = false) {
		const choiceValue = typeof choice === "string" ? isCaseSensitive ? choice : choice.toLowerCase() : isCaseSensitive ? choice.label : choice.label.toLowerCase();
		if (autocompleteValue.includes(" ")) return this.#filterMultipleWords(choiceValue, autocompleteValue, isCaseSensitive);
		return choiceValue.includes(autocompleteValue);
	}
	#filterMultipleWords(choiceValue, autocompleteValue, isCaseSensitive) {
		return autocompleteValue.split(" ").every((word) => {
			const wordValue = isCaseSensitive ? word : word.toLowerCase();
			return choiceValue.includes(wordValue) || choiceValue.includes(autocompleteValue);
		});
	}
	#isChoiceDisabled(choice) {
		return typeof choice !== "string" && Boolean(choice.disabled);
	}
	#findNextEnabledIndex(from, direction) {
		const total = this.filteredChoices.length;
		if (total === 0) return from;
		let index = (from + direction + total) % total;
		while (index !== from) {
			const choice = this.filteredChoices[index];
			if (!isSeparator(choice) && !this.#isChoiceDisabled(choice)) return index;
			index = (index + direction + total) % total;
		}
		return from;
	}
	#findFirstEnabledIndex() {
		const index = this.filteredChoices.findIndex((choice) => !isSeparator(choice) && !this.#isChoiceDisabled(choice));
		return index === -1 ? 0 : index;
	}
	get longestChoice() {
		const selectableChoices = this.filteredChoices.filter((choice) => !isSeparator(choice));
		if (selectableChoices.length === 0) return 0;
		return Math.max(...selectableChoices.map((choice) => {
			if (typeof choice === "string") return choice.length;
			return choice.label.length;
		}));
	}
	constructor(options) {
		const { choices, preSelectedChoices = [], validators = [], showHint = true, ...baseOptions } = options;
		super({ ...baseOptions });
		this.options = options;
		if (!choices?.length) {
			this.destroy();
			throw new TypeError("Missing required param: choices");
		}
		this.#validators = validators;
		this.#showHint = showHint;
		for (const choice of choices) {
			if (typeof choice === "string" || isSeparator(choice)) continue;
			for (const prop of kRequiredChoiceProperties) if (!choice[prop]) {
				this.destroy();
				throw new TypeError(`Missing ${prop} for choice ${JSON.stringify(choice)}`);
			}
		}
		if (choices.findIndex((choice) => !isSeparator(choice)) === -1) {
			this.destroy();
			throw new TypeError("choices must contain at least one non-separator item");
		}
		this.activeIndex = this.#findFirstEnabledIndex();
		for (const choice of preSelectedChoices) {
			const choiceIndex = this.filteredChoices.findIndex((item) => {
				if (typeof item === "string") return item === choice;
				if (isSeparator(item)) return false;
				return item.value === (typeof choice === "string" ? choice : choice.value);
			});
			if (choiceIndex === -1) {
				this.destroy();
				throw new Error(`Invalid pre-selected choice: ${typeof choice === "string" ? choice : choice.value}`);
			}
			if (this.#isChoiceDisabled(this.filteredChoices[choiceIndex])) {
				this.destroy();
				throw new Error(`Cannot pre-select a disabled choice: ${typeof choice === "string" ? choice : choice.value}`);
			}
			this.selectedIndexes.add(choiceIndex);
		}
	}
	#getFormattedChoice(choiceIndex) {
		const choice = this.filteredChoices[choiceIndex];
		if (typeof choice === "string") return {
			value: choice,
			label: choice
		};
		return choice;
	}
	#getVisibleChoices() {
		const maxVisible = this.options.maxVisible || 8;
		let startIndex = Math.min(this.filteredChoices.length - maxVisible, this.activeIndex - Math.floor(maxVisible / 2));
		if (startIndex < 0) startIndex = 0;
		const endIndex = Math.min(startIndex + maxVisible, this.filteredChoices.length);
		return {
			startIndex,
			endIndex
		};
	}
	#showChoices() {
		const { startIndex, endIndex } = this.#getVisibleChoices();
		this.lastRender = {
			startIndex,
			endIndex
		};
		if (this.options.autocomplete) this.write(`${SYMBOLS.Pointer} ${this.autocompleteValue}${EOL}`);
		for (let choiceIndex = startIndex; choiceIndex < endIndex; choiceIndex++) {
			const rawChoice = this.filteredChoices[choiceIndex];
			if (isSeparator(rawChoice)) {
				const separatorLabel = rawChoice.label ? `  ${rawChoice.label}  ` : "";
				this.write(`  ${styleText("gray", `${SYMBOLS.SeparatorLine}${SYMBOLS.SeparatorLine}${separatorLabel}${SYMBOLS.SeparatorLine}${SYMBOLS.SeparatorLine}`)}${EOL}`);
				continue;
			}
			const formattedChoice = this.#getFormattedChoice(choiceIndex);
			const isChoiceActive = choiceIndex === this.activeIndex;
			const isChoiceSelected = this.selectedIndexes.has(choiceIndex);
			const isChoiceDisabled = this.#isChoiceDisabled(rawChoice);
			const showPreviousChoicesArrow = startIndex > 0 && choiceIndex === startIndex;
			const showNextChoicesArrow = endIndex < this.filteredChoices.length && choiceIndex === endIndex - 1;
			let prefixArrow = "  ";
			if (showPreviousChoicesArrow) prefixArrow = SYMBOLS.Previous + " ";
			else if (showNextChoicesArrow) prefixArrow = SYMBOLS.Next + " ";
			const prefix = `${prefixArrow}${isChoiceSelected ? SYMBOLS.Active : SYMBOLS.Inactive}`;
			const formattedLabel = formattedChoice.label.padEnd(this.longestChoice < 10 ? this.longestChoice : 0);
			const formattedDescription = formattedChoice.description ? ` - ${formattedChoice.description}` : "";
			const disabledMessage = isChoiceDisabled && typeof rawChoice !== "string" && typeof rawChoice.disabled === "string" ? ` [${rawChoice.disabled}]` : "";
			let textStyles;
			if (isChoiceDisabled) textStyles = ["gray", "dim"];
			else if (isChoiceActive) textStyles = ["white", "bold"];
			else textStyles = ["gray"];
			const str = `${prefix} ${styleText(textStyles, `${formattedLabel}${formattedDescription}${disabledMessage}`)}${EOL}`;
			this.write(str);
		}
	}
	async #handleReturn(resolve, render) {
		this.#isValidating = true;
		try {
			const { values, labels } = this.#selectedChoices();
			for (const validator of this.#validators) {
				let validationResult;
				const result = validator.validate(values);
				if (result instanceof Promise) {
					let dotCount = 1;
					render({ validating: `validating${".".repeat(dotCount)}` });
					const spinnerInterval = setInterval(() => {
						dotCount = dotCount % 3 + 1;
						render({ validating: `validating${".".repeat(dotCount)}` });
					}, 300);
					try {
						validationResult = await result;
					} finally {
						clearInterval(spinnerInterval);
					}
				} else validationResult = result;
				if (isValid(validationResult) === false) {
					render({ error: resultError(validationResult) });
					return;
				}
			}
			render({ clearRender: true });
			this.#showAnsweredQuestion(labels.join(", "));
			this.write(SYMBOLS.ShowCursor);
			this.destroy();
			this.#onProcessExit();
			process.off("exit", this.#boundExitEvent);
			resolve(values);
		} finally {
			this.#isValidating = false;
		}
	}
	#showAnsweredQuestion(choices, isAgentAnswer = false) {
		const prefix = `${this.selectedIndexes.size === 0 && !isAgentAnswer ? SYMBOLS.Cross : SYMBOLS.Tick} ${styleText("bold", this.message)} ${SYMBOLS.Pointer}`;
		const formattedChoice = styleText("yellow", choices);
		this.write(`${prefix}${choices ? ` ${formattedChoice}` : ""}${EOL}`);
	}
	#selectedChoices() {
		return [...this.selectedIndexes].reduce((acc, index) => {
			const choice = this.filteredChoices[index];
			if (typeof choice === "string") {
				acc.values.push(choice);
				acc.labels.push(choice);
			} else if (!isSeparator(choice)) {
				acc.values.push(choice.value);
				acc.labels.push(choice.label);
			}
			return acc;
		}, {
			values: [],
			labels: []
		});
	}
	#onProcessExit() {
		this.stdin.off("keypress", this.#boundKeyPressEvent);
		this.stdout.moveCursor(-this.stdout.columns, 0);
		this.stdout.clearScreenDown();
		this.write(SYMBOLS.ShowCursor);
	}
	#onKeypress(...args) {
		const [resolve, render, , key] = args;
		if (this.#isValidating) return;
		if (key.name === "up") {
			this.activeIndex = this.#findNextEnabledIndex(this.activeIndex, -1);
			render();
		} else if (key.name === "down") {
			this.activeIndex = this.#findNextEnabledIndex(this.activeIndex, 1);
			render();
		} else if (key.ctrl && key.name === "a") {
			const enabledIndexes = this.filteredChoices.flatMap((choice, index) => {
				if (isSeparator(choice)) return [];
				return this.#isChoiceDisabled(choice) ? [] : [index];
			});
			this.selectedIndexes = this.selectedIndexes.size === enabledIndexes.length ? /* @__PURE__ */ new Set() : new Set(enabledIndexes);
			render();
		} else if (key.name === "right") {
			const activeChoice = this.filteredChoices[this.activeIndex];
			if (!isSeparator(activeChoice) && !this.#isChoiceDisabled(activeChoice)) {
				this.selectedIndexes.add(this.activeIndex);
				render();
			}
		} else if (key.name === "left") {
			const activeChoice = this.filteredChoices[this.activeIndex];
			if (!isSeparator(activeChoice) && !this.#isChoiceDisabled(activeChoice)) {
				this.selectedIndexes = new Set([...this.selectedIndexes].filter((index) => index !== this.activeIndex));
				render();
			}
		} else if (key.name === "return") this.#handleReturn(resolve, render);
		else {
			if (!key.ctrl && this.options.autocomplete) {
				this.selectedIndexes.clear();
				this.activeIndex = this.#findFirstEnabledIndex();
				if (key.name === "backspace" && this.autocompleteValue.length > 0) this.autocompleteValue = this.autocompleteValue.slice(0, -1);
				else if (key.name !== "backspace") this.autocompleteValue += key.sequence;
			}
			render();
		}
	}
	async listen() {
		if (this.skip) {
			this.destroy();
			const { values } = this.#selectedChoices();
			return values;
		}
		const answer = this.agent.nextAnswers.shift();
		if (answer !== void 0) {
			const formatedAnser = Array.isArray(answer) ? answer.join(", ") : answer;
			this.#showAnsweredQuestion(formatedAnser, true);
			this.destroy();
			return Array.isArray(answer) ? answer : [answer];
		}
		this.transformer = () => null;
		this.write(SYMBOLS.HideCursor);
		this.#showQuestion();
		const render = (options = {}) => {
			const { initialRender = false, clearRender = false, error = null, validating = null } = options;
			if (!initialRender) {
				let linesToClear = this.lastRender.endIndex - this.lastRender.startIndex;
				while (linesToClear > 0) {
					this.clearLastLine();
					linesToClear--;
				}
				if (this.options.autocomplete) {
					let linesToClear = Math.ceil(stringLength(`${SYMBOLS.Pointer} ${this.autocompleteValue}`) / this.stdout.columns);
					while (linesToClear > 0) {
						this.clearLastLine();
						linesToClear--;
					}
				}
			}
			if (clearRender) {
				this.clearLastLine();
				return;
			}
			if (error || validating) {
				this.clearLastLine();
				this.#showQuestion(error, validating);
			}
			this.#showChoices();
		};
		render({ initialRender: true });
		this.#boundExitEvent = this.#onProcessExit.bind(this);
		process.once("exit", this.#boundExitEvent);
		const { promise, resolve } = Promise.withResolvers();
		this.#boundKeyPressEvent = this.#onKeypress.bind(this, resolve, render);
		this.stdin.on("keypress", this.#boundKeyPressEvent);
		return promise;
	}
	#showQuestion(error = null, validating = null) {
		let hint = this.#showHint ? styleText("gray", `(Press ${styleText("bold", "<Ctrl+A>")} to toggle all, ${styleText("bold", "<Left/Right>")} to toggle, ${styleText("bold", "<Return>")} to submit)`) : "";
		if (validating) hint += `${hint.length > 0 ? " " : ""}${styleText("yellow", `[${validating}]`)}`;
		else if (error) hint += `${hint.length > 0 ? " " : ""}${styleText(["red", "bold"], `[${error}]`)}`;
		this.questionMessage = `${SYMBOLS.QuestionMark} ${styleText("bold", this.message)}${hint.length > 0 ? ` ${hint}` : ""}`;
		this.write(`${this.questionMessage}${EOL}`);
	}
};
//#endregion
//#region src/index.ts
async function question(message, options = {}) {
	const prompt = new QuestionPrompt({
		...options,
		message
	});
	const onErrorSignal = new AbortController();
	const onError = once(prompt, "error", { signal: onErrorSignal.signal });
	const result = await Promise.race([prompt.listen(), onError]);
	if (isAbortError(result)) {
		prompt.destroy();
		throw result[0];
	}
	onErrorSignal.abort();
	return result;
}
async function select(message, options) {
	const prompt = new SelectPrompt({
		...options,
		message
	});
	const onErrorSignal = new AbortController();
	const onError = once(prompt, "error", { signal: onErrorSignal.signal });
	const result = await Promise.race([prompt.listen(), onError]);
	if (isAbortError(result)) {
		prompt.destroy();
		throw result[0];
	}
	onErrorSignal.abort();
	return result;
}
async function confirm(message, options = {}) {
	const prompt = new ConfirmPrompt({
		...options,
		message
	});
	const onErrorSignal = new AbortController();
	const onError = once(prompt, "error", { signal: onErrorSignal.signal });
	const result = await Promise.race([prompt.listen(), onError]);
	if (isAbortError(result)) {
		prompt.destroy();
		throw result[0];
	}
	onErrorSignal.abort();
	return result;
}
async function multiselect(message, options) {
	const prompt = new MultiselectPrompt({
		...options,
		message
	});
	const onErrorSignal = new AbortController();
	const onError = once(prompt, "error", { signal: onErrorSignal.signal });
	const result = await Promise.race([prompt.listen(), onError]);
	if (isAbortError(result)) {
		prompt.destroy();
		throw result[0];
	}
	onErrorSignal.abort();
	return result;
}
function isAbortError(error) {
	return Array.isArray(error) && error.length > 0 && error[0] instanceof Error;
}
const validators = { required };
const transformers = {
	number,
	integer,
	url
};
//#endregion
export { PromptAgent, confirm, multiselect, question, select, transformers, validators };
