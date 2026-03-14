"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";
import type { UserProfile, CoursePlan, TopicProgress } from "@/lib/types";
import AssessmentChat from "./components/AssessmentChat";
import CoursePlanView from "./components/CoursePlanView";
import LearningInterface from "./components/LearningInterface";

type AppState = "loading" | "assessment" | "course_review" | "learning" | "error";

export default function LearnPage() {
  const { user } = useUser();
  const [appState, setAppState] = useState<AppState>("loading");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [coursePlan, setCoursePlan] = useState<CoursePlan | null>(null);
  const [progress, setProgress] = useState<TopicProgress[]>([]);

  const loadUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/course");
      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setCoursePlan(data.plan);
          setProgress(data.progress || []);
          setProfile(data.profile);
          setAppState("learning");
          return;
        }
      }
      // No course plan — start assessment
      setAppState("assessment");
    } catch {
      setAppState("error");
    }
  }, [user?.id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  function handleAssessmentComplete(newProfile: UserProfile, newPlan: CoursePlan) {
    setProfile(newProfile);
    setCoursePlan(newPlan);
    setAppState("course_review");
  }

  function handleCourseAccepted() {
    setAppState("learning");
  }

  async function handleCourseRegenerate() {
    // Re-run course generation with updated preferences
    const res = await fetch("/api/course", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate" }),
    });
    if (res.ok) {
      const data = await res.json();
      setCoursePlan(data.plan);
    }
  }

  function handleTopicComplete(topicId: string, newProgress: TopicProgress[]) {
    setProgress(newProgress);
    // Update course plan topic statuses
    if (coursePlan) {
      const updated = { ...coursePlan };
      updated.topics = updated.topics.map((t) => {
        const prog = newProgress.find((p) => p.topic_id === t.topic_id);
        if (prog) return { ...t, status: prog.status };
        return t;
      });
      setCoursePlan(updated);
    }
  }

  if (appState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--muted)]">
          <div className="loading-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
          <div className="loading-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
          <div className="loading-dot w-2 h-2 rounded-full bg-[var(--accent)]" />
        </div>
      </div>
    );
  }

  if (appState === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">Something went wrong loading your data.</p>
          <button
            onClick={() => { setAppState("loading"); loadUserData(); }}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (appState === "assessment") {
    return <AssessmentChat onComplete={handleAssessmentComplete} />;
  }

  if (appState === "course_review" && coursePlan && profile) {
    return (
      <CoursePlanView
        plan={coursePlan}
        profile={profile}
        onAccept={handleCourseAccepted}
        onRegenerate={handleCourseRegenerate}
      />
    );
  }

  if (appState === "learning" && coursePlan && profile) {
    return (
      <LearningInterface
        plan={coursePlan}
        profile={profile}
        progress={progress}
        onTopicComplete={handleTopicComplete}
      />
    );
  }

  return null;
}
