import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/ai";
import { upsertUser, saveAssessmentData, saveCoursePlan, ensureTables } from "@/lib/db";
import { buildAssessmentPrompt, buildCodeProbePrompt, buildProfileGenerationPrompt, CODE_PROBES } from "@/lib/assessment";
import { generateCoursePlan } from "@/lib/course-generator";
import type { AssessmentRequest, AssessmentResponse, UserProfile, ChatMessage } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureTables();
  const body: AssessmentRequest = await req.json();

  // Phase: Generate profile + course plan from completed assessment
  if (body.phase === "generate") {
    try {
      const profilePrompt = buildProfileGenerationPrompt(
        body.history,
        body.probeResults || {}
      );

      const result = await chat(profilePrompt, [], "Generate the user profile now.");
      const text = result.choices[0]?.message?.content || "";

      // Extract JSON profile
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 });
      }

      const rawProfile = JSON.parse(jsonMatch[0]);
      const profile: UserProfile = {
        id: userId,
        known_languages: rawProfile.known_languages || [],
        primary_language: rawProfile.primary_language || "typescript",
        years_experience: rawProfile.years_experience || 0,
        python_level: rawProfile.python_level || "none",
        confirmed_skills: rawProfile.confirmed_skills || [],
        identified_gaps: rawProfile.identified_gaps || [],
        goals: rawProfile.goals || [],
        pace_preference: rawProfile.pace_preference || "standard",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Save profile
      await upsertUser(profile);

      // Save assessment data
      await saveAssessmentData(userId, {
        conversation: body.history,
        code_probe_results: body.probeResults || {},
        raw_profile: text,
      });

      // Generate course plan
      const coursePlan = await generateCoursePlan(profile);
      await saveCoursePlan(coursePlan);

      const response: AssessmentResponse = {
        reply: "Assessment complete! I've built your custom course.",
        phase: "complete",
        profile,
        coursePlan,
      };

      return NextResponse.json(response);
    } catch (err) {
      console.error("Assessment generation error:", err);
      return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 });
    }
  }

  // Phase: Conversational assessment or code probes
  try {
    const systemPrompt = buildAssessmentPrompt(body.history);
    const result = await chat(systemPrompt, body.history, body.message);
    const reply = result.choices[0]?.message?.content || "";

    // Determine next phase based on AI response
    let nextPhase: AssessmentResponse["phase"] = body.phase === "code_probe" ? "code_probe" : "conversation";

    // Check if AI signals transition to code probes
    if (reply.includes("[START_CODE_PROBES]") || body.history.length >= 8) {
      nextPhase = "code_probe";
    }

    // Check if AI signals assessment is complete
    if (reply.includes("[ASSESSMENT_COMPLETE]") || (body.phase === "code_probe" && body.history.length >= 16)) {
      nextPhase = "complete";

      // Auto-generate profile
      const profilePrompt = buildProfileGenerationPrompt(
        [...body.history, { role: "user", content: body.message }, { role: "assistant", content: reply }],
        body.probeResults || {}
      );

      const profileResult = await chat(profilePrompt, [], "Generate the user profile now.");
      const profileText = profileResult.choices[0]?.message?.content || "";
      const jsonMatch = profileText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const rawProfile = JSON.parse(jsonMatch[0]);
        const profile: UserProfile = {
          id: userId,
          known_languages: rawProfile.known_languages || [],
          primary_language: rawProfile.primary_language || "typescript",
          years_experience: rawProfile.years_experience || 0,
          python_level: rawProfile.python_level || "none",
          confirmed_skills: rawProfile.confirmed_skills || [],
          identified_gaps: rawProfile.identified_gaps || [],
          goals: rawProfile.goals || [],
          pace_preference: rawProfile.pace_preference || "standard",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await upsertUser(profile);
        await saveAssessmentData(userId, {
          conversation: [...body.history, { role: "user", content: body.message }],
          code_probe_results: body.probeResults || {},
          raw_profile: profileText,
        });

        const coursePlan = await generateCoursePlan(profile);
        await saveCoursePlan(coursePlan);

        return NextResponse.json({
          reply: reply.replace("[ASSESSMENT_COMPLETE]", "").trim(),
          phase: "complete",
          profile,
          coursePlan,
        } satisfies AssessmentResponse);
      }
    }

    const response: AssessmentResponse = {
      reply: reply.replace("[START_CODE_PROBES]", "").replace("[ASSESSMENT_COMPLETE]", "").trim(),
      phase: nextPhase,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Assessment error:", err);
    return NextResponse.json({ error: "Assessment failed" }, { status: 500 });
  }
}
