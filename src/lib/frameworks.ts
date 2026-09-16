import * as race from "./race";
import {
  ACTION_RE,
  EXPECT_RE,
  ROLE_EXTRACT_RE,
  ROLE_RE,
  asSentence,
  cleanPredictedValue,
  echoesPrompt,
  extractLabeledSections,
  formatRole,
  uncap,
} from "./slots";

type HasCheck = (text: string) => boolean;

export interface Framework {
  key: string;
  acronym: string;
  promptType: string;
  slots: readonly string[];
  labels: Record<string, string>;
  defaults: Record<string, string>;
  systemPrompt: string;
  taskSlot: string;
  assemble: (answers: Record<string, string>) => string;
  aliases: Record<string, string>;
  echoSlots: ReadonlySet<string>;
  roleSlot: string | null;
  roleSlots: ReadonlySet<string>;
  verbSlots: ReadonlySet<string>;
  hasChecks: Record<string, HasCheck>;
  raceBackend: boolean;
}

function hasRole(text: string): boolean {
  return ROLE_RE.test(text);
}

function hasAction(text: string): boolean {
  return ACTION_RE.test(text);
}

function hasFormat(text: string): boolean {
  return (
    EXPECT_RE.test(text) ||
    /\b(?:table|list|bullets?|json|markdown|summary)\b/i.test(text)
  );
}

function hasQuestionTask(text: string): boolean {
  return (
    hasAction(text) ||
    /\b(?:what is|what's|what are|difference between|define|how many|how much|who is|when was|versus|\bvs\.?\b)\b/i.test(
      text,
    ) ||
    text.trim().endsWith("?")
  );
}

function hasHowTo(text: string): boolean {
  return (
    /\b(?:how do i|how to|how can i|walk me through|step by step|set\s*up|configure|install|tutorial)\b/i.test(
      text,
    ) || hasAction(text)
  );
}

function hasSteps(text: string): boolean {
  return /\b(?:numbered|steps?|including|prerequisites|runbook)\b/i.test(text);
}

function hasGoal(text: string): boolean {
  return /\b(?:ensure|verify|so that|confirm|success)\b/i.test(text);
}

function hasTone(text: string): boolean {
  return /\b(?:tone|like|e\.g\.|crisp|professional)\b/i.test(text);
}

