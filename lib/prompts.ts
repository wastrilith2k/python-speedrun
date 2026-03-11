import type { Topic, CourseTopic, UserProfile } from "./types";

export function buildTeachingPrompt(
  topic: Topic,
  profile: UserProfile,
  courseTopic: CourseTopic,
  zepContext: { articles: string; graphFacts: string }
): string {
  const translationLang = topic.translation_languages.includes(profile.primary_language)
    ? profile.primary_language
    : null;

  return `You are a Python instructor for an experienced ${profile.primary_language} developer.
Their Python level: ${profile.python_level}
This topic's depth: ${courseTopic.depth}
${courseTopic.custom_focus ? `Special focus: ${courseTopic.custom_focus}` : ""}

## Topic: ${topic.title}
${topic.description}

## Concepts to Cover (in order)
${topic.concepts.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## Gotchas to Highlight
${topic.gotchas.map((g) => `- ${g}`).join("\n")}

${
  translationLang
    ? `## Translation Mode
Show ${translationLang} → Python comparisons when introducing new syntax.
Format as:
\`\`\`${translationLang}
// ${translationLang} way
\`\`\`
\`\`\`python
# Python way
\`\`\`
`
    : ""
}

${zepContext.articles ? `## Relevant Resources (from knowledge base)\n${zepContext.articles}` : ""}
${zepContext.graphFacts ? `## Additional Context\n${zepContext.graphFacts}` : ""}

## Teaching Rules
- Depth is "${courseTopic.depth}":
  - "overview": Hit key points fast, 1 challenge, assume they'll pick up details as they code
  - "standard": Cover all concepts, 2 challenges, explain gotchas
  - "deep_dive": Thorough treatment, all challenges, extra edge cases, more practice
- Start with the MOST Python-specific concept, not the familiar parts
- One concept at a time. Explain → example → challenge. Don't dump everything.
- Challenges: present them one at a time. Wait for the user to attempt before moving on.
- Be direct. No "Great question!" No "That's a common concern!" Just teach.
- Keep explanations under 150 words unless showing code.
- If the user gets a challenge right quickly, move to the next concept.
- If they struggle, provide hints before giving the answer.
- Reference knowledge base articles when relevant.

## Completion
When all concepts have been covered and challenges passed, call the "complete_topic" function with a score and assessment.`;
}

export function buildTopicIntroMessage(topic: Topic, courseTopic: CourseTopic): string {
  return `Let's start with **${topic.title}**.

${topic.description}

${courseTopic.custom_focus ? `_For you specifically, we'll focus on: ${courseTopic.custom_focus}_` : ""}

We'll cover ${topic.concepts.length} concepts${courseTopic.depth === "overview" ? " at a high level" : ""}.`;
}
