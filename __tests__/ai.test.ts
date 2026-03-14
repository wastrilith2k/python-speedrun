import { describe, it, expect } from "vitest";
import { AI_TOOLS, prepareHistory } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";

describe("AI_TOOLS", () => {
  it("has exactly 3 tool declarations", () => {
    expect(AI_TOOLS).toHaveLength(3);
  });

  it("includes complete_topic", () => {
    const tool = AI_TOOLS.find((t) => "function" in t && t.function.name === "complete_topic");
    expect(tool).toBeDefined();
    const fn = (tool as { type: "function"; function: { parameters?: { properties?: Record<string, unknown> } } }).function;
    expect(fn.parameters?.properties).toHaveProperty("score");
    expect(fn.parameters?.properties).toHaveProperty("assessment");
  });

  it("includes present_challenge", () => {
    const tool = AI_TOOLS.find((t) => "function" in t && t.function.name === "present_challenge");
    expect(tool).toBeDefined();
    const fn = (tool as { type: "function"; function: { parameters?: { properties?: Record<string, unknown> } } }).function;
    expect(fn.parameters?.properties).toHaveProperty("challenge_id");
    expect(fn.parameters?.properties).toHaveProperty("type");
  });

  it("includes evaluate_code", () => {
    const tool = AI_TOOLS.find((t) => "function" in t && t.function.name === "evaluate_code");
    expect(tool).toBeDefined();
    const fn = (tool as { type: "function"; function: { parameters?: { properties?: Record<string, unknown> } } }).function;
    expect(fn.parameters?.properties).toHaveProperty("passed");
    expect(fn.parameters?.properties).toHaveProperty("feedback");
  });
});

describe("prepareHistory", () => {
  function makeMessages(count: number): ChatMessage[] {
    return Array.from({ length: count }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as ChatMessage["role"],
      content: `Message ${i + 1}`,
    }));
  }

  it("returns messages unchanged when <= 10", () => {
    const messages = makeMessages(10);
    const result = prepareHistory(messages);
    expect(result).toEqual(messages);
    expect(result).toHaveLength(10);
  });

  it("returns messages unchanged when less than 10", () => {
    const messages = makeMessages(5);
    const result = prepareHistory(messages);
    expect(result).toEqual(messages);
    expect(result).toHaveLength(5);
  });

  it("trims and adds summary when > 10 messages", () => {
    const messages = makeMessages(20);
    const result = prepareHistory(messages);

    expect(result).toHaveLength(11);
    expect(result[0]).toEqual(messages[0]);
    expect(result[1]).toEqual(messages[1]);
    expect(result[2].role).toBe("system");
    expect(result[2].content).toContain("Earlier:");
    expect(result[2].content).toContain("10 messages");
    expect(result[3]).toEqual(messages[12]);
    expect(result[10]).toEqual(messages[19]);
  });

  it("returns empty array for empty input", () => {
    const result = prepareHistory([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
