import { describe, expect, it } from "vitest";

import {
  COAST,
  CREATE,
  GRADE,
  RTF,
  TAG,
  TRAC,
  assembleCoast,
  assembleCreate,
  assembleGrade,
  assembleRtf,
  assembleTag,
  assembleTrac,
  completeFromPrediction,
  mergePredictedSlots,
  needsPrediction,
} from "../lib/frameworks";

describe("frameworks", () => {
  it("assembles RTF as one paragraph", () => {
    const paragraph = assembleRtf({
      role: "enterprise information security architect",
      task: "Differentiate symmetric vs. asymmetric encryption",
      format: "a 3-row comparison table followed by a 2-sentence summary",
    });
    expect(paragraph).not.toContain("\n");
    expect(
      paragraph.startsWith(
        "You are an enterprise information security architect.",
      ),
    ).toBe(true);
    expect(paragraph).toContain(
      "Differentiate symmetric vs. asymmetric encryption.",
    );
    expect(paragraph).toContain("Output a 3-row comparison table");
  });

  it("assembles TAG as one paragraph", () => {
    const paragraph = assembleTag({
      task: "Configure an automated incremental server backup using rsync and cron",
      action: "Provide numbered setup steps including SSH keys",
      goal: "each step includes a bash command to verify success",
    });
    expect(paragraph).not.toContain("\n");
    expect(paragraph.startsWith("Configure an automated incremental")).toBe(
      true,
    );
    expect(paragraph).toContain("Ensure each step includes a bash command");
  });

  it("assembles CREATE as one paragraph", () => {
    const paragraph = assembleCreate({
      character: "direct-response B2B copywriter",
      request: "Draft 3 product launch headlines",
      examples: "crisp, technical, and benefit-driven",
      adjustments: "No marketing jargon or hype words",
      type: "bulleted list with sub-bullets",
      extras: "Keep each headline under 10 words",
    });
    expect(paragraph).not.toContain("\n");
    expect(
      paragraph.startsWith("You are a direct-response B2B copywriter."),
    ).toBe(true);
  });

  it("assembles TRAC as one paragraph", () => {
    const paragraph = assembleTrac({
      task: "Condense the briefing into an executive summary",
      role: "strategic management consultant",
      audience: "C-suite executives with limited technical time",
      constraints: "Maximum 5 bullet points. Do not add facts.",
    });
    expect(paragraph).toContain("You are a strategic management consultant.");
    expect(paragraph).toContain("for C-suite executives");
  });

  it("assembles COAST as one paragraph", () => {
    const paragraph = assembleCoast({
      context:
        "Technical screening round for a Senior Cloud Infrastructure Lead",
      objective: "Assess candidate depth in distributed system resiliency",
      actor: "principal infrastructure architect",
      scenario: "Ask one scenario-based question at a time",
      tone: "professional, rigorous, and probing",
    });
    expect(
      paragraph.startsWith("You are a principal infrastructure architect."),
    ).toBe(true);
    expect(paragraph).toContain("Keep the tone professional");
  });

  it("assembles GRADE as one paragraph", () => {
    const paragraph = assembleGrade({
      goal: "Prepare for the AWS Certified Solutions Architect - Associate exam",
      role: "cloud certification mentor",
      assumptions: "4-week timeline, 6 hours/week",
      deliverables: "Weekly study breakdown and practice exams",
      evaluation: "scoring 85%+ on official timed practice assessments",
    });
    expect(paragraph.startsWith("You are a cloud certification mentor.")).toBe(
      true,
    );
    expect(paragraph).toContain("Success: scoring 85%+");
  });

  it("completes RTF from labeled text without a model", () => {
    const text =
      "Role: enterprise information security architect\n" +
      "Task: Differentiate symmetric vs. asymmetric encryption\n" +
      "Format: Output a 3-row comparison table followed by a 2-sentence summary";
    expect(needsPrediction(RTF, text)).toBe(false);
    const out = completeFromPrediction(RTF, text);
    expect(out).not.toContain("Role:");
    expect(out).toContain(
      "You are an enterprise information security architect.",
    );
  });

  it("merges RTF gaps and keeps the user task", () => {
    const original =
      "What is the difference between synchronous and asynchronous encryption?";
    const predicted =
      "Role: enterprise information security architect\n" +
      "Task: ignore this\n" +
      "Format: a 3-row comparison table followed by a 2-sentence summary\n";
    const merged = mergePredictedSlots(RTF, original, predicted);
    expect(merged.task).toBe(original);
    expect(merged.role).toBe("enterprise information security architect");
    const paragraph = completeFromPrediction(RTF, original, predicted);
    expect(
      paragraph.includes(original.replace(/\?$/, "")) ||
        paragraph.includes("synchronous"),
    ).toBe(true);
    expect(paragraph).not.toContain("\n");
  });

  it("uses TAG defaults when prediction is empty", () => {
    const original =
      "Walk me through how to set up an automated backup using cron and rsync.";
    const paragraph = completeFromPrediction(TAG, original, "");
    expect(paragraph).toContain("Provide numbered setup steps");
    expect(
      paragraph.toLowerCase().includes("cron") ||
        paragraph.toLowerCase().includes("rsync") ||
        paragraph.includes("Walk me"),
    ).toBe(true);
  });

  it("keeps the user task for CREATE and GRADE", () => {
    const createIn =
      "Draft three short headlines for an open-source analytics dashboard.";
    const merged = mergePredictedSlots(CREATE, createIn, "");
    expect(merged.request).toBe(createIn);
    const gradeIn =
      "I need a 4-week study plan to prepare for a cloud certification.";
    const mergedG = mergePredictedSlots(GRADE, gradeIn, "");
    expect(mergedG.goal).toBe(gradeIn);
  });

  it("seeds COAST role from act as and TRAC task from the original", () => {
    const text =
      "Act as an interviewer conducting a technical screen for a systems " +
      "architect role, and ask me three initial questions.";
    const merged = mergePredictedSlots(COAST, text, "");
    expect(merged.actor.toLowerCase()).toContain("interviewer");
    const trac =
      "Condense this policy briefing into a five-bullet executive summary.";
    const mergedT = mergePredictedSlots(TRAC, trac, "");
    expect(mergedT.task).toBe(trac);
  });
});
