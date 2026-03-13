import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getCoursePlan, getTopicProgress, upsertTopicProgress, ensureTables } from "@/lib/db";
import { storeLearningMilestone } from "@/lib/zep";
import { shouldReviseCourse } from "@/lib/course-generator";
import { TOPIC_POOL } from "@/lib/topic-pool";

// GET — fetch progress for current course
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTables();
  const plan = await getCoursePlan(userId);
  if (!plan) return NextResponse.json({ progress: [] });

  const progress = await getTopicProgress(userId, plan.id);
  return NextResponse.json({ progress });
}

// POST — update topic progress
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTables();
  const body = await req.json();
  const { topicId, status, score, assessment, struggles } = body;

  const plan = await getCoursePlan(userId);
  if (!plan) return NextResponse.json({ error: "No course plan" }, { status: 400 });

  // Update topic progress
  await upsertTopicProgress({
    user_id: userId,
    course_id: plan.id,
    topic_id: topicId,
    status,
    score,
    ai_assessment: assessment,
    struggles: struggles || [],
    started_at: status === "in_progress" ? new Date().toISOString() : undefined,
    completed_at: status === "completed" ? new Date().toISOString() : undefined,
    challenge_attempts: 0,
    failed_attempts: 0,
  });

  // If completed, unlock next topics and store milestone in Zep
  if (status === "completed") {
    // Store in Zep
    storeLearningMilestone(userId, topicId, `Score: ${score}. ${assessment || ""}`).catch(() => {});

    // Unlock topics whose prerequisites are now met
    const allProgress = await getTopicProgress(userId, plan.id);
    const completedIds = allProgress
      .filter((p) => p.status === "completed")
      .map((p) => p.topic_id);

    for (const planTopic of plan.topics) {
      if (planTopic.status === "skipped") continue;

      const prog = allProgress.find((p) => p.topic_id === planTopic.topic_id);
      if (prog && prog.status !== "locked") continue;

      // Check if all prerequisites are completed
      const poolTopic = TOPIC_POOL.find((t) => t.id === planTopic.topic_id);
      if (!poolTopic) continue;

      const prereqsMet = poolTopic.prerequisites.every(
        (prereq) =>
          completedIds.includes(prereq) ||
          plan.topics.find((t) => t.topic_id === prereq)?.status === "skipped"
      );

      if (prereqsMet) {
        await upsertTopicProgress({
          user_id: userId,
          course_id: plan.id,
          topic_id: planTopic.topic_id,
          status: "available",
          struggles: [],
          challenge_attempts: 0,
          failed_attempts: 0,
        });
      }
    }

    // Check if course should be revised
    const updatedProgress = await getTopicProgress(userId, plan.id);
    const revisionCheck = await shouldReviseCourse(
      updatedProgress.map((p) => ({
        topic_id: p.topic_id,
        score: p.score || 0,
        failed_attempts: p.failed_attempts,
        status: p.status,
      }))
    );

    if (revisionCheck.revise) {
      console.log(`Course revision suggested for user ${userId}: ${revisionCheck.reason}`);
      // Could auto-revise or flag for user
    }

    return NextResponse.json({ progress: updatedProgress });
  }

  const progress = await getTopicProgress(userId, plan.id);
  return NextResponse.json({ progress });
}
