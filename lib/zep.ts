import { ZepClient } from "@getzep/zep-cloud";
import type { Topic, ZepResource } from "./types";

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY || "" });
const SESSION_ID = process.env.ZEP_SESSION_ID || "";

// Search the knowledge graph for topic-relevant content
export async function searchTopicResources(topic: Topic): Promise<ZepResource[]> {
  if (!process.env.ZEP_API_KEY) return [];

  try {
    const results = await Promise.all(
      topic.zep_search_terms.map((term) =>
        zep.graph
          .search({ query: term, limit: 3 })
          .catch(() => null)
      )
    );

    const seen = new Set<string>();
    const resources: ZepResource[] = [];

    for (const batch of results) {
      if (!batch?.edges) continue;
      for (const edge of batch.edges) {
        const fact = edge.fact || "";
        if (!seen.has(fact) && fact) {
          seen.add(fact);
          resources.push({
            content: fact,
            relevance: edge.score ?? edge.relevance ?? 0,
          });
        }
      }
    }

    return resources.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
  } catch (err) {
    console.error("Zep search error:", err);
    return [];
  }
}

// Search by raw query string
export async function searchKnowledge(query: string, limit = 5): Promise<ZepResource[]> {
  if (!process.env.ZEP_API_KEY) return [];

  try {
    const data = await zep.graph.search({ query, limit });

    if (!data?.edges) return [];

    return data.edges
      .filter((e) => e.fact)
      .map((e) => ({
        content: e.fact!,
        relevance: e.score ?? e.relevance ?? 0,
      }));
  } catch (err) {
    console.error("Zep search error:", err);
    return [];
  }
}

// Store a learning milestone by adding to a thread
export async function storeLearningMilestone(
  userId: string,
  topicId: string,
  outcome: string
): Promise<void> {
  if (!SESSION_ID || !process.env.ZEP_API_KEY) return;

  try {
    await zep.thread.addMessages(SESSION_ID, {
      messages: [
        {
          role: "system",
          content: `Learning milestone - User ${userId} completed topic "${topicId}": ${outcome}`,
        },
      ],
    });
  } catch (err) {
    console.error("Zep store error:", err);
  }
}
