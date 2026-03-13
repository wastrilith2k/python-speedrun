import { GoogleGenerativeAI, type GenerateContentResult, type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import type { ChatMessage } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Function declarations for structured AI responses
export const AI_FUNCTIONS: FunctionDeclaration[] = [
  {
    name: "complete_topic",
    description: "Call when the student has demonstrated understanding of all concepts in the current topic",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        score: { type: SchemaType.NUMBER, description: "0-100 score based on challenge performance" },
        assessment: { type: SchemaType.STRING, description: "Brief assessment of understanding" },
        struggles: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "Concepts the student struggled with",
        },
      },
      required: ["score", "assessment"],
    },
  },
  {
    name: "present_challenge",
    description: "Present a code challenge to the student",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        challenge_id: { type: SchemaType.STRING },
        type: { type: SchemaType.STRING, description: "predict, write, translate, refactor, or explain" },
      },
      required: ["challenge_id", "type"],
    },
  },
  {
    name: "evaluate_code",
    description: "Evaluate the student's code submission",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        passed: { type: SchemaType.BOOLEAN },
        feedback: { type: SchemaType.STRING },
        hint_level: { type: SchemaType.NUMBER, description: "Which hint to provide next (1-3)" },
      },
      required: ["passed", "feedback"],
    },
  },
];

// Get a Gemini model instance with function calling
export function getModel(withTools = true) {
  return genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    ...(withTools ? { tools: [{ functionDeclarations: AI_FUNCTIONS }] } : {}),
  });
}

// Send a message and get a streaming response
export async function streamChat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
) {
  const model = getModel();

  // Gemini requires history to start with a user message — drop leading assistant messages
  const mapped = history.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));
  while (mapped.length > 0 && mapped[0].role === "model") {
    mapped.shift();
  }

  const chat = model.startChat({
    history: mapped,
    systemInstruction: systemPrompt,
  });

  const result = await chat.sendMessageStream(message);
  return result;
}

// Send a message and get a full response (for assessment, course generation)
export async function chat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<GenerateContentResult> {
  const model = getModel(false);

  // Gemini requires history to start with a user message — drop leading assistant messages
  const mapped = history.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));
  while (mapped.length > 0 && mapped[0].role === "model") {
    mapped.shift();
  }

  const chatSession = model.startChat({
    history: mapped,
    systemInstruction: systemPrompt,
  });

  return chatSession.sendMessage(message);
}

// Prepare conversation history — summarize if too long
export function prepareHistory(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= 10) return messages;

  const intro = messages.slice(0, 2);
  const recent = messages.slice(-8);
  const middle = messages.slice(2, -8);

  if (middle.length > 0) {
    const summary: ChatMessage = {
      role: "system",
      content: `[Earlier: ${middle.length} messages. The student has been working through the topic progressively.]`,
    };
    return [...intro, summary, ...recent];
  }

  return [...intro, ...recent];
}
