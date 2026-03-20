"use client";

import { useState, useCallback, useRef } from "react";
import type { CoursePlan, UserProfile, TopicProgress, RunResult } from "@/lib/types";
import Sidebar from "./Sidebar";
import ChatPane from "./ChatPane";
import type { ChatPaneHandle } from "./ChatPane";
import CodeEditor from "./CodeEditor";
import ResourcePanel from "./ResourcePanel";

interface Props {
  plan: CoursePlan;
  profile: UserProfile;
  progress: TopicProgress[];
  onTopicComplete: (topicId: string, progress: TopicProgress[]) => void;
}

export default function LearningInterface({ plan, profile, progress, onTopicComplete }: Props) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentCode, setCurrentCode] = useState("");
  const [lastRunResult, setLastRunResult] = useState<RunResult | null>(null);
  const chatRef = useRef<ChatPaneHandle>(null);

  // Find the first available or in-progress topic
  const firstActive = plan.topics.find(
    (t) => t.status === "available" || t.status === "in_progress"
  );
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(
    firstActive?.topic_id || null
  );

  const handleSelectTopic = useCallback((topicId: string) => {
    setCurrentTopicId(topicId);
    setCurrentCode("");
    setLastRunResult(null);

    // Mark as in_progress if available
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, status: "in_progress" }),
    }).catch(() => {});
  }, []);

  const handleCodeRun = useCallback(
    (result: RunResult) => {
      setLastRunResult(result);

      if (chatRef.current && currentCode) {
        chatRef.current.sendMessage(
          `I ran my code. Here's the result:\n\`\`\`\n${result.output || result.error || "No output"}\n\`\`\``,
          {
            code: currentCode,
            output: result.output || result.error || "",
            challengeId: "",
          }
        );
      }
    },
    [currentCode]
  );

  const handleFunctionCall = useCallback(
    (name: string, args: Record<string, unknown>) => {
      if (name === "complete_topic" && currentTopicId) {
        // Update progress
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: currentTopicId,
            status: "completed",
            score: args.score,
            assessment: args.assessment,
            struggles: args.struggles,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.progress) {
              onTopicComplete(currentTopicId!, data.progress);

              // Auto-advance to next topic after a brief delay
              setTimeout(() => {
                const nextTopic = plan.topics.find(
                  (t) =>
                    t.topic_id !== currentTopicId &&
                    (data.progress.find(
                      (p: TopicProgress) => p.topic_id === t.topic_id
                    )?.status === "available" ||
                      t.status === "available")
                );
                if (nextTopic) {
                  handleSelectTopic(nextTopic.topic_id);
                }
              }, 2000);
            }
          })
          .catch(() => {});
      }
    },
    [currentTopicId, plan.topics, onTopicComplete, handleSelectTopic]
  );

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <Sidebar
        plan={plan}
        progress={progress}
        currentTopicId={currentTopicId}
        onSelectTopic={handleSelectTopic}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {currentTopicId ? (
          <div className="flex-1 flex min-h-0">
            {/* Chat + Resources (left) */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-[var(--border)]">
              <ChatPane
                ref={chatRef}
                topicId={currentTopicId}
                onFunctionCall={handleFunctionCall}
              />
              <ResourcePanel topicId={currentTopicId} />
            </div>

            {/* Code Editor (right) */}
            <div className="w-[45%] flex-shrink-0">
              <CodeEditor
                onRun={handleCodeRun}
                onCodeChange={setCurrentCode}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <p className="text-lg mb-2">All topics completed!</p>
              <p className="text-sm">
                You&apos;ve finished your custom Python course.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
