import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { streamChat, prepareHistory } from "@/lib/ai";
import { getUser, getChatMessages, saveChatMessage, getCoursePlan, ensureTables } from "@/lib/db";
import { buildTeachingPrompt, buildTopicIntroMessage } from "@/lib/prompts";
import { TOPIC_POOL } from "@/lib/topic-pool";
import { searchTopicResources } from "@/lib/zep";
import type { ChatRequest, ChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureTables();

  const topicId = req.nextUrl.searchParams.get("topicId");
  if (!topicId) {
    return Response.json({ messages: [] });
  }

  const messages = await getChatMessages(userId, topicId);
  return Response.json({ messages });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }
  await ensureTables();

  const body: ChatRequest = await req.json();
  const { topicId, message, codeSubmission } = body;

  // Load user profile and course plan
  const [profile, coursePlan] = await Promise.all([
    getUser(userId),
    getCoursePlan(userId),
  ]);

  if (!profile || !coursePlan) {
    return new Response("No profile or course plan found", { status: 400 });
  }

  // Find the topic
  const topic = TOPIC_POOL.find((t) => t.id === topicId);
  if (!topic) {
    return new Response("Topic not found", { status: 404 });
  }

  const courseTopic = coursePlan.topics.find((t) => t.topic_id === topicId);
  if (!courseTopic) {
    return new Response("Topic not in course plan", { status: 404 });
  }

  // Load chat history
  const existingMessages = await getChatMessages(userId, topicId);

  // If this is the first message for this topic, add an intro
  let history: ChatMessage[] = existingMessages;
  if (existingMessages.length === 0) {
    const intro = buildTopicIntroMessage(topic, courseTopic);
    const introMsg: ChatMessage = { role: "assistant", content: intro };
    await saveChatMessage(userId, topicId, introMsg);
    history = [introMsg];
  }

  // Search Zep for relevant resources
  const zepResources = await searchTopicResources(topic);
  const zepContext = {
    articles: zepResources.map((r) => r.content).join("\n---\n"),
    graphFacts: "",
  };

  // Build the teaching prompt
  const systemPrompt = buildTeachingPrompt(topic, profile, courseTopic, zepContext);

  // Prepare the message (include code submission context if present)
  let fullMessage = message;
  if (codeSubmission) {
    fullMessage = `${message}\n\n[CODE SUBMISSION]\nChallenge: ${codeSubmission.challengeId || "current"}\n\`\`\`python\n${codeSubmission.code}\n\`\`\`\nOutput: ${codeSubmission.output}`;
  }

  // Save user message
  await saveChatMessage(userId, topicId, { role: "user", content: fullMessage });

  // Prepare trimmed history
  const trimmedHistory = prepareHistory([...history, { role: "user", content: fullMessage }]);

  // Stream the response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await streamChat(systemPrompt, trimmedHistory, fullMessage);
        let fullContent = "";

        // Buffer tool call arguments (they arrive in chunks)
        const toolCallBuffers: Record<number, { name: string; args: string }> = {};

        for await (const chunk of result) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Text content
          if (delta.content) {
            fullContent += delta.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "text", content: delta.content })}\n\n`)
            );
          }

          // Tool calls (function calling) — accumulate streamed chunks
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (tc.function?.name) {
                toolCallBuffers[idx] = { name: tc.function.name, args: "" };
              }
              if (tc.function?.arguments && toolCallBuffers[idx]) {
                toolCallBuffers[idx].args += tc.function.arguments;
              }
            }
          }

          // Check finish reason to emit completed tool calls
          const finishReason = chunk.choices[0]?.finish_reason;
          if (finishReason === "tool_calls" || finishReason === "stop") {
            for (const buf of Object.values(toolCallBuffers)) {
              try {
                const args = JSON.parse(buf.args);
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "function_call",
                      name: buf.name,
                      args,
                    })}\n\n`
                  )
                );
              } catch {
                console.error("Failed to parse tool call args:", buf);
              }
            }
          }
        }

        // Save assistant response
        if (fullContent) {
          await saveChatMessage(userId, topicId, { role: "assistant", content: fullContent });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "text", content: "Sorry, something went wrong. Try again." })}\n\n`
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
