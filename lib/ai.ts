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

// Function declarations for structured AI responses (OpenAI tool format)
export const AI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "complete_topic",
      description: "Call when the student has demonstrated understanding of all concepts in the current topic",
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
  {
    type: "function",
    function: {
      name: "present_challenge",
      description: "Present a code challenge to the student",
      parameters: {
        type: "object",
        properties: {
          challenge_id: { type: "string" },
          type: { type: "string", description: "predict, write, translate, refactor, or explain" },
        },
        required: ["challenge_id", "type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_code",
      description: "Evaluate the student's code submission",
      parameters: {
        type: "object",
        properties: {
          passed: { type: "boolean" },
          feedback: { type: "string" },
          hint_level: { type: "number", description: "Which hint to provide next (1-3)" },
        },
        required: ["passed", "feedback"],
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
    ...({ reasoning: { effort: "none" } } as Record<string, unknown>),
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
    ...({ reasoning: { effort: "none" } } as Record<string, unknown>),
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
    ...({ reasoning: { effort: "none" } } as Record<string, unknown>),
  });

  return result.choices[0]?.message?.content || "";
}

// Build history for the LLM: compressed summary + recent messages
export function prepareHistory(messages: ChatMessage[], compressedSummary?: string | null): ChatMessage[] {
  if (!compressedSummary) {
    // No compression yet — just use recent messages to stay within context
    if (messages.length <= 6) return messages;
    return [messages[0], ...messages.slice(-5)];
  }

  // Use compressed summary + last 4 messages
  const recent = messages.slice(-4);
  const summary: ChatMessage = {
    role: "system",
    content: `[Previous conversation summary]\n${compressedSummary}`,
  };
  return [summary, ...recent];
}
