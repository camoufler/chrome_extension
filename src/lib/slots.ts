const JUNK_RE = /^(none|null|n\/?a|nil|undefined|nan|-|none\.|null\.)$/i;

export const ROLE_RE =
  /(?:\byou are\b|\bact as\b|\bacting as\b|\brole\s*:|\bas an?\s+[a-z][a-z\-']{2,})/i;

export const ACTION_RE = new RegExp(
  String.raw`\b(?:` +
    String.raw`analy[sz]e|synthesi[sz]e|compare|evaluate|draft|rewrite|` +
    String.raw`optimize|condense|debug|refactor|architect|review|` +
    String.raw`explain|teach|translate|summarize|write|create|generate|` +
    String.raw`design|produce|redact|normalize|standardize|outline|` +
    String.raw`implement|fix|plan|build|proof\s*read|proofread|edit|` +
    String.raw`correct|paraphrase|rephrase` +
    String.raw`)\b`,
  "i",
);

const ACTION_FULL_RE = new RegExp(`^(?:${ACTION_RE.source})$`, ACTION_RE.flags);

export const SLANG_RE =
  /\b(?:lowkey|bussin|veg out|spilling the tea|finna|gonna|wanna|gotta|sus|no cap|yo,)\b/i;

const TASK_RE =
  /\b(?:proof\s*read|rewrite|write|draft|create|generate|blog|email|analyze|summarize)\b/i;

export const CONTEXT_RE = new RegExp(
  String.raw`\b(?:` +
    String.raw`audience|users?|because|constraint|background|` +
    String.raw`i(?:'m| am) building|we need|target|` +
    String.raw`for (?:senior|junior|beginner|developers?|engineers?|` +
    String.raw`execs?|kids|non-technical)|` +
    String.raw`desktop|mobile|deadline|budget|context\s*:` +
    String.raw`)\b`,
  "i",
);

export const EXPECT_RE = new RegExp(
  String.raw`\b(?:` +
    String.raw`json|markdown|bullet|tone|under \d+|sections?|` +
    String.raw`output as|format|keep it|include|don'?t use|` +
    String.raw`expectations?\s*:|headlines?|outline|word\s*counts?|` +
    String.raw`paragraphs?|word count` +
    String.raw`)\b`,
  "i",
);

export const ROLE_EXTRACT_RE = /((?:you are|act as)\s+.+?)(?:\.|$)/is;

export const ROLE_STOPWORDS = new Set([
  "action",
  "context",
  "expectation",
  "expectations",
  "role",
  "write",
  "none",
  "null",
  "narrator",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function actionFullMatch(text: string): boolean {
  ACTION_FULL_RE.lastIndex = 0;
  return ACTION_FULL_RE.test(text);
}

export function tidy(value: string): string {
  let cleaned = value.trim().split(/\s+/).join(" ");
  cleaned = cleaned.replace(/\s*,\s*/g, ", ");
  return cleaned.replace(/^[ ,]+|[ ,]+$/g, "");
}

export function uncap(value: string): string {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function asSentence(value: string): string {
  let cleaned = tidy(value).replace(/[ .]+$/g, "");
  if (!cleaned) {
    return "";
  }

  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (".!?".includes(cleaned.charAt(cleaned.length - 1))) {
    return cleaned;
  }

  return `${cleaned}.`;
}

export function isJunk(value: string): boolean {
  return !value || JUNK_RE.test(tidy(value));
}

export function isUtterance(text: string): boolean {
  if (TASK_RE.test(text)) {
    return false;
  }

  return SLANG_RE.test(text) || !ACTION_RE.test(text);
}

export function isProofread(text: string): boolean {
  return /proof\s*read/i.test(text);
}

export function echoesPrompt(value: string, original: string): boolean {
  const a = value.toLowerCase().replace(/\W+/g, " ").trim();
  const b = original.toLowerCase().replace(/\W+/g, " ").trim();
  if (!a || !b) {
    return true;
  }

  if (a === b || a.includes(b) || b.includes(a)) {
    return true;
  }

  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  if (sa.size === 0) {
    return true;
  }

  let overlap = 0;
  for (const token of sa) {
    if (sb.has(token)) {
      overlap += 1;
    }
  }

  return overlap / sa.size >= 0.8;
}

function labeledRe(
  slotNames: readonly string[],
  aliases?: Record<string, string>,
): RegExp {
  const names = new Set(slotNames.map((name) => name.toLowerCase()));
  if (aliases) {
    for (const key of Object.keys(aliases)) {
      names.add(key.toLowerCase());
    }
  }

  const pattern = [...names]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`^(${pattern})\\s*:\\s*(.*)$`, "i");
}

function canonicalSlot(key: string, aliases?: Record<string, string>): string {
  const normalized = key.toLowerCase();
  if (aliases && normalized in aliases) {
    return aliases[normalized] ?? normalized;
  }

  if (normalized.startsWith("expectation")) {
    return "expectations";
  }

  return normalized;
}

export function extractLabeledSections(
  text: string,
  slotNames: readonly string[],
  aliases?: Record<string, string>,
): Record<string, string> {
  const labeled = labeledRe(slotNames, aliases);
  const chunks: Record<string, string[]> = {};
  let current: string | null = null;

  for (const raw of text.split(/\r?\n/)) {
    const match = labeled.exec(raw.trim());
    if (match) {
      current = canonicalSlot(match[1] ?? "", aliases);
      chunks[current] = [(match[2] ?? "").trim()];
      continue;
    }

    if (current && raw.trim()) {
      const parts = chunks[current];
      if (parts) {
        parts.push(raw.trim());
      }
    }
  }

  const found: Record<string, string> = {};
  for (const [key, parts] of Object.entries(chunks)) {
    const value = parts.filter(Boolean).join(" ").trim();
    if (value) {
      found[key] = value;
    }
  }

  return found;
}

export function nestedLabelRe(
  slotNames: readonly string[],
  aliases?: Record<string, string>,
): RegExp {
  const names = new Set(slotNames.map((name) => name.toLowerCase()));
  if (aliases) {
    for (const key of Object.keys(aliases)) {
      names.add(key.toLowerCase());
    }
  }

  const pattern = [...names]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`^(${pattern})\\s*:\\s*`, "i");
}

export function cleanPredictedValue(
  slot: string,
  value: string,
  options: {
    slotNames: readonly string[];
    aliases?: Record<string, string>;
    roleSlots?: ReadonlySet<string>;
    verbSlots?: ReadonlySet<string>;
  },
): string {
  const roleSlots = options.roleSlots ?? new Set<string>();
  const verbSlots = options.verbSlots ?? new Set<string>();
  const nested = nestedLabelRe(options.slotNames, options.aliases);
  let cleaned = tidy(value);
  if (isJunk(cleaned)) {
    return "";
  }

  while (true) {
    const match = nested.exec(cleaned);
    if (!match) {
      break;
    }

    const nestedSlot = canonicalSlot(match[1] ?? "", options.aliases);
    if (nestedSlot !== slot) {
      return "";
    }

    cleaned = cleaned.slice(match[0].length).trim();
  }

  if (isJunk(cleaned)) {
    return "";
  }

  if (roleSlots.has(slot)) {
    if (ROLE_STOPWORDS.has(cleaned.toLowerCase())) {
      return "";
    }

    if (actionFullMatch(cleaned)) {
      return "";
    }
  }

  if (verbSlots.has(slot) && actionFullMatch(cleaned)) {
    return "";
  }

  return cleaned;
}

export function withArticle(value: string): string {
  let cleaned = tidy(value).replace(/\.+$/g, "");
  if (!/^(a|an|the)\b/i.test(cleaned)) {
    const article = /^[aeiou]/i.test(cleaned) ? "an" : "a";
    cleaned = `${article} ${cleaned}`;
  }

  return cleaned;
}

export function formatRole(value: string, fallback = "copy editor"): string {
  let cleaned = tidy(value).replace(/\.+$/g, "");
  cleaned = cleaned.replace(/^(you are|act as)\s+/i, "");
  if (isJunk(cleaned) || ROLE_STOPWORDS.has(cleaned.toLowerCase())) {
    cleaned = fallback;
  }

  cleaned = withArticle(cleaned);
  return `You are ${cleaned}.`;
}

export function formatAction(
  value: string,
  fallback = "Rewrite the text into standard English",
): string {
  let cleaned = tidy(value).replace(/\.+$/g, "");
  if (isJunk(cleaned)) {
    cleaned = fallback;
  }

  cleaned = cleaned.replace(/^write me\b/i, "write");
  cleaned = cleaned.replace(/^proof\s+read\b/i, "Proofread");
  return asSentence(cleaned);
}

export function formatContext(
  value: string,
  fallback = "a general audience",
): string {
  let cleaned = tidy(value).replace(/\.+$/g, "");
  if (isJunk(cleaned)) {
    cleaned = fallback;
  }

  if (/^(for|aimed at|audience)\b/i.test(cleaned)) {
    return cleaned;
  }

  return `for ${uncap(cleaned)}`;
}

export function formatExpectations(
  value: string,
  fallback = "clear and concise",
): string {
  let cleaned = tidy(value).replace(/\.+$/g, "");
  if (isJunk(cleaned)) {
    cleaned = fallback;
  }

  if (/^(keep|deliver|output|give|use|include|the result)\b/i.test(cleaned)) {
    return asSentence(cleaned);
  }

  if (/\b(is to be|should be|must be|the text)\b/i.test(cleaned)) {
    return asSentence(cleaned);
  }

  return asSentence(`Keep it ${uncap(cleaned)}`);
}
