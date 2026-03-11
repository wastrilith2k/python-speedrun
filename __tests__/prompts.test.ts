import { describe, it, expect } from "vitest";
import { buildTeachingPrompt, buildTopicIntroMessage } from "@/lib/prompts";
import type { Topic, CourseTopic, UserProfile } from "@/lib/types";

const mockTopic: Topic = {
  id: "variables_types",
  title: "Variables & Dynamic Typing",
  description: "How Python's type system works",
  category: "syntax",
  difficulty: 1,
  prerequisites: [],
  time_estimate_minutes: 15,
  translation_languages: ["typescript", "java"],
  relevant_goals: ["any"],
  concepts: ["dynamic typing", "duck typing"],
  gotchas: ["No undefined - only None"],
  challenges: [{ id: "types_01", type: "predict" }],
  zep_search_terms: ["python type system"],
};

const mockProfile: UserProfile = {
  id: "user-1",
  known_languages: ["typescript", "javascript"],
  primary_language: "typescript",
  years_experience: 5,
  python_level: "scripting",
  confirmed_skills: ["basic_syntax"],
  identified_gaps: ["closures"],
  goals: ["ai_ml"],
  pace_preference: "fast",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockCourseTopic: CourseTopic = {
  topic_id: "variables_types",
  order: 1,
  status: "available",
  reason_included: "Foundation topic",
  estimated_minutes: 15,
  depth: "standard",
  custom_focus: "Focus on differences from TS",
};

const mockZepContext = { articles: "", graphFacts: "" };

describe("buildTeachingPrompt", () => {
  it("includes the topic title", () => {
    const result = buildTeachingPrompt(mockTopic, mockProfile, mockCourseTopic, mockZepContext);
    expect(result).toContain(mockTopic.title);
  });

  it("includes the profile primary language", () => {
    const result = buildTeachingPrompt(mockTopic, mockProfile, mockCourseTopic, mockZepContext);
    expect(result).toContain(mockProfile.primary_language);
  });

  it("includes the depth", () => {
    const result = buildTeachingPrompt(mockTopic, mockProfile, mockCourseTopic, mockZepContext);
    expect(result).toContain(mockCourseTopic.depth);
  });

  it("includes translation mode when primary_language is in translation_languages", () => {
    const result = buildTeachingPrompt(mockTopic, mockProfile, mockCourseTopic, mockZepContext);
    expect(result).toContain("Translation Mode");
    expect(result).toContain("typescript");
  });

  it("omits translation mode when primary_language is not in translation_languages", () => {
    const profileWithRust = { ...mockProfile, primary_language: "rust" };
    const result = buildTeachingPrompt(mockTopic, profileWithRust, mockCourseTopic, mockZepContext);
    expect(result).not.toContain("Translation Mode");
  });

  it("includes custom_focus when present", () => {
    const result = buildTeachingPrompt(mockTopic, mockProfile, mockCourseTopic, mockZepContext);
    expect(result).toContain("Focus on differences from TS");
  });
});

describe("buildTopicIntroMessage", () => {
  it("includes the topic title", () => {
    const result = buildTopicIntroMessage(mockTopic, mockCourseTopic);
    expect(result).toContain(mockTopic.title);
  });

  it("includes topic description", () => {
    const result = buildTopicIntroMessage(mockTopic, mockCourseTopic);
    expect(result).toContain(mockTopic.description);
  });

  it("includes the number of concepts", () => {
    const result = buildTopicIntroMessage(mockTopic, mockCourseTopic);
    expect(result).toContain(`${mockTopic.concepts.length} concepts`);
  });

  it("mentions high level for overview depth", () => {
    const overviewCourseTopic = { ...mockCourseTopic, depth: "overview" as const };
    const result = buildTopicIntroMessage(mockTopic, overviewCourseTopic);
    expect(result).toContain("at a high level");
  });
});
