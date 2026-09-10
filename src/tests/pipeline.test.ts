import { describe, expect, it, vi } from "vitest";

import { runStandardize } from "../lib/pipeline";

describe("pipeline", () => {
  it("rewrites then anonymizes utterances", async () => {
    const standardize = vi.fn(async () => "I will leave later.");
    const predictSlots = vi.fn(async () => "");
    const out = await runStandardize("gonna head out later", "Rewrite only.", {
      standardize,
      predictSlots,
    });
    expect(out).toBe("I will leave later.");
    expect(standardize).toHaveBeenCalledOnce();
    expect(predictSlots).not.toHaveBeenCalled();
  });

  it("anonymizes rewritten utterances", async () => {
    const standardize = vi.fn(async () => "Call me at 555-0107 tomorrow.");
    const out = await runStandardize(
      "hit me up at 555-0107 tmrw",
      "Rewrite only.",
      {
        standardize,
        predictSlots: async () => "",
      },
    );
    expect(out).not.toContain("555-0107");
    expect(out).toContain("[PHONE]");
    expect(standardize).toHaveBeenCalledOnce();
  });

  it("expands factual prompts to a paragraph", async () => {
    const standardize = vi.fn(async (_prompt: string, text: string) => text);
    const predictSlots = vi.fn(
      async () =>
        "Role: enterprise information security architect\n" +
        "Task: differentiate symmetric vs. asymmetric encryption\n" +
        "Format: a 3-row comparison table followed by a 2-sentence summary\n",
    );
    const ask =
      "What is the difference between synchronous and asynchronous encryption?";
    const out = await runStandardize(ask, "Rewrite only.", {
      standardize,
      predictSlots,
    });
    expect(out).not.toContain("\n");
    expect(out).toContain(
      "You are an enterprise information security architect.",
    );
    expect(out).not.toContain("```");
    expect(standardize).toHaveBeenCalledOnce();
    expect(predictSlots).toHaveBeenCalledOnce();
    expect(predictSlots.mock.calls[0][1]).toBe(ask);
  });

  it("uses defaults when slot prediction is empty", async () => {
    const standardize = vi.fn(async (_prompt: string, text: string) => text);
    const predictSlots = vi.fn(async () => "");
    const ask =
      "Walk me through how to set up an automated backup using cron and rsync.";
    const out = await runStandardize(ask, "Rewrite only.", {
      standardize,
      predictSlots,
    });
    expect(out).toContain("Provide numbered setup steps");
    expect(predictSlots).toHaveBeenCalledOnce();
  });

  it("anonymizes expanded paragraphs", async () => {
    const standardize = vi.fn(async (_prompt: string, text: string) => text);
    const predictSlots = vi.fn(
      async () =>
        "Role: security architect\n" +
        "Task: compare encryption for asmith@initech.corp\n" +
        "Format: a short table\n",
    );
    const ask =
      "What is the difference between AES and RSA for asmith@initech.corp?";
    const out = await runStandardize(ask, "Rewrite only.", {
      standardize,
      predictSlots,
    });
    expect(out).not.toContain("asmith@initech.corp");
    expect(out).toContain("[EMAIL]");
  });

  it("rewrites prompt wording before expansion", async () => {
    const standardize = vi.fn(
      async () =>
        "Debug the Python function that raises an error and show the corrected code.",
    );
    const predictSlots = vi.fn(
      async () =>
        "Role: software engineer\n" +
        "Action: debug the Python function\n" +
        "Context: a general audience\n" +
        "Expectations: clear and concise\n",
    );
    const ask =
      "This is python function throwing error, can you debug what went wrong " +
      "and show the right code";
    const out = await runStandardize(ask, "Rewrite only.", {
      standardize,
      predictSlots,
    });
    expect(out).not.toContain("This is python function throwing error");
    expect(out).toContain("Debug the Python function that raises an error");
    expect(out).toContain("You are a software engineer.");
    expect(standardize).toHaveBeenCalledOnce();
    expect(
      predictSlots.mock.calls[0][1].startsWith("Debug the Python function"),
    ).toBe(true);
  });
});
