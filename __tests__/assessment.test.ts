import { describe, it, expect } from "vitest";
import {
  ASSESSMENT_FLOW,
  CODE_PROBES,
  buildAssessmentPrompt,
  buildCodeProbePrompt,
  buildProfileGenerationPrompt,
} from "@/lib/assessment";

describe("ASSESSMENT_FLOW", () => {
  it("has an opener string", () => {
    expect(typeof ASSESSMENT_FLOW.opener).toBe("string");
    expect(ASSESSMENT_FLOW.opener.length).toBeGreaterThan(0);
  });

  it("has followUps object with expected keys", () => {
    expect(ASSESSMENT_FLOW.followUps).toBeDefined();
    expect(typeof ASSESSMENT_FLOW.followUps.experience_depth).toBe("string");
    expect(typeof ASSESSMENT_FLOW.followUps.python_exposure).toBe("string");
    expect(typeof ASSESSMENT_FLOW.followUps.goals).toBe("string");
    expect(typeof ASSESSMENT_FLOW.followUps.timeline).toBe("string");
  });
});

describe("CODE_PROBES", () => {
  const expectedProbeIds = [
    "can_read_python",
    "understands_mutability",
    "closure_understanding",
    "async_mental_model",
    "dict_manipulation",
    "class_basics",
  ];

  it("has all 6 probes", () => {
    expect(Object.keys(CODE_PROBES)).toHaveLength(6);
  });

  for (const probeId of expectedProbeIds) {
    it(`has probe "${probeId}"`, () => {
      expect(CODE_PROBES[probeId]).toBeDefined();
      expect(CODE_PROBES[probeId].id).toBe(probeId);
    });

    it(`probe "${probeId}" has a question`, () => {
      expect(CODE_PROBES[probeId].question).toBeTruthy();
    });

    it(`probe "${probeId}" has reveals array`, () => {
      expect(CODE_PROBES[probeId].reveals.length).toBeGreaterThan(0);
    });
  }
});

describe("buildAssessmentPrompt", () => {
  it("returns a non-empty string", () => {
    const result = buildAssessmentPrompt([]);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the opener when history is empty", () => {
    const result = buildAssessmentPrompt([]);
    expect(result).toContain(ASSESSMENT_FLOW.opener);
  });

  it("includes follow-up questions when history has user messages", () => {
    const history = [
      { role: "assistant" as const, content: "What's your background?" },
      { role: "user" as const, content: "I know TypeScript well." },
    ];
    const result = buildAssessmentPrompt(history);
    expect(result).toContain("experience_depth");
  });
});

describe("buildCodeProbePrompt", () => {
  it("returns a string containing the probe code", () => {
    const probe = CODE_PROBES.can_read_python;
    const result = buildCodeProbePrompt(probe, "I think it prints [0, 4, 16, 36, 64]");
    expect(typeof result).toBe("string");
    expect(result).toContain(probe.code!);
  });

  it("includes the probe question", () => {
    const probe = CODE_PROBES.understands_mutability;
    const result = buildCodeProbePrompt(probe, "test response");
    expect(result).toContain(probe.question);
  });

  it("includes the user response", () => {
    const probe = CODE_PROBES.can_read_python;
    const userResponse = "It prints the squares of even numbers";
    const result = buildCodeProbePrompt(probe, userResponse);
    expect(result).toContain(userResponse);
  });
});

describe("buildProfileGenerationPrompt", () => {
  it("returns a string that mentions confirmed_skills and identified_gaps", () => {
    const conversation = [
      { role: "user" as const, content: "I know TypeScript" },
      { role: "assistant" as const, content: "Great, what are your goals?" },
    ];
    const probeResults = {
      can_read_python: { passed: true, response: "It prints [0, 4, 16, 36, 64]" },
      understands_mutability: { passed: false, response: "Not sure" },
    };
    const result = buildProfileGenerationPrompt(conversation, probeResults);
    expect(result).toContain("confirmed_skills");
    expect(result).toContain("identified_gaps");
  });

  it("includes probe pass/fail results", () => {
    const result = buildProfileGenerationPrompt(
      [{ role: "user" as const, content: "Hi" }],
      { can_read_python: { passed: true, response: "answer" } }
    );
    expect(result).toContain("Passed: true");
  });
});
