import { anonymize } from "./anonymize";
import { debug } from "./debug";
import {
  TYPE_TO_FRAMEWORK,
  completeFromPrediction,
  needsPrediction,
} from "./frameworks";
import { PromptType, classify, type ClassifyChat } from "./prompt-types";

export interface StandardizeChats {
  classify?: ClassifyChat;
  standardize: (systemPrompt: string, userText: string) => Promise<string>;
  predictSlots: (systemPrompt: string, userText: string) => Promise<string>;
}

async function rewrite(
  userText: string,
  systemPrompt: string,
  standardize: StandardizeChats["standardize"],
  required: boolean,
): Promise<string> {
  try {
    const rewritten = await standardize(systemPrompt, userText);
    const cleaned = rewritten.trim();
    return cleaned || userText.trim();
  } catch (cause) {
    if (required) {
      throw cause;
    }

    debug("pipeline: rewrite failed; expanding from original text", cause);
    return userText.trim();
  }
}

export async function runStandardize(
  userText: string,
  systemPrompt: string,
  chats: StandardizeChats,
): Promise<string> {
  const promptType = await classify(userText, chats.classify);
  debug("pipeline: detected prompt type", promptType);
  const cleaned = await rewrite(
    userText,
    systemPrompt,
    chats.standardize,
    promptType === PromptType.UTTERANCE,
  );
  if (promptType === PromptType.UTTERANCE) {
    return anonymize(cleaned);
  }

  const framework = TYPE_TO_FRAMEWORK[promptType];
  if (!framework) {
    return anonymize(cleaned);
  }
  let predicted = "";
  if (needsPrediction(framework, cleaned)) {
    predicted = await chats.predictSlots(framework.systemPrompt, cleaned);
  }

  const paragraph = completeFromPrediction(
    framework,
    cleaned,
    predicted || null,
  );
  return anonymize(paragraph);
}
