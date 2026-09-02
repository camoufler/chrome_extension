import EventEmitter from "node:events";
import readline from "node:readline";

//#region src/validators.d.ts
type ValidResponseObject = {
  isValid?: true;
};
type InvalidResponseObject = {
  isValid: false;
  error: string;
};
type ValidationResponseObject = ValidResponseObject | InvalidResponseObject;
type ValidationResponse = InvalidResponse | ValidResponse;
type InvalidResponse = string | InvalidResponseObject;
type ValidResponse = null | undefined | true | ValidResponseObject;
type ValidTransformationResponse<T> = {
  isValid: true;
  transformed: T;
};
type TransformationResponse<T> = InvalidResponse | ValidTransformationResponse<T>;
interface PromptValidator<T extends string | string[]> {
  validate: (input: T) => ValidationResponse | Promise<ValidationResponse>;
}
interface PromptTransformer<T> {
  transform: (input: string) => TransformationResponse<T> | Promise<TransformationResponse<T>>;
}
declare function required(): PromptValidator<any>;
//#endregion
//#region src/prompt-agent.d.ts
declare class PromptAgent<T = string> {
  #private;
  /**
   * The prompts answers queue.
   * When not empty, any prompt will be answered by the first answer in this list.
   */
  nextAnswers: T[];
  static shared<T>(): PromptAgent<any>;
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
  nextAnswer(value: T | T[]): void;
  clear(): void;
}
//#endregion
//#region src/transformers.d.ts
declare function number(): PromptTransformer<number>;
declare function integer(): PromptTransformer<number>;
declare function url(): PromptTransformer<URL>;
//#endregion
//#region src/types.d.ts
interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean | string;
}
interface Separator {
  type: "separator";
  label?: string;
}
//#endregion
//#region src/prompts/abstract.d.ts
type Stdin = NodeJS.ReadStream & {
  fd: 0;
};
type Stdout = NodeJS.WriteStream & {
  fd: 1;
};
interface AbstractPromptOptions {
  stdin?: Stdin;
  stdout?: Stdout;
  message: string;
  skip?: boolean;
  signal?: AbortSignal;
  agent?: PromptAgent<string | boolean>;
}
//#endregion
//#region src/prompts/question.d.ts
interface QuestionOptions<T = string> extends AbstractPromptOptions {
  defaultValue?: string;
  hint?: string;
  validators?: PromptValidator<string>[];
  transformer?: PromptTransformer<T>;
  secure?: boolean | {
    placeholder: string;
  };
}
//#endregion
//#region src/prompts/confirm.d.ts
interface ConfirmOptions extends AbstractPromptOptions {
  initial?: boolean;
}
//#endregion
//#region src/prompts/select.d.ts
interface SelectOptions<T extends string> extends AbstractPromptOptions {
  choices: (Choice<T> | T | Separator)[];
  maxVisible?: number;
  ignoreValues?: (T | number | boolean)[];
  validators?: PromptValidator<string>[];
  autocomplete?: boolean;
  caseSensitive?: boolean;
}
//#endregion
//#region src/prompts/multiselect.d.ts
interface MultiselectOptions<T extends string> extends AbstractPromptOptions {
  choices: (Choice<T> | T | Separator)[];
  maxVisible?: number;
  preSelectedChoices?: (Choice<T> | T)[];
  validators?: PromptValidator<string[]>[];
  autocomplete?: boolean;
  caseSensitive?: boolean;
  showHint?: boolean;
}
//#endregion
//#region src/index.d.ts
declare function question<T = string>(message: string, options?: Omit<QuestionOptions<T>, "message">): Promise<T>;
declare function select<T extends string>(message: string, options: Omit<SelectOptions<T>, "message">): Promise<T>;
declare function confirm(message: string, options?: Omit<ConfirmOptions, "message">): Promise<boolean>;
declare function multiselect<T extends string>(message: string, options: Omit<MultiselectOptions<T>, "message">): Promise<T[]>;
declare const validators: {
  required: typeof required;
};
declare const transformers: {
  number: typeof number;
  integer: typeof integer;
  url: typeof url;
};
//#endregion
export { type AbstractPromptOptions, type Choice, type ConfirmOptions, type InvalidResponse, type InvalidResponseObject, type MultiselectOptions, PromptAgent, type PromptTransformer, type PromptValidator, type QuestionOptions, type SelectOptions, type Separator, type TransformationResponse, type ValidResponse, type ValidResponseObject, type ValidTransformationResponse, type ValidationResponse, type ValidationResponseObject, confirm, multiselect, question, select, transformers, validators };