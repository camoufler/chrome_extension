import { debug } from "./debug";
import { ACTION_RE, isUtterance } from "./slots";

export const TIE_DELTA = 1;

const ASK_RE =
  /\b(?:how do i|how to|how can i|what is|what's|what are|please |can you|could you|act as|walk me through|tell me)\b/i;

export const PromptType = {
  FACTUAL: "factual",
  INSTRUCTIONAL: "instructional",
  CREATIVE: "creative",
  ANALYTICAL: "analytical",
  TRANSFORMATION: "transformation",
  ROLEPLAY: "roleplay",
  STRATEGIC: "strategic",
  UTTERANCE: "utterance",
} as const;

export type PromptType = (typeof PromptType)[keyof typeof PromptType];

export const VALID_LABELS = new Set<string>(Object.values(PromptType));

const SCORED_TYPES: PromptType[] = [
  PromptType.FACTUAL,
  PromptType.INSTRUCTIONAL,
  PromptType.CREATIVE,
  PromptType.ANALYTICAL,
  PromptType.TRANSFORMATION,
  PromptType.ROLEPLAY,
  PromptType.STRATEGIC,
];

const PATTERNS: ReadonlyArray<readonly [PromptType, RegExp, number]> = [
  [
    PromptType.FACTUAL,
    /\b(?:what is|what's the|what are|difference between|define|who is|when was|how many|how much|versus|\bvs\.?\b)\b/i,
    3,
  ],
  [PromptType.FACTUAL, /\bexplain (?!how\b)/i, 2],
  [
    PromptType.INSTRUCTIONAL,
    /\b(?:how do i|how to|how can i|walk me through|step by step|steps to|tutorial|set\s*up|configure|install|unit test)\b/i,
    3,
  ],
  [
    PromptType.CREATIVE,
    /\b(?:draft|brainstorm|headlines?|tagline|slogan|compelling|write (?:a |me )?(?:poem|story|headline|copy|email|resume|blog)|marketing copy|generate .{0,20}copy)\b/i,
    3,
  ],
  [
    PromptType.ANALYTICAL,
    /\b(?:debug|traceback|keyerror|exception|root.?cause|what went wrong|fix this (?:code|function|bug)|modulenotfounderror|corrected code)\b/i,
    3,
  ],
  [
    PromptType.TRANSFORMATION,
    /\b(?:summarize|condense|paraphrase|extract|executive summary|translate|rewrite this|format this)\b/i,
    3,
  ],
  [
    PromptType.ROLEPLAY,
    /\b(?:act as|role-?play|interview me|conducting a|you are an interviewer|ask me three)\b/i,
    3,
  ],
  [
    PromptType.STRATEGIC,
    /\b(?:study plan|roadmap|\d+-week|prepare for|certification|hours per week|trade-?offs?|schedule)\b/i,
    3,
  ],
];

export type ClassifyChat = (text: string) => Promise<string> | string;

export type PromptScores = Record<PromptType, number>;

function emptyScores(): PromptScores {
  const scores = { [PromptType.UTTERANCE]: 0 } as PromptScores;
  for (const type of SCORED_TYPES) {
    scores[type] = 0;
  }

  return scores;
}

export function looksLikePrompt(text: string): boolean {
  const stripped = text.trim();
  if (stripped.endsWith("?")) {
    return true;
  }

  if (ASK_RE.test(stripped)) {
    return true;
  }

  return ACTION_RE.test(stripped);
}

export function classifyHeuristic(
  text: string,
): [PromptType, PromptScores, boolean] {
  const scores = emptyScores();
  if (isUtterance(text) && !looksLikePrompt(text)) {
    return [PromptType.UTTERANCE, scores, false];
  }

  for (const [ptype, pattern, weight] of PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      scores[ptype] += weight;
    }
  }

  const scoredValues = SCORED_TYPES.map((type) => scores[type]);
  if (Math.max(...scoredValues) === 0) {
    if (looksLikePrompt(text)) {
      if (text.includes("?") || /\b(?:what|why|who|when|where)\b/i.test(text)) {
        scores[PromptType.FACTUAL] = 1;
      } else {
        scores[PromptType.CREATIVE] = 1;
      }
    } else {
      return [PromptType.UTTERANCE, scores, false];
    }
  }

  const ranked = [...SCORED_TYPES].sort(
    (left, right) => scores[right] - scores[left],
  );
  const top = ranked[0] ?? PromptType.FACTUAL;
  const second = ranked[1] ?? PromptType.INSTRUCTIONAL;
  const tied = scores[second] > 0 && scores[top] - scores[second] <= TIE_DELTA;
  return [top, scores, tied];
}

export function parseLabel(raw: string): PromptType | null {
  const trimmed = raw.trim();
  let token = trimmed
    ? (trimmed.split(/\s+/)[0] ?? "")
        .toLowerCase()
        .replace(/^[.,:;]+|[.,:;]+$/g, "")
    : "";
  token = token.replace(/-/g, "").replace(/_/g, "");
  const aliases: Record<string, PromptType> = {
    roleplaying: PromptType.ROLEPLAY,
    roleplay: PromptType.ROLEPLAY,
    howto: PromptType.INSTRUCTIONAL,
    "how-to": PromptType.INSTRUCTIONAL,
    info: PromptType.FACTUAL,
  };
  token = aliases[token] ?? token;
  if (VALID_LABELS.has(token)) {
    return token as PromptType;
  }

  return null;
}

export async function classify(
  text: string,
  classifyChat?: ClassifyChat,
): Promise<PromptType> {
  const [winner, scores, tied] = classifyHeuristic(text);
  if (!tied || !classifyChat) {
    debug("prompt-types: heuristic", { winner, tied, scores });
    return winner;
  }

  try {
    const label = await classifyChat(text);
    const parsed = parseLabel(label);
    if (parsed === null) {
      debug("prompt-types: invalid classify label, using heuristic", {
        label,
        winner,
      });
      return winner;
    }

    debug("prompt-types: model tie-break", { parsed, heuristic: winner });
    return parsed;
  } catch (cause) {
    debug("prompt-types: classify chat failed, using heuristic", cause);
    return winner;
  }
}
