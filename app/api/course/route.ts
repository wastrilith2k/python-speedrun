import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getUser, getCoursePlan, getTopicProgress, saveCoursePlan } from "@/lib/db";
import { generateCoursePlan } from "@/lib/course-generator";

// GET — fetch user's current course plan + progress
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, plan] = await Promise.all([
    getUser(userId),
    getCoursePlan(userId),
  ]);

  if (!plan) {
    return NextResponse.json({ plan: null, progress: [], profile: null });
  }

  const progress = await getTopicProgress(userId, plan.id);

  return NextResponse.json({ plan, progress, profile });
}

// PATCH — modify course plan (skip topic, regenerate, etc.)
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, topicId } = body;

  const profile = await getUser(userId);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  const currentPlan = await getCoursePlan(userId);

  if (action === "regenerate") {
    const newPlan = await generateCoursePlan(profile);
    await saveCoursePlan(newPlan);
    return NextResponse.json({ plan: newPlan });
  }

  if (action === "skip_topic" && currentPlan && topicId) {
    const updated = { ...currentPlan };
    updated.topics = updated.topics.map((t) =>
      t.topic_id === topicId
        ? { ...t, status: "skipped" as const, reason_skipped: "Skipped by user" }
        : t
    );
    await saveCoursePlan(updated);
    return NextResponse.json({ plan: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
