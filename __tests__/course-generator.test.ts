import { describe, it, expect } from "vitest";
import { shouldReviseCourse, generateCoursePlan } from "@/lib/course-generator";

describe("shouldReviseCourse", () => {
  it("returns revise=true when struggles exist (failed_attempts >= 2)", async () => {
    const progress = [
      { topic_id: "variables_types", score: 60, failed_attempts: 3, status: "completed" },
      { topic_id: "strings_fstrings", score: 80, failed_attempts: 0, status: "completed" },
    ];
    const result = await shouldReviseCourse(progress);
    expect(result.revise).toBe(true);
    expect(result.reason).toContain("variables_types");
  });

  it("returns revise=true when avg score > 90 with >= 3 completed", async () => {
    const progress = [
      { topic_id: "variables_types", score: 95, failed_attempts: 0, status: "completed" },
      { topic_id: "strings_fstrings", score: 92, failed_attempts: 0, status: "completed" },
      { topic_id: "comprehensions", score: 98, failed_attempts: 0, status: "completed" },
    ];
    const result = await shouldReviseCourse(progress);
    expect(result.revise).toBe(true);
    expect(result.reason).toContain("skipping");
  });

  it("returns revise=false for normal progress", async () => {
    const progress = [
      { topic_id: "variables_types", score: 75, failed_attempts: 0, status: "completed" },
      { topic_id: "strings_fstrings", score: 80, failed_attempts: 1, status: "completed" },
    ];
    const result = await shouldReviseCourse(progress);
    expect(result.revise).toBe(false);
    expect(result.reason).toBe("");
  });

  it("returns revise=false when no progress entries", async () => {
    const result = await shouldReviseCourse([]);
    expect(result.revise).toBe(false);
  });
});

describe("generateCoursePlan", () => {
  it("is exported as a function", () => {
    expect(typeof generateCoursePlan).toBe("function");
  });
});
