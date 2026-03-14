import { chat } from "./ai";
import { TOPIC_POOL } from "./topic-pool";
import { searchKnowledge } from "./zep";
import type { UserProfile, CoursePlan, CourseTopic } from "./types";

export async function generateCoursePlan(profile: UserProfile): Promise<CoursePlan> {
  // Get relevant Zep context for course planning
  const zepResults = await searchKnowledge(
    `Python learning ${profile.goals.join(" ")} ${profile.python_level}`,
    5
  );
  const zepContext = zepResults.map((r) => r.content).join("\n---\n");

  const prompt = buildCourseGenerationPrompt(profile, zepContext);

  const result = await chat(prompt, [], "Generate the course plan now.");
  const text = result.choices[0]?.message?.content || "";

  // Extract JSON from response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to generate course plan — no JSON in response");
  }

  const topics: CourseTopic[] = JSON.parse(jsonMatch[0]);

  // Calculate total time
  const totalMinutes = topics.reduce((sum, t) => {
    const poolTopic = TOPIC_POOL.find((p) => p.id === t.topic_id);
    return sum + (poolTopic?.time_estimate_minutes ?? t.estimated_minutes);
  }, 0);

  // Set first non-skipped topic to available
  const firstAvailable = topics.find((t) => t.status !== "skipped");
  if (firstAvailable) firstAvailable.status = "available";

  const plan: CoursePlan = {
    id: crypto.randomUUID(),
    user_id: profile.id,
    title: generateCourseTitle(profile),
    description: generateCourseDescription(profile, topics),
    topics,
    estimated_total_minutes: totalMinutes,
    generated_at: new Date().toISOString(),
    revised_at: null,
  };

  return plan;
}

function generateCourseTitle(profile: UserProfile): string {
  const goalMap: Record<string, string> = {
    ai_ml: "Python for AI/ML",
    job_requirement: "Python for Work",
    automation: "Python for Automation",
    web_dev: "Python for Web Dev",
    data_science: "Python for Data",
    side_project: "Python for Your Project",
  };
  const primary = profile.goals[0];
  return goalMap[primary] || "Python Speedrun";
}

function generateCourseDescription(profile: UserProfile, topics: CourseTopic[]): string {
  const included = topics.filter((t) => t.status !== "skipped").length;
  const skipped = topics.filter((t) => t.status === "skipped").length;
  return `Custom ${included}-topic course for a ${profile.primary_language} developer. ${skipped > 0 ? `${skipped} topics skipped based on your experience.` : ""} Estimated time: ${topics.reduce((s, t) => s + t.estimated_minutes, 0)} minutes.`;
}

function buildCourseGenerationPrompt(profile: UserProfile, zepContext: string): string {
  const topicSummary = TOPIC_POOL.map((t) => ({
    id: t.id,
    title: t.title,
    difficulty: t.difficulty,
    prerequisites: t.prerequisites,
    category: t.category,
    relevant_goals: t.relevant_goals,
    time: t.time_estimate_minutes,
    concepts_count: t.concepts.length,
  }));

  return `You are building a personalized Python course for this developer.

## Student Profile
- Languages: ${profile.known_languages.join(", ")} (primary: ${profile.primary_language})
- Experience: ${profile.years_experience} years professional
- Python level: ${profile.python_level}
- Confirmed skills: ${profile.confirmed_skills.join(", ") || "none assessed"}
- Identified gaps: ${profile.identified_gaps.join(", ") || "none identified"}
- Goals: ${profile.goals.join(", ")}
- Pace: ${profile.pace_preference}

## Available Topics
${JSON.stringify(topicSummary, null, 2)}

${zepContext ? `## Relevant Resources\n${zepContext}` : ""}

## Instructions
Return a JSON array of CourseTopic objects. For each topic decide:
1. INCLUDE or SKIP — skip if the student clearly already knows it based on confirmed_skills
2. ORDER — respect prerequisites, prioritize their goals
3. DEPTH — "overview" (they mostly know this), "standard" (full coverage), or "deep_dive" (they need extra practice)
4. CUSTOM_FOCUS — a sentence about what to emphasize for their background

Each object must have:
- topic_id: string (must match an id from Available Topics)
- order: number (1-based sequence)
- status: "skipped" or "locked" (first non-skipped will be set to "available" automatically)
- reason_included: string (why this topic is in their course)
- reason_skipped: string (only if skipped)
- estimated_minutes: number
- depth: "overview" | "standard" | "deep_dive"
- custom_focus: string

Rules:
- Include 8-16 topics. Not everything needs to be included.
- Respect prerequisites (don't include a topic if its prerequisite is skipped)
- Put goal-relevant topics earlier (after prereqs)
- pace=fast → more overviews, fewer topics (8-10)
- pace=thorough → more deep_dives, more topics (12-16)
- Always include at least one challenging topic
- For ${profile.primary_language} developers, prioritize topics with translations

Return ONLY the JSON array, no other text.`;
}

// Check if course plan should be revised based on performance
export async function shouldReviseCourse(
  recentProgress: { topic_id: string; score: number; failed_attempts: number; status: string }[]
): Promise<{ revise: boolean; reason: string }> {
  const completed = recentProgress.filter((p) => p.status === "completed");
  const struggles = recentProgress.filter((p) => p.failed_attempts >= 2);

  if (struggles.length > 0) {
    return {
      revise: true,
      reason: `Student struggled with: ${struggles.map((s) => s.topic_id).join(", ")}. May need prerequisite topics or increased depth.`,
    };
  }

  if (completed.length >= 3) {
    const avg = completed.reduce((s, p) => s + p.score, 0) / completed.length;
    if (avg > 90) {
      return { revise: true, reason: `Averaging ${avg.toFixed(0)} — consider skipping easier upcoming topics.` };
    }
  }

  return { revise: false, reason: "" };
}
