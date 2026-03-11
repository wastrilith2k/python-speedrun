"use client";

import type { CoursePlan, CourseTopic, TopicProgress } from "@/lib/types";
import { UserButton } from "@clerk/nextjs";

interface Props {
  plan: CoursePlan;
  progress: TopicProgress[];
  currentTopicId: string | null;
  onSelectTopic: (topicId: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const statusIcons: Record<string, string> = {
  locked: "~",
  available: ">",
  in_progress: "*",
  completed: "+",
  skipped: "-",
};

const statusColors: Record<string, string> = {
  locked: "text-[var(--muted)] opacity-50",
  available: "text-[var(--foreground)]",
  in_progress: "text-[var(--accent)]",
  completed: "text-[var(--success)]",
  skipped: "text-[var(--muted)] line-through opacity-40",
};

export default function Sidebar({
  plan,
  progress,
  currentTopicId,
  onSelectTopic,
  collapsed,
  onToggle,
}: Props) {
  const includedTopics = plan.topics.filter((t) => t.status !== "skipped");
  const completedCount = progress.filter((p) => p.status === "completed").length;

  function getTopicStatus(topic: CourseTopic): string {
    const prog = progress.find((p) => p.topic_id === topic.topic_id);
    return prog?.status || topic.status;
  }

  function isClickable(topic: CourseTopic): boolean {
    const status = getTopicStatus(topic);
    return status === "available" || status === "in_progress" || status === "completed";
  }

  if (collapsed) {
    return (
      <div className="w-12 border-r border-[var(--border)] flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="text-[var(--muted)] hover:text-[var(--foreground)] mb-4"
          title="Expand sidebar"
        >
          &gt;&gt;
        </button>
        <div className="text-xs text-[var(--muted)] writing-vertical">
          {completedCount}/{includedTopics.length}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 border-r border-[var(--border)] flex flex-col bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div>
          <span className="font-bold text-sm">
            <span className="text-[var(--accent)]">py</span>speedrun
          </span>
          <div className="text-xs text-[var(--muted)] mt-0.5">
            {completedCount}/{includedTopics.length} completed
          </div>
        </div>
        <button
          onClick={onToggle}
          className="text-[var(--muted)] hover:text-[var(--foreground)] text-xs"
          title="Collapse sidebar"
        >
          &lt;&lt;
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--success)] rounded-full transition-all duration-500"
            style={{
              width: `${includedTopics.length ? (completedCount / includedTopics.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Topic list */}
      <div className="flex-1 overflow-y-auto py-2">
        {includedTopics.map((topic, i) => {
          const status = getTopicStatus(topic);
          const active = topic.topic_id === currentTopicId;
          const clickable = isClickable(topic);
          const prog = progress.find((p) => p.topic_id === topic.topic_id);

          return (
            <button
              key={topic.topic_id}
              onClick={() => clickable && onSelectTopic(topic.topic_id)}
              disabled={!clickable}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                active
                  ? "bg-[var(--accent)]/10 border-l-2 border-[var(--accent)]"
                  : clickable
                  ? "hover:bg-[var(--surface-hover)]"
                  : "cursor-not-allowed"
              } ${statusColors[status]}`}
            >
              <span className="font-mono text-xs mt-0.5 flex-shrink-0 w-4 text-center">
                {statusIcons[status]}
              </span>
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {topic.topic_id.replace(/_/g, " ")}
                </div>
                {prog?.score !== undefined && (
                  <div className="text-xs mt-0.5 text-[var(--muted)]">
                    Score: {prog.score}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* User */}
      <div className="p-4 border-t border-[var(--border)]">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </div>
  );
}
