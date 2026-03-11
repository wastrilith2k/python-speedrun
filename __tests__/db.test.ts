import { describe, it, expect } from "vitest";
import * as dbModule from "@/lib/db";

describe("DB module exports", () => {
  it("exports getUser as a function", () => {
    expect(typeof dbModule.getUser).toBe("function");
  });

  it("exports upsertUser as a function", () => {
    expect(typeof dbModule.upsertUser).toBe("function");
  });

  it("exports getCoursePlan as a function", () => {
    expect(typeof dbModule.getCoursePlan).toBe("function");
  });

  it("exports saveCoursePlan as a function", () => {
    expect(typeof dbModule.saveCoursePlan).toBe("function");
  });

  it("exports getTopicProgress as a function", () => {
    expect(typeof dbModule.getTopicProgress).toBe("function");
  });

  it("exports upsertTopicProgress as a function", () => {
    expect(typeof dbModule.upsertTopicProgress).toBe("function");
  });

  it("exports getChatMessages as a function", () => {
    expect(typeof dbModule.getChatMessages).toBe("function");
  });

  it("exports saveChatMessage as a function", () => {
    expect(typeof dbModule.saveChatMessage).toBe("function");
  });

  it("exports saveCodeSubmission as a function", () => {
    expect(typeof dbModule.saveCodeSubmission).toBe("function");
  });

  it("exports saveAssessmentData as a function", () => {
    expect(typeof dbModule.saveAssessmentData).toBe("function");
  });

  it("exports a default db client", () => {
    expect(dbModule.default).toBeDefined();
  });
});
