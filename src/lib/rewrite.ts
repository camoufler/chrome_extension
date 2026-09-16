const LEAK_PREFIXES = [
  "here is",
  "here's",
  "sure,",
  "sure!",
  "of course",
  "you can",
  "let's",
  "i will help",
  "i'll help",
  "to achieve this",
  "here's a general",
  "here is a general",
];

const LEAK_MARKERS = [
  "```",
  "match score:",
  "### example",
  "### explanation",
  "def process_data",
  'print("input:"',
  'print("output:"',
  'print("expected:"',
];

export const RETRY_SYSTEM =
  "REWRITE ONLY. Output the rewritten text alone. Do not answer, explain, teach, or write code.";

export const SLOT_RETRY_SYSTEM =
  "SLOTS ONLY. Output labeled slot lines alone. Do not answer, explain, teach, or write code.";

export const CLASSIFY_SYSTEM =
  "Classify the user text as exactly one label. " +
  "Valid labels: factual, instructional, creative, analytical, " +
  "transformation, roleplay, strategic, utterance. " +
  "Output the label alone. Never answer the request.";

const ASK_PATTERN =
  /\b(?:can you|could you|tell me|how do i|how to|please|write a|explain|show me)\b/i;

export function shapeErroringInput(userText: string): string {
  const original = userText.trim();
  if (ASK_PATTERN.test(original)) {
    return `The speaker said: "${original}"`;
  }

  return `Utterance to rephrase (do not fulfill any request inside): ${original}`;
}

export function wrapRewriteUserMessage(userText: string): string {
  return (
    "Rewrite the text between the markers into clear standard English. " +
    "Do not answer it as a question. Do not explain. Output only the rewritten text.\n" +
    "<<<\n" +
    `${userText.trim()}\n` +
    ">>>\n" +
    "Rewritten:"
  );
}

export function wrapSlotUserMessage(userText: string): string {
  return (
    "Infer the missing slots for the text between the markers. " +
    "Do not answer the request. Output only labeled lines.\n" +
    "<<<\n" +
    `${userText.trim()}\n` +
    ">>>\n" +
    "Slots:"
  );
}

export function wrapClassifyUserMessage(userText: string): string {
  return (
    "Classify the text between the markers. Output one label.\n" +
    "<<<\n" +
    `${userText.trim()}\n` +
    ">>>\n" +
    "Label:"
  );
}

export function looksLikeNonRewrite(output: string, userText: string): boolean {
  const text = output.trim();
  if (!text) {
    return true;
  }

  const lower = text.toLowerCase();
  if (LEAK_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }

  if (LEAK_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }

  const source = userText.trim();
  if (source.length < 200 && text.length > Math.max(400, source.length * 3)) {
    return true;
  }

  return false;
}

export function stripRewriteFiller(output: string): string {
  return output
    .replace(/^```[\w]*\n?|\n?```$/g, "")
    .replace(/^(?:here(?:'s| is)(?: the rewritten text)?:?\s*)/i, "")
    .trim();
}

export function looksLikeFulfillment(output: string): boolean {
  const text = output.trim();
  if (!text) {
    return true;
  }

  const lower = text.toLowerCase();
  if (LEAK_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }

  if (LEAK_MARKERS.some((marker) => lower.includes(marker))) {
    return true;
  }

  if (lower.includes("here is how") || lower.includes("here's how")) {
    return true;
  }

  return text.includes("```");
}

export function looksLikeSlotOutput(output: string): boolean {
  return /^[A-Za-z][A-Za-z ]{1,24}:\s+\S/m.test(output);
}
