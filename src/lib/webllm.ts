import { CreateExtensionServiceWorkerMLCEngine } from "@mlc-ai/web-llm";
import { debug, debugVerbose } from "./debug";
import { BUNDLED_MODEL_ID, getBundledEngineConfig } from "./model";
import { runStandardize } from "./pipeline";
import {
  CLASSIFY_SYSTEM,
  looksLikeFulfillment,
  looksLikeNonRewrite,
  looksLikeSlotOutput,
  RETRY_SYSTEM,
  SLOT_RETRY_SYSTEM,
  shapeErroringInput,
  stripRewriteFiller,
  wrapClassifyUserMessage,
  wrapRewriteUserMessage,
  wrapSlotUserMessage,
} from "./rewrite";

export const WEBLLM_PORT_NAME = "web_llm_service_worker";

const REWRITE_MAX_TOKENS = 512;
const SLOT_MAX_TOKENS = 512;
const CLASSIFY_MAX_TOKENS = 32;

type Engine = Awaited<ReturnType<typeof CreateExtensionServiceWorkerMLCEngine>>;

interface StandardPrompt {
  system_prompt: string;
}

let standardPromptPromise: Promise<string> | null = null;

let enginePromise: ReturnType<
  typeof CreateExtensionServiceWorkerMLCEngine
> | null = null;
let loadedModelId: string | null = null;

export async function stopParaphrasing(): Promise<void> {
  if (!enginePromise) {
    debug("webllm: interrupt skipped, no engine");
    return;
  }

  try {
    debug("webllm: interrupt");
    const engine = await enginePromise;
    await engine.interruptGenerate();
  } catch (cause) {
    debug("webllm: interrupt failed", cause);
    return;
  }
}

export async function paraphraseText(
  text: string,
  modelId: string = BUNDLED_MODEL_ID,
): Promise<string> {
  const resolvedModelId = BUNDLED_MODEL_ID;
  if (modelId !== resolvedModelId) {
    debug("webllm: ignore requested model", modelId);
  }

  if (!enginePromise || loadedModelId !== resolvedModelId) {
    debug("webllm: create engine", resolvedModelId);
    loadedModelId = resolvedModelId;
    enginePromise = CreateExtensionServiceWorkerMLCEngine(
      resolvedModelId,
      getBundledEngineConfig(),
    );
  } else {
    debug("webllm: reuse engine", resolvedModelId);
  }

  const currentEnginePromise = enginePromise;

  try {
    const engine = await currentEnginePromise;
    const systemPrompt = await getStandardSystemPrompt();
    debug("webllm: prompt loaded", { length: systemPrompt.length });
    debugVerbose("webllm: prompt", systemPrompt);
    return await runStandardize(text, systemPrompt, {
      classify: (userText) => chatClassify(engine, userText),
      standardize: (prompt, userText) =>
        chatStandardize(engine, prompt, userText),
      predictSlots: (prompt, userText) =>
        chatPredictSlots(engine, prompt, userText),
    });
  } catch (cause) {
    if (enginePromise === currentEnginePromise) {
      debug("webllm: reset engine after error", cause);
      enginePromise = null;
      loadedModelId = null;
    }

    throw cause;
  }
}

async function getStandardSystemPrompt(): Promise<string> {
  if (!standardPromptPromise) {
    standardPromptPromise = fetch(
      getExtensionUrl("/prompts/standard.json"),
    ).then(async (response) => {
      if (!response.ok) {
        debug("webllm: prompt load failed", response.status);
        throw new Error(
          `Unable to load the standard prompt (${response.status}).`,
        );
      }

      const prompt = (await response.json()) as StandardPrompt;
      if (!prompt.system_prompt?.trim()) {
        debug("webllm: prompt missing system_prompt");
        throw new Error(
          "The standard prompt does not contain a system prompt.",
        );
      }

      return prompt.system_prompt;
    });
  }

  return standardPromptPromise;
}

