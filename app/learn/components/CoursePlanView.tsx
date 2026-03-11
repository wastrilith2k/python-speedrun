"use client";

import type { CoursePlan, UserProfile } from "@/lib/types";

interface Props {
  plan: CoursePlan;
  profile: UserProfile;
  onAccept: () => void;
  onRegenerate: () => void;
}

const depthColors = {
  overview: "text-[var(--success)]",
  standard: "text-[var(--accent)]",
  deep_dive: "text-[var(--warning)]",
};

const depthLabels = {
  overview: "Quick overview",
  standard: "Full coverage",
  deep_dive: "Deep dive",
};

export default function CoursePlanView({ plan, profile, onAccept, onRegenerate }: Props) {
  const includedTopics = plan.topics.filter((t) => t.status !== "skipped");
  const skippedTopics = plan.topics.filter((t) => t.status === "skipped");

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{plan.title}</h1>
        <p className="text-[var(--muted)]">{plan.description}</p>
        <div className="flex gap-4 mt-4 text-sm text-[var(--muted)]">
          <span>
            {includedTopics.length} topics
          </span>
          <span>~{plan.estimated_total_minutes} min</span>
          <span>
            {profile.python_level === "none" ? "Starting fresh" : `Level: ${profile.python_level}`}
          </span>
        </div>
      </div>

      {/* Course topics */}
      <div className="space-y-3 mb-8">
        <h2 className="text-lg font-semibold mb-4">Your Custom Course</h2>
        {includedTopics.map((topic, i) => (
          <div
            key={topic.topic_id}
            className="flex items-start gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center text-sm font-mono">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{topic.topic_id.replace(/_/g, " ")}</span>
                <span className={`text-xs ${depthColors[topic.depth]}`}>
                  {depthLabels[topic.depth]}
                </span>
              </div>
              <p className="text-sm text-[var(--muted)]">{topic.reason_included}</p>
              {topic.custom_focus && (
                <p className="text-xs text-[var(--accent)] mt-1">
                  Focus: {topic.custom_focus}
                </p>
              )}
              <span className="text-xs text-[var(--muted)]">~{topic.estimated_minutes} min</span>
            </div>
          </div>
        ))}
      </div>

      {/* Skipped topics */}
      {skippedTopics.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[var(--muted)] mb-3">
            Skipped ({skippedTopics.length} topics you already know)
          </h3>
          <div className="space-y-2">
            {skippedTopics.map((topic) => (
              <div
                key={topic.topic_id}
                className="flex items-center gap-3 px-4 py-2 rounded-lg border border-[var(--border)] opacity-50"
              >
                <span className="text-sm line-through">
                  {topic.topic_id.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {topic.reason_skipped}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4 border-t border-[var(--border)]">
        <button
          onClick={onAccept}
          className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg font-medium transition-colors"
        >
          Start Learning
        </button>
        <button
          onClick={onRegenerate}
          className="px-6 py-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg font-medium transition-colors text-[var(--muted)]"
        >
          Regenerate Plan
        </button>
      </div>
    </div>
  );
}
