import { describe, it, expect } from "vitest";
import { TOPIC_POOL } from "@/lib/topic-pool";

describe("TOPIC_POOL", () => {
  it("contains exactly 22 topics", () => {
    expect(TOPIC_POOL).toHaveLength(22);
  });

  it("has no duplicate topic IDs", () => {
    const ids = TOPIC_POOL.map((t) => t.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe("each topic has required fields", () => {
    for (const topic of TOPIC_POOL) {
      describe(`topic "${topic.id}"`, () => {
        it("has a non-empty id", () => {
          expect(topic.id).toBeTruthy();
          expect(typeof topic.id).toBe("string");
        });

        it("has a non-empty title", () => {
          expect(topic.title).toBeTruthy();
          expect(typeof topic.title).toBe("string");
        });

        it("has a non-empty description", () => {
          expect(topic.description).toBeTruthy();
          expect(typeof topic.description).toBe("string");
        });

        it("has a valid category", () => {
          const validCategories = [
            "syntax",
            "data_structures",
            "functions",
            "oop",
            "type_system",
            "error_handling",
            "async",
            "testing",
            "stdlib",
            "ecosystem",
            "patterns",
            "ai_ml",
          ];
          expect(validCategories).toContain(topic.category);
        });

        it("has difficulty between 1 and 5", () => {
          expect(topic.difficulty).toBeGreaterThanOrEqual(1);
          expect(topic.difficulty).toBeLessThanOrEqual(5);
        });

        it("has prerequisites as an array", () => {
          expect(Array.isArray(topic.prerequisites)).toBe(true);
        });

        it("has a positive time_estimate_minutes", () => {
          expect(topic.time_estimate_minutes).toBeGreaterThan(0);
        });

        it("has translation_languages as an array", () => {
          expect(Array.isArray(topic.translation_languages)).toBe(true);
        });

        it("has relevant_goals as a non-empty array", () => {
          expect(topic.relevant_goals.length).toBeGreaterThan(0);
        });

        it("has concepts as a non-empty array", () => {
          expect(topic.concepts.length).toBeGreaterThan(0);
        });

        it("has gotchas as a non-empty array", () => {
          expect(topic.gotchas.length).toBeGreaterThan(0);
        });

        it("has at least one challenge ref", () => {
          expect(topic.challenges.length).toBeGreaterThanOrEqual(1);
        });

        it("has non-empty zep_search_terms", () => {
          expect(topic.zep_search_terms.length).toBeGreaterThan(0);
        });
      });
    }
  });

  describe("prerequisites reference valid topic IDs", () => {
    const validIds = new Set(TOPIC_POOL.map((t) => t.id));

    for (const topic of TOPIC_POOL) {
      if (topic.prerequisites.length > 0) {
        it(`"${topic.id}" prerequisites are all valid topic IDs`, () => {
          for (const prereq of topic.prerequisites) {
            expect(validIds.has(prereq)).toBe(true);
          }
        });
      }
    }
  });
});
