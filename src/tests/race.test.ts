import { describe, expect, it } from "vitest";

import {
  assembleRace,
  completeFromPrediction,
  mergePredictedSlots,
  missingSlots,
  needsPrediction,
  seedAnswers,
} from "./race";

const BLOG = "Write me a blog post about AI";

const PROOFREAD =
  'Proof read this text "Yo, yesterday was lowkey wild. My main guy pulled up ' +
  "with some snacks that were totally bussin'.\"";

const SLANG =
  "Yo, yesterday was lowkey wild. My main guy pulled up with some snacks " +
  "that were totally bussin', and we just sat on the couch to veg out.";

describe("race", () => {
  it("finds missing role, context, and expectations on a blog prompt", () => {
    expect(missingSlots(BLOG)).toEqual(["role", "context", "expectations"]);
    expect(needsPrediction(BLOG)).toBe(true);
  });

  it("treats a labeled RACE prompt as complete", () => {
    const text =
      "Role: You are a technical content writer for developers new to ML.\n" +
      "Action: Create an outline for a blog post explaining gradient descent.\n" +
      "Context: Audience is mid-level web developers without much calculus.\n" +
      "Expectations: Structured outline, conversational but accurate.";
    expect(missingSlots(text)).toEqual([]);
    expect(needsPrediction(text)).toBe(false);
  });

  it("detects a heuristic-complete prompt that still needs prediction", () => {
    const text =
      "You are a copywriter specializing in SaaS landing pages. " +
      "Draft a follow-up email that politely requests a status update. " +
      "I'm building a React app for a fintech startup. " +
      "Keep it under 150 words.";
    expect(missingSlots(text)).toEqual([]);
    expect(needsPrediction(text)).toBe(true);
  });

  it("rejects a glued Action as Role", () => {
    const original = "write a blog post about AI application";
    const predicted =
      "Role: Action: Write\n" +
      "Action: Write\n" +
      "Context: a blog post about AI application\n" +
      "Expectations: a detailed and informative blog post about the application of AI";
    const merged = mergePredictedSlots(original, predicted);
    expect(merged.role.toLowerCase()).not.toContain("action");
    expect(merged.role).toBe("technical writer");
    expect(merged.action).toBe(original);
    expect(merged.context).toBe("a general audience");
    const paragraph = completeFromPrediction(original, predicted);
    expect(paragraph).not.toContain("You are an Action");
    expect(paragraph).not.toContain("for a blog post about AI application");
    expect(paragraph.startsWith("You are a technical writer.")).toBe(true);
    expect(paragraph).toContain(
      "Write a blog post about AI application for a general audience.",
    );
  });

  it("keeps the user action and fills gaps", () => {
    const predicted =
      "Role: technical writer\n" +
      "Action: ignore this\n" +
      "Context: general readers who are novice in AI\n" +
      "Expectations: under 40 words, simple, genius";
    const merged = mergePredictedSlots(BLOG, predicted);
    expect(merged.action).toBe(BLOG);
    expect(merged.role).toBe("technical writer");
    expect(merged.context).toBe("general readers who are novice in AI");
    expect(merged.expectations).toBe("under 40 words, simple, genius");
  });

  it("completes from prediction as one paragraph", () => {
    const predicted =
      "Role: technical writer\n" +
      "Action: write a blog about AI\n" +
      "Context: general readers who are novice in AI\n" +
      "Expectations: under 40 words, simple, genius";
    const paragraph = completeFromPrediction(BLOG, predicted);
    expect(paragraph).not.toContain("\n");
    expect(paragraph).toBe(
      "You are a technical writer. Write a blog post about AI " +
        "for general readers who are novice in AI. " +
        "Keep it under 40 words, simple, genius.",
    );
  });

  it("assembles RACE as one paragraph", () => {
    const paragraph = assembleRace({
      role: "technical writer",
      action: "write me a blog about AI",
      context: "general readers who are novice in AI",
      expectations: "under 40 words , simple , genius",
    });
    expect(paragraph).not.toContain("\n");
    expect(paragraph).toBe(
      "You are a technical writer. Write a blog about AI " +
        "for general readers who are novice in AI. " +
        "Keep it under 40 words, simple, genius.",
    );
  });

  it("completes from labeled text without a model", () => {
    const text =
      "Role: You are a copywriter.\n" +
      "Action: Draft a follow-up email.\n" +
      "Context: Existing customer, 3-year relationship.\n" +
      "Expectations: Under 150 words, no guilt.";
    const out = completeFromPrediction(text);
    expect(out).not.toContain("Role:");
    expect(out).toBe(
      "You are a copywriter. Draft a follow-up email " +
        "for existing customer, 3-year relationship. " +
        "Keep it under 150 words, no guilt.",
    );
  });

  it("seeds action from the original prompt", () => {
    const answers = seedAnswers(BLOG);
    expect(answers.action).toBe(BLOG);
    expect(answers).not.toHaveProperty("role");
  });

  it("rejects None and narrator for proofread", () => {
    const predicted =
      "Role: None\n" +
      "Action: None\n" +
      "Context: a text describing a social interaction\n" +
      "Expectations: the text is to be corrected for spelling, grammar, and style";
    const paragraph = completeFromPrediction(PROOFREAD, predicted);
    expect(paragraph).not.toContain("You are a None");
    expect(paragraph).toContain("You are a copy editor.");
    expect(paragraph).toContain(
      "Proofread the quoted text into standard English",
    );
    expect(paragraph).toContain("informal spoken English");
    expect(paragraph).toContain("Keep the meaning and similar length.");
  });

  it("rejects narrator summaries for slang utterances", () => {
    const predicted =
      "Role: Narrator\n" +
      "Action: None\n" +
      "Context: a conversation about a past event\n" +
      "Expectations: provide a summary of the conversation";
    const paragraph = completeFromPrediction(SLANG, predicted);
    expect(paragraph).not.toContain("You are a Narrator");
    expect(paragraph).not.toContain("None for");
    expect(paragraph.startsWith("You are a copy editor.")).toBe(true);
    expect(paragraph).toContain("Rewrite the text into standard English");
    expect(paragraph).toContain("informal spoken English");
  });
});