async function chatStandardize(
  engine: Engine,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  const wrapped = wrapRewriteUserMessage(userText);
  debug("webllm: generate", {
    temperature: 0,
    top_p: 0.9,
    max_tokens: REWRITE_MAX_TOKENS,
    inputLength: userText.length,
  });
  debugVerbose("webllm: input", wrapped);
  let output = await completeChat(
    engine,
    systemPrompt,
    wrapped,
    REWRITE_MAX_TOKENS,
  );
  debug("webllm: response", { outputLength: output.length });
  debugVerbose("webllm: response text", output);

  if (looksLikeNonRewrite(output, userText)) {
    debug("webllm: non-rewrite detected, retrying");
    const shaped = wrapRewriteUserMessage(shapeErroringInput(userText));
    const strictPrompt = `${RETRY_SYSTEM}\n\n${systemPrompt}`;
    debugVerbose("webllm: retry input", shaped);
    output = await completeChat(
      engine,
      strictPrompt,
      shaped,
      REWRITE_MAX_TOKENS,
    );
    debug("webllm: retry response", { outputLength: output.length });
    debugVerbose("webllm: retry response text", output);

    if (looksLikeNonRewrite(output, userText)) {
      const cleaned = stripRewriteFiller(output);
      if (cleaned && !looksLikeNonRewrite(cleaned, userText)) {
        debug("webllm: accepted cleaned retry");
        return cleaned;
      }

      throw new Error(
        "The local model explained instead of rewriting. Try a shorter prompt or a larger model.",
      );
    }
  }

  return output;
}

async function chatPredictSlots(
  engine: Engine,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  const wrapped = wrapSlotUserMessage(userText);
  debug("webllm: predict slots", { inputLength: userText.length });
  debugVerbose("webllm: slot input", wrapped);
  let output = await completeChat(
    engine,
    systemPrompt,
    wrapped,
    SLOT_MAX_TOKENS,
  );
  debugVerbose("webllm: slot response", output);

  if (looksLikeFulfillment(output) || !looksLikeSlotOutput(output)) {
    debug("webllm: non-slot output detected, retrying");
    const strictPrompt = `${SLOT_RETRY_SYSTEM}\n\n${systemPrompt}`;
    output = await completeChat(
      engine,
      strictPrompt,
      wrapSlotUserMessage(userText),
      SLOT_MAX_TOKENS,
    );
    debugVerbose("webllm: slot retry response", output);
    if (looksLikeFulfillment(output) || !looksLikeSlotOutput(output)) {
      debug("webllm: slot inference leaked; using defaults");
      return "";
    }
  }

  return output;
}

async function chatClassify(engine: Engine, userText: string): Promise<string> {
  const wrapped = wrapClassifyUserMessage(userText);
  debug("webllm: classify", {
    inputLength: userText.length,
    max_tokens: CLASSIFY_MAX_TOKENS,
  });
  debugVerbose("webllm: classify input", wrapped);
  const output = await completeChat(
    engine,
    CLASSIFY_SYSTEM,
    wrapped,
    CLASSIFY_MAX_TOKENS,
  );
  debug("webllm: classify response", output);
  return output;
}

async function completeChat(
  engine: Engine,
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
): Promise<string> {
  await engine.resetChat();

  try {
    const response = await engine.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        { role: "user", content: userContent },
      ],
      temperature: 0,
      top_p: 0.9,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message.content;
    if (typeof content !== "string" || !content.trim()) {
      debug("webllm: empty response");
      throw new Error("The local model returned no paraphrased text.");
    }

    return content.trim();
  } finally {
    try {
      await engine.resetChat();
    } catch (cause) {
      debug("webllm: reset after call failed", cause);
    }
  }
}

function getExtensionUrl(path: string): string {
  const runtime = (
    globalThis as typeof globalThis & {
      chrome?: { runtime?: { getURL: (resourcePath: string) => string } };
    }
  ).chrome?.runtime;

  if (!runtime) {
    throw new Error("Extension runtime is unavailable.");
  }

  return runtime.getURL(path);
}