function hasGuardrail(text: string): boolean {
  return /\b(?:avoid|don't|do not|no |without|guardrail|clich)\b/i.test(text);
}

function hasOutputType(text: string): boolean {
  return /\b(?:list|bullets?|headline|paragraph|table)\b/i.test(text);
}

function hasLength(text: string): boolean {
  return /\b(?:under \d+|words?|each |characters?)\b/i.test(text);
}

function hasAudience(text: string): boolean {
  return /\b(?:audience|reader|exec|c-suite|stakeholder|for (?:c-suite|execs))\b/i.test(
    text,
  );
}

function hasConstraints(text: string): boolean {
  return /\b(?:maximum|don't|do not|zero|strict|bullet|no passive)\b/i.test(
    text,
  );
}

function hasSetting(text: string): boolean {
  return /\b(?:screening|interview|round|setting|simulation)\b/i.test(text);
}

function hasObjective(text: string): boolean {
  return (
    /\b(?:assess|evaluate|objective|depth|resiliency)\b/i.test(text) ||
    hasAction(text)
  );
}

function hasPacing(text: string): boolean {
  return /\b(?:one question|wait|turn-by-turn|ask me|next question)\b/i.test(
    text,
  );
}

function hasToneWord(text: string): boolean {
  return /\b(?:professional|rigorous|probing|tone)\b/i.test(text);
}

function hasGoalPlan(text: string): boolean {
  return (
    /\b(?:prepare|exam|cert|study plan|roadmap|goal)\b/i.test(text) ||
    hasAction(text)
  );
}

function hasAssumptions(text: string): boolean {
  return /\b(?:week|hours?|budget|timeline|intermediate)\b/i.test(text);
}

function hasDeliverables(text: string): boolean {
  return /\b(?:weekly|breakdown|labs?|plan|schedule)\b/i.test(text);
}

function hasEval(text: string): boolean {
  return /\b(?:score|kpi|percent|%|benchmark|practice exam)\b/i.test(text);
}

function emptyFramework(
  partial: Omit<
    Framework,
    | "aliases"
    | "echoSlots"
    | "roleSlot"
    | "roleSlots"
    | "verbSlots"
    | "hasChecks"
    | "raceBackend"
  > &
    Partial<Framework>,
): Framework {
  return {
    aliases: {},
    echoSlots: new Set(),
    roleSlot: null,
    roleSlots: new Set(),
    verbSlots: new Set(),
    hasChecks: {},
    raceBackend: false,
    ...partial,
  };
}

export function seedAnswers(
  fw: Framework,
  text: string,
): Record<string, string> {
  if (fw.raceBackend) {
    return race.seedAnswers(text);
  }

  const answers = extractLabeledSections(text, fw.slots, fw.aliases);
  if (!(fw.taskSlot in answers)) {
    const check = fw.hasChecks[fw.taskSlot] ?? hasAction;
    if (check(text)) {
      answers[fw.taskSlot] = text.trim();
    }
  }

  if (fw.roleSlot && !(fw.roleSlot in answers)) {
    const match = ROLE_EXTRACT_RE.exec(text);
    if (match) {
      answers[fw.roleSlot] = (match[1] ?? "").trim();
    }
  }

  return answers;
}

export function missingSlots(fw: Framework, text: string): string[] {
  if (fw.raceBackend) {
    return race.missingSlots(text);
  }

  const labeled = extractLabeledSections(text, fw.slots, fw.aliases);
  const missing: string[] = [];
  for (const slot of fw.slots) {
    if (slot in labeled) {
      continue;
    }

    const check = fw.hasChecks[slot];
    if (check !== undefined && check(text)) {
      continue;
    }

    missing.push(slot);
  }

  return missing;
}

export function needsPrediction(fw: Framework, text: string): boolean {
  if (fw.raceBackend) {
    return race.needsPrediction(text);
  }

  const answers = seedAnswers(fw, text);
  return fw.slots.some((slot) => !(slot in answers));
}

export function mergePredictedSlots(
  fw: Framework,
  original: string,
  predicted: string,
): Record<string, string> {
  if (fw.raceBackend) {
    return race.mergePredictedSlots(original, predicted);
  }

  const answers = seedAnswers(fw, original);
  const predictedSlots = extractLabeledSections(
    predicted,
    fw.slots,
    fw.aliases,
  );
  for (const slot of fw.slots) {
    if (slot in answers) {
      continue;
    }

    const raw = predictedSlots[slot] ?? "";
    const cleaned = cleanPredictedValue(slot, raw, {
      slotNames: fw.slots,
      aliases: fw.aliases,
      roleSlots: fw.roleSlots,
      verbSlots: fw.verbSlots,
    });
    if (!cleaned) {
      continue;
    }

    if (fw.echoSlots.has(slot) && echoesPrompt(cleaned, original)) {
      continue;
    }

    answers[slot] = cleaned;
  }

  if (!(fw.taskSlot in answers)) {
    answers[fw.taskSlot] = original.trim();
  }

  if (fw.roleSlot && !(fw.roleSlot in answers)) {
    answers[fw.roleSlot] =
      fw.defaults[fw.roleSlot] ?? "a specialist in the topic";
  }

  for (const [slot, fallback] of Object.entries(fw.defaults)) {
    if (!(slot in answers)) {
      answers[slot] = fallback;
    }
  }

  return answers;
}

export function completeFromPrediction(
  fw: Framework,
  original: string,
  predicted?: string | null,
): string {
  if (fw.raceBackend) {
    return race.completeFromPrediction(original, predicted);
  }

  if (!needsPrediction(fw, original)) {
    return fw.assemble(seedAnswers(fw, original));
  }

  return fw.assemble(mergePredictedSlots(fw, original, predicted ?? ""));
}

function ensureLead(
  value: string,
  prefixes: readonly string[],
  template: string,
): string {
  const cleaned = value.trim().replace(/\.+$/g, "");
  if (!cleaned) {
    return "";
  }

  const prefixRe = new RegExp(`^(?:${prefixes.join("|")})\\b`, "i");
  if (prefixRe.test(cleaned)) {
    return asSentence(cleaned);
  }

  return asSentence(template.replace("{}", uncap(cleaned)));
}

function punctuateJoin(...parts: string[]): string {
  const sentences: string[] = [];
  for (const part of parts) {
    let cleaned = part.trim();
    if (!cleaned) {
      continue;
    }

    if (!".!?".includes(cleaned.charAt(cleaned.length - 1))) {
      cleaned = `${cleaned}.`;
    }

    sentences.push(cleaned);
  }

  return sentences.join(" ");
}

export function assembleRtf(answers: Record<string, string>): string {
  return punctuateJoin(
    formatRole(answers.role ?? "", "subject-matter expert"),
    asSentence(answers.task ?? ""),
    ensureLead(
      answers.format ?? "",
      ["output", "provide", "use", "return", "give", "write", "format"],
      "Output {}",
    ),
  );
}

export function assembleTag(answers: Record<string, string>): string {
  return punctuateJoin(
    asSentence(answers.task ?? ""),
    asSentence(answers.action ?? ""),
    ensureLead(
      answers.goal ?? "",
      ["ensure", "include", "verify", "confirm", "so that"],
      "Ensure {}",
    ),
  );
}

export function assembleCreate(answers: Record<string, string>): string {
  return punctuateJoin(
    formatRole(answers.character ?? "", "specialist copywriter"),
    asSentence(answers.request ?? ""),
    ensureLead(
      answers.examples ?? "",
      ["tone", "use", "crisp", "professional"],
      "Use a {} tone",
    ),
    asSentence(answers.adjustments ?? ""),
    ensureLead(
      answers.type ?? "",
      ["output", "provide", "bulleted", "list"],
      "Output {}",
    ),
    asSentence(answers.extras ?? ""),
  );
}

export function assembleTrac(answers: Record<string, string>): string {
  const taskCore = (answers.task ?? "").trim().replace(/[ .!?]+$/g, "");
  let audience = (answers.audience ?? "").trim().replace(/\.+$/g, "");
  if (!/^(for|aimed at)\b/i.test(audience)) {
    audience = `for ${audience}`;
  }

  return punctuateJoin(
    formatRole(answers.role ?? "", "editor"),
    asSentence(`${taskCore} ${audience}`),
    asSentence(answers.constraints ?? ""),
  );
}

export function assembleCoast(answers: Record<string, string>): string {
  return punctuateJoin(
    formatRole(answers.actor ?? "", "specialist"),
    asSentence(answers.context ?? ""),
    asSentence(answers.objective ?? ""),
    asSentence(answers.scenario ?? ""),
    ensureLead(
      answers.tone ?? "",
      ["tone", "keep", "remain"],
      "Keep the tone {}",
    ),
  );
}

export function assembleGrade(answers: Record<string, string>): string {
  return punctuateJoin(
    formatRole(answers.role ?? "", "strategist"),
    asSentence(answers.goal ?? ""),
    ensureLead(
      answers.assumptions ?? "",
      ["assumptions", "given", "with"],
      "Assumptions: {}",
    ),
    asSentence(answers.deliverables ?? ""),
    ensureLead(
      answers.evaluation ?? "",
      ["benchmark", "success", "measure", "success:"],
      "Success: {}",
    ),
  );
}

export function assembleRace(answers: Record<string, string>): string {
  return race.assembleRace(answers);
}

export const RTF_SYSTEM =
  "You infer missing RTF slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Role, Task, and Format from the input. Output only three labeled lines.\n" +
  "Do not answer the question. Do not write the comparison, table, or definition.\n\n" +
  "Output exactly:\n" +
  "Role: ...\n" +
  "Task: ...\n" +
  "Format: ...\n\n" +
  "Example:\n" +
  "Input: What is the difference between synchronous and asynchronous encryption?\n" +
  "Role: enterprise information security architect\n" +
  "Task: differentiate symmetric vs. asymmetric encryption across key exchange, " +
  "computational overhead, and common protocols\n" +
  "Format: a direct 3-row comparison table followed by a 2-sentence summary";

export const TAG_SYSTEM =
  "You infer missing TAG slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Task, Action, and Goal. Output only three labeled lines.\n" +
  "Do not write the tutorial or run the commands.\n\n" +
  "Output exactly:\n" +
  "Task: ...\n" +
  "Action: ...\n" +
  "Goal: ...\n\n" +
  "Example:\n" +
  "Input: Walk me through how to set up an automated backup pipeline using cron and rsync.\n" +
  "Task: configure an automated incremental server backup using rsync and cron\n" +
  "Action: provide numbered setup steps including SSH key authentication, log rotation, and syntax\n" +
  "Goal: each step includes a bash command to verify successful execution";

export const CREATE_SYSTEM =
  "You infer missing CREATE slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Character, Request, Examples, Adjustments, Type, and Extras. " +
  "Output only six labeled lines. Do not write the headlines or copy.\n\n" +
  "Output exactly:\n" +
  "Character: ...\n" +
  "Request: ...\n" +
  "Examples: ...\n" +
  "Adjustments: ...\n" +
  "Type: ...\n" +
  "Extras: ...\n\n" +
  "Example:\n" +
  "Input: Draft three short headlines for an open-source analytics dashboard launch.\n" +
  "Character: direct-response B2B copywriter\n" +
  "Request: draft 3 product launch headlines for an internal observability dashboard\n" +
  "Examples: crisp, technical, and benefit-driven\n" +
  "Adjustments: no marketing jargon or hype words\n" +
  "Type: bulleted list with sub-bullets explaining value proposition\n" +
  "Extras: keep each headline under 10 words";

export const TRAC_SYSTEM =
  "You infer missing TRAC slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Task, Role, Audience, and Constraints. Output only four labeled lines.\n" +
  "Do not write the summary or rewrite the source beyond slot inference.\n\n" +
  "Output exactly:\n" +
  "Task: ...\n" +
  "Role: ...\n" +
  "Audience: ...\n" +
  "Constraints: ...\n\n" +
  "Example:\n" +
  "Input: Condense this policy briefing into a five-bullet executive summary on compliance risks.\n" +
  "Task: condense the attached briefing into an executive summary\n" +
  "Role: strategic management consultant\n" +
  "Audience: C-suite executives with limited technical time\n" +
  "Constraints: maximum 5 bullet points, focus on compliance risk, do not add facts";

export const COAST_SYSTEM =
  "You infer missing COAST slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Context, Objective, Actor, Scenario, and Tone. Output only five labeled lines.\n" +
  "Do not start the interview or ask the screening questions.\n\n" +
  "Output exactly:\n" +
  "Context: ...\n" +
  "Objective: ...\n" +
  "Actor: ...\n" +
  "Scenario: ...\n" +
  "Tone: ...\n\n" +
  "Example:\n" +
  "Input: Act as an interviewer conducting a technical screen for a systems architect role, " +
  "and ask me three initial questions.\n" +
  "Context: technical screening round for a Senior Cloud Infrastructure Lead\n" +
  "Objective: assess candidate depth in distributed system resiliency\n" +
  "Actor: principal infrastructure architect\n" +
  "Scenario: ask one scenario-based question at a time and wait for the candidate response\n" +
  "Tone: professional, rigorous, and probing";

export const GRADE_SYSTEM =
  "You infer missing GRADE slots for a prompt. You never fulfill the request.\n\n" +
  "Infer Goal, Role, Assumptions, Deliverables, and Evaluation. " +
  "Output only five labeled lines. Do not write the study plan.\n\n" +
  "Output exactly:\n" +
  "Goal: ...\n" +
  "Role: ...\n" +
  "Assumptions: ...\n" +
  "Deliverables: ...\n" +
  "Evaluation: ...\n\n" +
  "Example:\n" +
  "Input: I need a 4-week study plan to prepare for a cloud certification, studying roughly 6 hours per week.\n" +
  "Goal: prepare for the AWS Certified Solutions Architect - Associate exam\n" +
  "Role: cloud certification mentor\n" +
  "Assumptions: 4-week timeline, 6 hours/week study budget, intermediate networking foundation\n" +
  "Deliverables: weekly study breakdown, recommended hands-on labs, and practice exams\n" +
  "Evaluation: scoring 85%+ on official timed practice assessments";

export const RTF: Framework = emptyFramework({
  key: "rtf",
  acronym: "RTF",
  promptType: "factual",
  slots: ["role", "task", "format"],
  labels: { role: "Role", task: "Task", format: "Format" },
  defaults: {
    role: "subject-matter expert",
    format: "a concise comparison",
  },
  systemPrompt: RTF_SYSTEM,
  taskSlot: "task",
  assemble: assembleRtf,
  echoSlots: new Set(["format"]),
  roleSlot: "role",
  roleSlots: new Set(["role"]),
  verbSlots: new Set(["task"]),
  hasChecks: {
    role: hasRole,
    task: hasQuestionTask,
    format: hasFormat,
  },
});

export const TAG: Framework = emptyFramework({
  key: "tag",
  acronym: "TAG",
  promptType: "instructional",
  slots: ["task", "action", "goal"],
  labels: { task: "Task", action: "Action", goal: "Goal" },
  defaults: {
    action: "Provide numbered setup steps",
    goal: "each step includes a command to verify success",
  },
  systemPrompt: TAG_SYSTEM,
  taskSlot: "task",
  assemble: assembleTag,
  echoSlots: new Set(["action", "goal"]),
  verbSlots: new Set(["task", "action"]),
  hasChecks: {
    task: hasHowTo,
    action: hasSteps,
    goal: hasGoal,
  },
});

export const CREATE: Framework = emptyFramework({
  key: "create",
  acronym: "CREATE",
  promptType: "creative",
  slots: ["character", "request", "examples", "adjustments", "type", "extras"],
  labels: {
    character: "Character",
    request: "Request",
    examples: "Examples",
    adjustments: "Adjustments",
    type: "Type",
    extras: "Extras",
  },
  defaults: {
    character: "specialist copywriter",
    examples: "clear and professional",
    adjustments: "No hype or clichés",
    type: "a concise list",
    extras: "Keep it brief",
  },
  systemPrompt: CREATE_SYSTEM,
  taskSlot: "request",
  assemble: assembleCreate,
  echoSlots: new Set(["examples", "adjustments", "type", "extras"]),
  roleSlot: "character",
  roleSlots: new Set(["character"]),
  verbSlots: new Set(["request"]),
  hasChecks: {
    character: hasRole,
    request: hasAction,
    examples: hasTone,
    adjustments: hasGuardrail,
    type: hasOutputType,
    extras: hasLength,
  },
});

export const RACE: Framework = emptyFramework({
  key: "race",
  acronym: "RACE",
  promptType: "analytical",
  slots: race.SLOTS,
  labels: { ...race.SLOT_LABELS },
  defaults: {
    role: "a specialist in the topic",
    context: "a general audience",
    expectations: "clear and concise",
  },
  systemPrompt: race.DEFAULT_RACE_SYSTEM,
  taskSlot: "action",
  assemble: assembleRace,
  aliases: { expectation: "expectations" },
  echoSlots: new Set(["context", "expectations"]),
  roleSlot: "role",
  roleSlots: new Set(["role"]),
  verbSlots: new Set(["action"]),
  raceBackend: true,
});

export const TRAC: Framework = emptyFramework({
  key: "trac",
  acronym: "TRAC",
  promptType: "transformation",
  slots: ["task", "role", "audience", "constraints"],
  labels: {
    task: "Task",
    role: "Role",
    audience: "Audience",
    constraints: "Constraints",
  },
  defaults: {
    role: "editor",
    audience: "a general audience",
    constraints: "Keep fidelity to the source. Do not add facts.",
  },
  systemPrompt: TRAC_SYSTEM,
  taskSlot: "task",
  assemble: assembleTrac,
  echoSlots: new Set(["audience", "constraints"]),
  roleSlot: "role",
  roleSlots: new Set(["role"]),
  verbSlots: new Set(["task"]),
  hasChecks: {
    task: hasAction,
    role: hasRole,
    audience: hasAudience,
    constraints: hasConstraints,
  },
});

export const COAST: Framework = emptyFramework({
  key: "coast",
  acronym: "COAST",
  promptType: "roleplay",
  slots: ["context", "objective", "actor", "scenario", "tone"],
  labels: {
    context: "Context",
    objective: "Objective",
    actor: "Actor",
    scenario: "Scenario",
    tone: "Tone",
  },
  defaults: {
    context: "a professional simulation",
    actor: "specialist in the topic",
    scenario: "Ask one question at a time and wait for the response",
    tone: "professional and rigorous",
  },
  systemPrompt: COAST_SYSTEM,
  taskSlot: "objective",
  assemble: assembleCoast,
  echoSlots: new Set(["context", "scenario", "tone"]),
  roleSlot: "actor",
  roleSlots: new Set(["actor"]),
  verbSlots: new Set(["objective"]),
  hasChecks: {
    context: hasSetting,
    objective: hasObjective,
    actor: hasRole,
    scenario: hasPacing,
    tone: hasToneWord,
  },
});

export const GRADE: Framework = emptyFramework({
  key: "grade",
  acronym: "GRADE",
  promptType: "strategic",
  slots: ["goal", "role", "assumptions", "deliverables", "evaluation"],
  labels: {
    goal: "Goal",
    role: "Role",
    assumptions: "Assumptions",
    deliverables: "Deliverables",
    evaluation: "Evaluation",
  },
  defaults: {
    role: "strategist",
    assumptions: "a limited time budget",
    deliverables: "a weekly milestone plan",
    evaluation: "measurable checkpoints",
  },
  systemPrompt: GRADE_SYSTEM,
  taskSlot: "goal",
  assemble: assembleGrade,
  echoSlots: new Set(["assumptions", "deliverables", "evaluation"]),
  roleSlot: "role",
  roleSlots: new Set(["role"]),
  verbSlots: new Set(["goal"]),
  hasChecks: {
    goal: hasGoalPlan,
    role: hasRole,
    assumptions: hasAssumptions,
    deliverables: hasDeliverables,
    evaluation: hasEval,
  },
});

export const FRAMEWORKS: Record<string, Framework> = {
  rtf: RTF,
  tag: TAG,
  create: CREATE,
  race: RACE,
  trac: TRAC,
  coast: COAST,
  grade: GRADE,
};

export const TYPE_TO_FRAMEWORK: Record<string, Framework> = {
  factual: RTF,
  instructional: TAG,
  creative: CREATE,
  analytical: RACE,
  transformation: TRAC,
  roleplay: COAST,
  strategic: GRADE,
};
