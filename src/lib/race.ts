import {
  ACTION_RE,
  CONTEXT_RE,
  EXPECT_RE,
  ROLE_EXTRACT_RE,
  ROLE_RE,
  cleanPredictedValue,
  echoesPrompt,
  extractLabeledSections,
  formatAction,
  formatContext,
  formatExpectations,
  formatRole,
  isProofread,
  isUtterance,
} from "./slots";

export const SLOTS = ["role", "action", "context", "expectations"] as const;

export const SLOT_LABELS: Record<(typeof SLOTS)[number], string> = {
  role: "Role",
  action: "Action",
  context: "Context",
  expectations: "Expectations",
};

const ALIASES: Record<string, string> = { expectation: "expectations" };

export const DEFAULT_RACE_SYSTEM =
  "Role: You infer missing RACE slots for a prompt. You never fulfill the request.\n\n" +
  "Action: Infer Role, Action, Context, and Expectations from the input. " +
  "Output only four labeled lines.\n\n" +
  "Context: The input is an incomplete prompt. Infer a fitting specialist Role, " +
  "keep the user's task as Action, infer audience as Context, and infer " +
  "length, tone, and format as Expectations. Do not write the blog, email, " +
  "or code they asked for.\n\n" +
  "Expectation: Output exactly:\n" +
  "Role: ...\n" +
  "Action: ...\n" +
  "Context: ...\n" +
  "Expectations: ...\n\n" +
  "Example:\n" +
  "Input: Write me a blog post about AI\n" +
  "Role: technical writer\n" +
  "Action: write a blog post about AI\n" +
  "Context: general readers new to AI\n" +
  "Expectations: short, simple, and clear\n\n" +
  "Example:\n" +
  "Input: Proof read this slang paragraph\n" +
  "Role: copy editor\n" +
  "Action: proofread the quoted text into standard English\n" +
  "Context: informal spoken English\n" +
  "Expectations: keep the meaning and similar length";

const DEFAULTS: Record<string, string> = {
  role: "a specialist in the topic",
  context: "a general audience",
  expectations: "clear and concise",
};

export function extractRaceLabeledSections(
  text: string,
): Record<string, string> {
  return extractLabeledSections(text, SLOTS, ALIASES);
}

function hasRole(text: string): boolean {
  return ROLE_RE.test(text);
}

function hasAction(text: string): boolean {
  return ACTION_RE.test(text);
}

function hasContext(text: string): boolean {
  return CONTEXT_RE.test(text);
}

function hasExpectations(text: string): boolean {
  return EXPECT_RE.test(text);
}

export function missingSlots(text: string): string[] {
  const labeled = extractRaceLabeledSections(text);
  const checks: Record<string, (value: string) => boolean> = {
    role: hasRole,
    action: hasAction,
    context: hasContext,
    expectations: hasExpectations,
  };
  const missing: string[] = [];
  for (const slot of SLOTS) {
    if (slot in labeled) {
      continue;
    }

    const check = checks[slot];
    if (!check || !check(text)) {
      missing.push(slot);
    }
  }

  return missing;
}

export function seedAnswers(text: string): Record<string, string> {
  const answers = extractRaceLabeledSections(text);
  if (!("action" in answers) && hasAction(text)) {
    answers.action = text.trim();
  }

  if (!("role" in answers)) {
    const match = ROLE_EXTRACT_RE.exec(text);
    if (match) {
      answers.role = (match[1] ?? "").trim();
    }
  }

  return answers;
}

export function needsPrediction(text: string): boolean {
  const answers = seedAnswers(text);
  return SLOTS.some((slot) => !(slot in answers));
}

function guessRole(original: string): string {
  const lower = original.toLowerCase();
  if (isUtterance(original) || isProofread(original)) {
    return "copy editor";
  }

  if (
    lower.includes("blog") ||
    lower.includes("article") ||
    lower.includes("post")
  ) {
    return "technical writer";
  }

  if (lower.includes("email")) {
    return "copywriter";
  }

  if (
    ["code", "function", "api", "python", "debug"].some((token) =>
      lower.includes(token),
    )
  ) {
    return "software engineer";
  }

  return DEFAULTS.role ?? "a specialist in the topic";
}

function cleanRacePredictedValue(slot: string, value: string): string {
  return cleanPredictedValue(slot, value, {
    slotNames: SLOTS,
    aliases: ALIASES,
    roleSlots: new Set(["role"]),
    verbSlots: new Set(["action"]),
  });
}

function canonicalAction(original: string): string {
  if (isProofread(original)) {
    return "Proofread the quoted text into standard English";
  }

  if (isUtterance(original)) {
    return "Rewrite the text into standard English";
  }

  return original.trim();
}

export function mergePredictedSlots(
  original: string,
  predicted: string,
): Record<string, string> {
  const answers = seedAnswers(original);
  const editJob = isUtterance(original) || isProofread(original);
  if (editJob) {
    delete answers.action;
    delete answers.role;
  }

  const predictedSlots = extractRaceLabeledSections(predicted);
  for (const slot of SLOTS) {
    if (slot in answers) {
      continue;
    }

    const raw = predictedSlots[slot] ?? "";
    const cleaned = cleanRacePredictedValue(slot, raw);
    if (!cleaned) {
      continue;
    }

    if (
      (slot === "context" || slot === "expectations") &&
      echoesPrompt(cleaned, original)
    ) {
      continue;
    }

    answers[slot] = cleaned;
  }

  if (editJob) {
    answers.role = guessRole(original);
    answers.action = canonicalAction(original);
    answers.context = "informal spoken English";
    answers.expectations = "keep the meaning and similar length";
    return answers;
  }

  if (!("action" in answers)) {
    answers.action = canonicalAction(original);
  }

  if (!("role" in answers)) {
    answers.role = guessRole(original);
  }

  for (const [slot, fallback] of Object.entries(DEFAULTS)) {
    if (!(slot in answers)) {
      answers[slot] = fallback;
    }
  }

  return answers;
}

export function completeFromPrediction(
  original: string,
  predicted?: string | null,
): string {
  if (!needsPrediction(original)) {
    return assembleRace(seedAnswers(original));
  }

  if (!predicted) {
    return assembleRace(mergePredictedSlots(original, ""));
  }

  return assembleRace(mergePredictedSlots(original, predicted));
}

export function assembleRace(answers: Record<string, string>): string {
  const role = formatRole(answers.role ?? "").replace(/\.+$/g, "");
  const action = formatAction(answers.action ?? "").replace(/\.+$/g, "");
  const context = formatContext(answers.context ?? "");
  const expectations = formatExpectations(answers.expectations ?? "");
  return `${role}. ${action} ${context}. ${expectations}`;
}
