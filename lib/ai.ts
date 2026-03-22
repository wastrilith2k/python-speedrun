import OpenAI from "openai";
import type { ChatMessage } from "./types";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPEN_ROUTER_API_KEY || "",
  defaultHeaders: {
    "HTTP-Referer": "https://python-speedrun.vercel.app",
    "X-Title": "Python Speedrun",
  },
});

const MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";
const OPENROUTER_EXTRAS = { reasoning: { effort: "none" } } as Record<string, unknown>;

// Sanitize user input before sending to LLM — strip prompt injection attempts
export function sanitizeUserInput(input: string): string {
  // Limit length to prevent context stuffing
  const truncated = input.slice(0, 10000);
  // Strip common prompt injection markers
  return truncated
    .replace(/\[SYSTEM\]/gi, "[USER_TEXT]")
    .replace(/\[INST\]/gi, "[USER_TEXT]")
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/<<SYS>>/gi, "")
    .replace(/<\/SYS>/gi, "");
}

// Sanitize LLM output before sending to client — strip any leaked system content
export function sanitizeLLMOutput(output: string): string {
  return output
    .replace(/<\|im_start\|>[\s\S]*?<\|im_end\|>/g, "")
    .replace(/<<SYS>>[\s\S]*?<\/SYS>/g, "");
}

// Only tool: complete_topic. Everything else (challenges, evaluation) happens in text.
export const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "complete_topic",
      description: "Call ONLY when all concepts have been covered and challenges attempted. This ends the topic.",
      parameters: {
        type: "object",
        properties: {
          score: { type: "number", description: "0-100 score based on challenge performance" },
          assessment: { type: "string", description: "Brief assessment of understanding" },
          struggles: {
            type: "array",
            items: { type: "string" },
            description: "Concepts the student struggled with",
          },
        },
        required: ["score", "assessment"],
      },
    },
  },
];

function mapHistory(systemPrompt: string, history: ChatMessage[], message: string) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const m of history) {
    if (m.role === "system") {
      messages.push({ role: "system", content: m.content });
    } else if (m.role === "assistant") {
      messages.push({ role: "assistant", content: m.content });
    } else {
      messages.push({ role: "user", content: m.content });
    }
  }

  // Only add the new message if it's not already the last user message in history
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== message) {
    messages.push({ role: "user", content: message });
  }

  return messages;
}

// Send a message and get a streaming response
export async function streamChat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
) {
  const messages = mapHistory(systemPrompt, history, message);

  const stream = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools: AI_TOOLS,
    stream: true,
    ...OPENROUTER_EXTRAS,
  });

  return stream;
}

// Send a message and get a full response (for assessment, course generation)
export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
) {
  const messages = mapHistory(systemPrompt, history, message);

  const result = await openai.chat.completions.create({
    model: MODEL,
    messages,
    ...OPENROUTER_EXTRAS,
  });

  return result;
}

// Compress chat history into a concise summary via LLM
export async function compressHistory(messages: ChatMessage[]): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n");

  const result = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a conversation summarizer for a Python tutoring app. Compress the following conversation into a concise summary that preserves:
- What concepts were taught
- What the student understood vs struggled with
- What challenges were attempted and their outcomes
- The student's current skill level for this topic
Keep it under 300 words. Be factual and specific.`,
      },
      { role: "user", content: transcript },
    ],
    ...OPENROUTER_EXTRAS,
  });

  return result.choices[0]?.message?.content || "";
}

// Build history for the LLM: compressed summary + recent messages
export function prepareHistory(messages: ChatMessage[], compressedSummary?: string | null): ChatMessage[] {
  if (!compressedSummary) {
    if (messages.length <= 6) return messages;
    return [messages[0], ...messages.slice(-5)];
  }

  // Keep the intro message (first assistant message) for context
  const intro = messages.find((m) => m.role === "assistant");
  const recent = messages.slice(-4);
  const summary: ChatMessage = {
    role: "system",
    content: `[Previous conversation summary]\n${compressedSummary}`,
  };
  return intro ? [intro, summary, ...recent] : [summary, ...recent];
}
