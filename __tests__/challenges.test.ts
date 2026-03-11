import { describe, it, expect } from "vitest";
import { CHALLENGES } from "@/lib/challenges";
import { TOPIC_POOL } from "@/lib/topic-pool";

const VALID_TYPES = ["predict", "write", "translate", "refactor", "explain"] as const;

describe("CHALLENGES", () => {
  it("has at least 25 challenges", () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(25);
  });

  it("has no duplicate challenge IDs", () => {
    const ids = CHALLENGES.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  describe("each challenge has required fields", () => {
    for (const challenge of CHALLENGES) {
      describe(`challenge "${challenge.id}"`, () => {
        it("has a non-empty id", () => {
          expect(challenge.id).toBeTruthy();
          expect(typeof challenge.id).toBe("string");
        });

        it("has a non-empty topic_id", () => {
          expect(challenge.topic_id).toBeTruthy();
          expect(typeof challenge.topic_id).toBe("string");
        });

        it("has a valid type", () => {
          expect(VALID_TYPES).toContain(challenge.type);
        });

        it("has a non-empty title", () => {
          expect(challenge.title).toBeTruthy();
        });

        it("has a non-empty prompt", () => {
          expect(challenge.prompt).toBeTruthy();
        });

        it("has non-empty expected_concepts", () => {
          expect(challenge.expected_concepts.length).toBeGreaterThan(0);
        });

        it("has non-empty evaluation_criteria", () => {
          expect(challenge.evaluation_criteria).toBeTruthy();
          expect(challenge.evaluation_criteria.length).toBeGreaterThan(0);
        });

        it("has at least 1 hint", () => {
          expect(challenge.hints.length).toBeGreaterThanOrEqual(1);
        });
      });
    }
  });

  describe("topic_id references", () => {
    const validTopicIds = new Set(TOPIC_POOL.map((t) => t.id));

    for (const challenge of CHALLENGES) {
      it(`challenge "${challenge.id}" references a valid topic "${challenge.topic_id}"`, () => {
        expect(validTopicIds.has(challenge.topic_id)).toBe(true);
      });
    }
  });
});
