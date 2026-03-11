import { ChatMessage, UserProfile } from "./types";

// ── ASSESSMENT FLOW ───────────────────────────────────────
// Phase 1: Conversational background questions

export const ASSESSMENT_FLOW = {
  opener: `What's your programming background? What languages/frameworks do you use day-to-day?`,

  // AI picks from these based on opener response:
  followUps: {
    experience_depth: `How long have you been coding professionally? What kind of stuff do you build?`,
    python_exposure: `Have you written any Python before? Even scripts, notebooks, or just reading others' code?`,
    goals: `What do you want to use Python for? Job requirement, side project, AI/ML, automation, something else?`,
    timeline: `Are you trying to get productive fast (days) or doing a deep learn (weeks)?`,
  },
};

// ── CODE PROBES ───────────────────────────────────────────
// Phase 2: Targeted code challenges to verify actual skill level

export interface CodeProbe {
  id: string;
  type: "read" | "predict" | "translate" | "write" | "explain";
  code?: string;
  prompt?: string;
  question: string;
  reveals: string[];
}

export const CODE_PROBES: Record<string, CodeProbe> = {
  // For someone who says "I know some Python"
  can_read_python: {
    id: "can_read_python",
    type: "read",
    code: `result = [x**2 for x in range(10) if x % 2 == 0]
print(result)`,
    question: "What does this print?",
    reveals: ["list_comprehensions", "range", "basic_syntax"],
  },

  // For someone claiming intermediate Python
  understands_mutability: {
    id: "understands_mutability",
    type: "predict",
    code: `def add_item(item, lst=[]):
    lst.append(item)
    return lst

print(add_item("a"))
print(add_item("b"))`,
    question: "What's the output? (This is a classic Python gotcha)",
    reveals: ["mutable_defaults", "function_internals"],
  },

  // For someone who knows JS/TS well
  closure_understanding: {
    id: "closure_understanding",
    type: "translate",
    code: `// TypeScript
const makeCounter = () => {
  let count = 0;
  return () => ++count;
};`,
    question: "Write the Python equivalent",
    reveals: ["closures", "nonlocal", "first_class_functions"],
  },

  // For someone targeting async
  async_mental_model: {
    id: "async_mental_model",
    type: "explain",
    code: `import asyncio

async def fetch_data():
    await asyncio.sleep(1)
    return "done"

# What's wrong with this?
result = fetch_data()
print(result)`,
    question: "What happens here and how would you fix it?",
    reveals: ["async_fundamentals", "coroutines", "event_loop"],
  },

  // For someone targeting data/ML
  dict_manipulation: {
    id: "dict_manipulation",
    type: "write",
    prompt: "Given a list of dicts like [{'name': 'Alice', 'score': 90}, ...], write a one-liner to get the average score",
    question: "Given a list of dicts like [{'name': 'Alice', 'score': 90}, ...], write a one-liner to get the average score",
    reveals: ["dict_access", "comprehensions", "builtins"],
  },

  // Basic OOP probe
  class_basics: {
    id: "class_basics",
    type: "write",
    prompt: "Create a Python dataclass called Point with x and y fields, and a method that returns the distance from origin",
    question: "Create a Python dataclass called Point with x and y fields, and a method that returns the distance from origin",
    reveals: ["dataclasses", "imports", "math_operations", "type_hints"],
  },
};

// ── PROMPT BUILDERS ───────────────────────────────────────

/**
 * Builds the system prompt for the conversational assessment phase.
 * This prompt instructs the AI on how to conduct the interview.
 */
