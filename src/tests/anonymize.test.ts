import { describe, expect, it } from "vitest";

import { anonymize } from "../lib/anonymize";

describe("anonymize", () => {
  it("redacts email, aws key, and password", () => {
    const text =
      "Ping Alice at asmith@initech.corp. Her AWS access key is " +
      "AKIAIOSFODNN7EXAMPLE and root pass is Summer2024!";
    const out = anonymize(text);
    expect(out).not.toContain("asmith@initech.corp");
    expect(out).toContain("[EMAIL]");
    expect(out).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(out).toContain("[API_KEY]");
    expect(out).not.toContain("Summer2024!");
    expect(out).toContain("[PASSWORD]");
  });

  it("redacts phone and address", () => {
    const text = "Call me at 555-0107 or stop by 123 Example Lane.";
    const out = anonymize(text);
    expect(out).not.toContain("555-0107");
    expect(out).toContain("[PHONE]");
    expect(out).not.toContain("123 Example Lane");
    expect(out).toContain("[ADDRESS]");
  });

  it("redacts iban and routing", () => {
    const text =
      "Refund to IBAN GB29XAPI40151598765432 or routing number 021000021.";
    const out = anonymize(text);
    expect(out).not.toContain("GB29XAPI40151598765432");
    expect(out).not.toContain("021000021");
    expect(out).toContain("[BANKING_DATA]");
  });

  it("redacts ssn and ipv4", () => {
    const text = "SSN 123-45-6789 on host 10.0.0.8.";
    const out = anonymize(text);
    expect(out).not.toContain("123-45-6789");
    expect(out).toContain("[GOV_ID]");
    expect(out).not.toContain("10.0.0.8");
    expect(out).toContain("[CONFIDENTIAL]");
  });

  it("leaves plain text", () => {
    expect(anonymize("I will leave later.")).toBe("I will leave later.");
  });
});
