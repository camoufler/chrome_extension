import { describe, expect, it } from "vitest";

import {
  PromptType,
  classify,
  classifyHeuristic,
  parseLabel,
} from "../lib/prompt-types";

describe("prompt-types", () => {
  it("treats slang as an utterance", () => {
    const text =
      "Yo, yesterday was lowkey wild. My main guy pulled up with some snacks " +
      "that were totally bussin', and we just sat on the couch to veg out.";
    const [winner, , tied] = classifyHeuristic(text);
    expect(winner).toBe(PromptType.UTTERANCE);
    expect(tied).toBe(false);
  });

  it("treats gonna as an utterance", () => {
    const [winner] = classifyHeuristic("gonna head out later");
    expect(winner).toBe(PromptType.UTTERANCE);
  });

  it("detects factual difference questions", () => {
    const [winner] = classifyHeuristic(
      "What is the difference between synchronous and asynchronous encryption?",
    );
    expect(winner).toBe(PromptType.FACTUAL);
  });

  it("detects instructional how-to prompts", () => {
    const [winner] = classifyHeuristic(
      "Walk me through how to set up an automated backup pipeline using a cron job and rsync.",
    );
    expect(winner).toBe(PromptType.INSTRUCTIONAL);
  });

  it("detects creative headlines", () => {
    const [winner] = classifyHeuristic(
      "Draft three short, compelling headlines for a product launch announcing " +
        "an open-source analytics dashboard.",
    );
    expect(winner).toBe(PromptType.CREATIVE);
  });

  it("detects analytical debug prompts", () => {
    const [winner] = classifyHeuristic(
      "Here is a Python function throwing a KeyError; debug what went wrong " +
        "and show the corrected code.",
    );
    expect(winner).toBe(PromptType.ANALYTICAL);
  });

  it("detects transformation condense prompts", () => {
    const [winner] = classifyHeuristic(
      "Condense this 4-page policy briefing into a five-bullet executive summary " +
        "focusing on compliance risks.",
    );
    expect(winner).toBe(PromptType.TRANSFORMATION);
  });

  it("detects roleplay interviewer prompts", () => {
    const [winner] = classifyHeuristic(
      "Act as an interviewer conducting a technical screen for a systems " +
        "architect role, and ask me three initial questions.",
    );
    expect(winner).toBe(PromptType.ROLEPLAY);
  });

  it("detects strategic study plans", () => {
    const [winner] = classifyHeuristic(
      "I need a 4-week study plan to prepare for a cloud certification, " +
        "studying roughly 6 hours per week.",
    );
    expect(winner).toBe(PromptType.STRATEGIC);
  });

  it("parses classification labels", () => {
    expect(parseLabel("factual")).toBe(PromptType.FACTUAL);
    expect(parseLabel("Roleplay\n")).toBe(PromptType.ROLEPLAY);
    expect(parseLabel("not-a-type")).toBeNull();
  });

  it("uses the heuristic without a chat callback", async () => {
    await expect(classify("gonna head out later")).resolves.toBe(
      PromptType.UTTERANCE,
    );
  });

  it("uses chat on a close tie", async () => {
    const text = "Bro how to fix my python ModuleNotFoundError for sacrebleu?";
    const [, , tied] = classifyHeuristic(text);
    expect(tied).toBe(true);
    await expect(classify(text, async () => "analytical")).resolves.toBe(
      PromptType.ANALYTICAL,
    );
  });

  it("falls back when classify chat returns an invalid label", async () => {
    const text = "Bro how to fix my python ModuleNotFoundError for sacrebleu?";
    const [heuristic, , tied] = classifyHeuristic(text);
    expect(tied).toBe(true);
    await expect(classify(text, async () => "nope")).resolves.toBe(heuristic);
  });
});