export function buildAssessmentPrompt(history: ChatMessage[]): string {
  const messageCount = history.filter((m) => m.role === "user").length;

  return `You are conducting a conversational assessment for an adaptive Python course.
Your goal is to understand the student's programming background, Python experience, goals, and preferred learning pace.

## Your Approach
- Be direct and conversational. No corporate-speak, no "Great question!", no filler.
- Ask ONE question at a time. Wait for their response before moving on.
- Listen carefully to what they say — skip follow-ups if their answer already covers it.
- Adapt your language to match their experience level.

## Assessment Flow
${messageCount === 0 ? `Start with the opener question:
"${ASSESSMENT_FLOW.opener}"` : `The conversation has ${messageCount} user messages so far.

Available follow-up questions (pick the most relevant ones you haven't covered yet):
${Object.entries(ASSESSMENT_FLOW.followUps)
  .map(([key, q]) => `- ${key}: "${q}"`)
  .join("\n")}

You do NOT need to ask all of these. If their previous answers already covered a topic, skip it.`}

## What You're Trying to Learn
1. **Languages they know** — especially TypeScript/JavaScript (for translations)
2. **Experience level** — years coding, what they build, professional or hobby
3. **Python exposure** — none, read-only, scripting, real projects
4. **Goals** — why they want Python (AI/ML, job, automation, general skill)
5. **Pace** — fast ramp-up or thorough deep-dive

## Conversation Rules
- Ask 2-4 total questions (including the opener). Do NOT over-interview.
- If their opener response is detailed enough, you can move to 1-2 follow-ups max.
- After you have enough information (typically 3-4 exchanges), signal that you're ready to move to code probes by saying something like: "Got it. Let me give you a few quick code snippets to calibrate where to start."
- Do NOT generate a profile yet — that happens after code probes.

## Signaling Completion
When you have enough background info, end your message with exactly this marker on its own line:
[ASSESSMENT_CONVERSATION_COMPLETE]

This tells the system to transition to the code probe phase. Only include this marker when you genuinely have enough information — typically after 2-4 exchanges.

## Current Conversation
${history.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
}

/**
 * Builds the prompt for evaluating a single code probe response.
 */
export function buildCodeProbePrompt(
  probe: CodeProbe,
  userResponse: string
): string {
  return `You are evaluating a student's response to a code probe during a Python skill assessment.

## The Probe
- Type: ${probe.type}
- Skills tested: ${probe.reveals.join(", ")}

${probe.code ? `### Code Shown
\`\`\`python
${probe.code}
\`\`\`` : ""}

### Question Asked
${probe.question}

${probe.prompt ? `### Additional Prompt
${probe.prompt}` : ""}

## Student's Response
${userResponse}

## Your Evaluation

Analyze the student's response and return a JSON object with these fields:

\`\`\`json
{
  "passed": true/false,
  "confidence": 0.0-1.0,
  "demonstrated_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3"],
  "feedback": "Brief explanation of what they got right/wrong",
  "python_level_signal": "none|read_only|scripting|intermediate|advanced"
}
\`\`\`

### Evaluation Guidelines

**For "read" probes:**
- passed = true if they correctly predict the output
- Partial credit if they get the general idea but miss edge cases

**For "predict" probes:**
- passed = true if they identify the correct output AND explain why
- The mutable default probe: correct answer is ['a'], ['a', 'b'] — they MUST identify that the default list is shared
- Partial credit for correct output without understanding why

**For "translate" probes:**
- passed = true if the Python code is functionally equivalent
- Check for Pythonic idioms (nonlocal for closures, etc.)
- Deduct for writing JavaScript-style Python

**For "write" probes:**
- passed = true if the code would work correctly
- Check for Python conventions (snake_case, proper imports)
- Bonus for using advanced features (dataclasses, type hints)

**For "explain" probes:**
- passed = true if they identify the core issue and propose a valid fix
- For the async probe: they must identify the missing await and explain that calling an async function returns a coroutine

Return ONLY the JSON object, no other text.`;
}

/**
 * Builds the prompt that generates the final UserProfile from all assessment data.
 * This is the critical prompt that synthesizes conversation + probes into a structured profile.
 */
export function buildProfileGenerationPrompt(
  conversation: ChatMessage[],
  probeResults: Record<string, { passed: boolean; response: string }>
): string {
  const probeEntries = Object.entries(probeResults);
  const probesPassed = probeEntries.filter(([, r]) => r.passed).length;
  const totalProbes = probeEntries.length;

  return `You are generating a structured user profile from a Python course assessment.

## Assessment Conversation
${conversation.map((m) => `**${m.role}**: ${m.content}`).join("\n\n")}

## Code Probe Results (${probesPassed}/${totalProbes} passed)
${probeEntries
  .map(
    ([probeId, result]) => `### ${probeId}
- Passed: ${result.passed}
- Skills this tests: ${CODE_PROBES[probeId]?.reveals.join(", ") || "unknown"}
- Student's response: ${result.response}`
  )
  .join("\n\n")}

## Your Task

Generate a UserProfile JSON object based on ALL of the above information. Here is the exact schema:

