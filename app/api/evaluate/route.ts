import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/ai";
import { saveCodeSubmission, ensureTables } from "@/lib/db";
import { CHALLENGES } from "@/lib/challenges";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTables();
  const body = await req.json();
  const { challengeId, code, output, topicId } = body;

  const challenge = CHALLENGES.find((c) => c.id === challengeId);
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const prompt = `You are evaluating a Python code submission for a challenge.

## Challenge
Title: ${challenge.title}
Type: ${challenge.type}
Prompt: ${challenge.prompt}
${challenge.source_code ? `Source Code:\n${challenge.source_code}` : ""}

## Evaluation Criteria
${challenge.evaluation_criteria}

## Student's Submission
\`\`\`python
${code}
\`\`\`

## Execution Output
${output || "(no output)"}

## Instructions
Evaluate the submission. Return a JSON object with:
- passed: boolean (does it meet the evaluation criteria?)
- score: number 0-100
- feedback: string (brief, direct feedback — what they got right, what's wrong)
- concepts_demonstrated: string[] (which expected concepts the code shows understanding of)

Expected concepts: ${challenge.expected_concepts.join(", ")}

Return ONLY the JSON object.`;

  try {
    const result = await chat(prompt, [], "Evaluate the submission now.");
    const text = result.choices[0]?.message?.content || "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
    }

    const evaluation = JSON.parse(jsonMatch[0]);

    // Save submission
    await saveCodeSubmission(
      userId,
      topicId,
      challengeId,
      code,
      output,
      evaluation.passed,
      evaluation.feedback
    );

    // If not passed, include next hint
    if (!evaluation.passed && challenge.hints.length > 0) {
      const hintIndex = Math.min(
        (evaluation.hint_level || 1) - 1,
        challenge.hints.length - 1
      );
      evaluation.hint = challenge.hints[hintIndex];
    }

    return NextResponse.json(evaluation);
  } catch (err) {
    console.error("Evaluation error:", err);
    return NextResponse.json({ error: "Evaluation failed" }, { status: 500 });
  }
}
