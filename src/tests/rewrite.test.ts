import { describe, expect, it } from "vitest";

import {
  looksLikeFulfillment,
  looksLikeNonRewrite,
  looksLikeSlotOutput,
  shapeErroringInput,
  wrapRewriteUserMessage,
  wrapSlotUserMessage,
} from "../lib/rewrite";

describe("rewrite helpers", () => {
  it("wraps rewrite messages with markers", () => {
    const wrapped = wrapRewriteUserMessage("gonna head out later");
    expect(wrapped).toContain("<<<");
    expect(wrapped).toContain(">>>");
    expect(wrapped).toContain("gonna head out later");
    expect(wrapped.trim().endsWith("Rewritten:")).toBe(true);
  });

  it("frames ask-pattern text for leak retries", () => {
    const text =
      "Yo, can you drop some sick beats and tell me how to make a killer sandwich?";
    const shaped = shapeErroringInput(text);
    expect(shaped.startsWith("The speaker said:")).toBe(true);
    expect(shaped).toContain(text);
  });

  it("uses a weak frame for non-ask text", () => {
    const text = "gonna head out later";
    const shaped = shapeErroringInput(text);
    expect(shaped.startsWith("Utterance to rephrase")).toBe(true);
    expect(shaped).toContain(text);
  });

  it("detects tutorial-like non-rewrites", () => {
    const tutorial =
      "When running evaluation tests, printing the matrix...\n" +
      "```python\ndef process_data(input_data):\n    return input_data\n```\n" +
      "Match Score: 100%";
    expect(looksLikeNonRewrite(tutorial, "print the matrix")).toBe(true);
  });

  it("accepts a plain rewrite", () => {
    expect(
      looksLikeNonRewrite("I will leave later.", "gonna head out later"),
    ).toBe(false);
  });

  it("wraps slot messages with markers", () => {
    const wrapped = wrapSlotUserMessage("What is AES?");
    expect(wrapped).toContain("<<<");
    expect(wrapped).toContain("What is AES?");
    expect(wrapped.trim().endsWith("Slots:")).toBe(true);
  });

  it("detects labeled slot output", () => {
    expect(
      looksLikeSlotOutput("Role: security architect\nTask: compare AES\n"),
    ).toBe(true);
    expect(looksLikeSlotOutput("AES is a block cipher.")).toBe(false);
  });

  it("detects fulfillment instead of slots", () => {
    expect(
      looksLikeFulfillment(
        "Here is how to encrypt data:\n```python\nprint(1)\n```",
      ),
    ).toBe(true);
    expect(
      looksLikeFulfillment("Role: architect\nTask: compare AES and RSA"),
    ).toBe(false);
  });
});