\`\`\`typescript
interface UserProfile {
  id: string;                          // Set to "pending" — will be replaced with actual user ID
  known_languages: string[];           // Languages they mentioned knowing
  primary_language: string;            // Their main/strongest language (used for code translations)
  years_experience: number;            // Professional coding years (estimate if not stated exactly)
  python_level: PythonLevel;           // See mapping rules below
  confirmed_skills: string[];          // Python concepts verified by passed code probes
  identified_gaps: string[];           // Python concepts they struggled with or clearly don't know
  goals: string[];                     // What they want to use Python for
  pace_preference: "fast" | "thorough"; // Inferred from their timeline/attitude
  created_at: string;                  // Set to current ISO timestamp
  updated_at: string;                  // Set to current ISO timestamp
}

type PythonLevel = "none" | "read_only" | "scripting" | "intermediate" | "advanced";
\`\`\`

## Mapping Rules

### python_level determination
Use BOTH the conversation AND probe results. Probes override self-reported level:

- **"none"**: Never written Python. Failed or didn't attempt basic probes.
- **"read_only"**: Can read Python but hasn't written it. Passed can_read_python but failed write probes.
- **"scripting"**: Has written simple Python scripts. Passed basic read/write probes but failed intermediate ones (mutability, closures).
- **"intermediate"**: Solid Python knowledge. Passed most probes including mutability and closures. May have gaps in advanced topics.
- **"advanced"**: Strong Python skills. Passed all or nearly all probes. Demonstrated knowledge of async, decorators, and Pythonic patterns.

### confirmed_skills mapping
Map passed probes to skill areas:
- can_read_python passed → "list_comprehensions", "range", "basic_syntax"
- understands_mutability passed → "mutable_defaults", "function_internals"
- closure_understanding passed → "closures", "nonlocal", "first_class_functions"
- async_mental_model passed → "async_fundamentals", "coroutines", "event_loop"
- dict_manipulation passed → "dict_access", "comprehensions", "builtins"
- class_basics passed → "dataclasses", "imports", "type_hints"

Also include any skills clearly demonstrated in the conversation (e.g., if they mention writing decorators daily, add "decorators").

### identified_gaps mapping
Map failed probes to gap areas:
- can_read_python failed → "basic_python_syntax", "comprehensions"
- understands_mutability failed → "mutable_defaults", "python_gotchas"
- closure_understanding failed → "closures", "nonlocal_keyword"
- async_mental_model failed → "async_await", "coroutines"
- dict_manipulation failed → "dict_operations", "python_builtins"
- class_basics failed → "dataclasses", "python_oop"

Also include gaps implied by the conversation (e.g., if they say "I've never done async", add "async_fundamentals").

### goals mapping
Map their stated goals to standardized values:
- AI/ML/data science → "ai_ml"
- Web development → "web_dev"
- Automation/scripting → "automation"
- Job requirement → "job_requirement"
- General skill → "general"
- DevOps/infrastructure → "devops"
- Side project → "side_project"

### pace_preference
- "fast" if they mention tight timeline, wanting to get productive quickly, or seem impatient
- "thorough" if they mention wanting deep understanding, have more time, or seem methodical

### known_languages
Extract from conversation. Normalize to lowercase. Include frameworks only if they're language-like (e.g., "react" is fine, "express" is not — just say "javascript" or "typescript").
Common normalizations:
- "TS" / "TypeScript" → "typescript"
- "JS" / "JavaScript" → "javascript"
- "node" / "Node.js" → "javascript"
- "React" → include "typescript" or "javascript" (whichever they use with it)

### primary_language
The language they use most. This is critical because the course generates side-by-side "translations" from their primary language to Python. If they mention multiple languages, pick the one they seem most fluent in or use most recently.

## Output Format

Return ONLY a valid JSON object matching the UserProfile interface. No markdown, no explanation, no wrapping.
Set id to "pending", and both timestamps to "${new Date().toISOString()}".

Example output shape:
\`\`\`json
{
  "id": "pending",
  "known_languages": ["typescript", "javascript", "python"],
  "primary_language": "typescript",
  "years_experience": 5,
  "python_level": "scripting",
  "confirmed_skills": ["basic_syntax", "list_comprehensions"],
  "identified_gaps": ["closures", "async_fundamentals", "mutable_defaults"],
  "goals": ["ai_ml", "automation"],
  "pace_preference": "fast",
  "created_at": "2026-03-11T00:00:00.000Z",
  "updated_at": "2026-03-11T00:00:00.000Z"
}
\`\`\`

Now generate the profile based on the actual assessment data above. Return ONLY the JSON.`;
}
