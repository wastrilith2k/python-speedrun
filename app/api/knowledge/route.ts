import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { searchTopicResources } from "@/lib/zep";
import { TOPIC_POOL } from "@/lib/topic-pool";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const topicId = req.nextUrl.searchParams.get("topicId");
  if (!topicId) return NextResponse.json({ resources: [] });

  const topic = TOPIC_POOL.find((t) => t.id === topicId);
  if (!topic) return NextResponse.json({ resources: [] });

  const resources = await searchTopicResources(topic);

  return NextResponse.json({ resources });
}
