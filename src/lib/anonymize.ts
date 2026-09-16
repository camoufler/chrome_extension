const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bAKIA[0-9A-Z]{16}\b/g, "[API_KEY]"],
  [
    /\b(?:api[_-]?key|secret[_-]?key|access[_-]?key|bearer)\s*[:=]\s*\S+/gi,
    "[API_KEY]",
  ],
  [/\b(?:root\s+)?pass(?:word|wd)?(?:\s+is|\s*[:=])\s*\S+/gi, "[PASSWORD]"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]"],
  [/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, "[BANKING_DATA]"],
  [
    /\b(?:routing(?:\s+number)?|iban|card(?:\s+ending\s+in)?|cvv|account(?:\s+number)?)\s+[*\dA-Z-]{4,}\b/gi,
    "[BANKING_DATA]",
  ],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[BANKING_DATA]"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[GOV_ID]"],
  [
    /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]?\d{4}\b/g,
    "[PHONE]",
  ],
  [/(?<!\d)\d{3}[\s.-]\d{4}\b/g, "[PHONE]"],
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[CONFIDENTIAL]"],
  [
    /\b\d{1,5}\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+(?:Street|St\.?|Lane|Ln\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?)\b/g,
    "[ADDRESS]",
  ],
];

export function anonymize(text: string): string {
  let redacted = text;
  for (const [pattern, placeholder] of RULES) {
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, placeholder);
  }

  return redacted;
}
