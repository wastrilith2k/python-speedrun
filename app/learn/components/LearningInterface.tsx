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
    setTopicCompleted(null);

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
        chatRef.current.stageCodeResult(
          currentCode,
          result.output || result.error || "No output"
        );
      }
    },
    [currentCode]
  );

  const [topicCompleted, setTopicCompleted] = useState<{ score: number; assessment: string } | null>(null);
  const completingRef = useRef(false);

  const handleFunctionCall = useCallback(
    (name: string, args: Record<string, unknown>) => {
      if (name === "complete_topic" && currentTopicId && !completingRef.current) {
        completingRef.current = true;
        const score = (args.score as number) || 0;
        const assessment = (args.assessment as string) || "";
        setTopicCompleted({ score, assessment });

        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId: currentTopicId,
            status: "completed",
            score,
            assessment,
            struggles: args.struggles,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.progress) {
              onTopicComplete(currentTopicId!, data.progress);
            }
          })
          .catch(() => {})
          .finally(() => { completingRef.current = false; });
      }
    },
    [currentTopicId, onTopicComplete]
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
          <div className="flex-1 flex min-h-0 flex-col">
            {topicCompleted && (
              <div className="px-4 py-3 bg-[var(--success)]/10 border-b border-[var(--success)]/30 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-semibold text-[var(--success)]">Topic complete!</span>
                  <span className="text-[var(--muted)] ml-2">Score: {topicCompleted.score}/100</span>
                  {topicCompleted.assessment && (
                    <span className="text-[var(--muted)] ml-2">— {topicCompleted.assessment}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    const nextTopic = plan.topics.find((t) => {
                      if (t.topic_id === currentTopicId) return false;
                      const prog = progress.find((p) => p.topic_id === t.topic_id);
                      return prog?.status === "available" || (!prog && t.status === "available");
                    });
                    if (nextTopic) handleSelectTopic(nextTopic.topic_id);
                  }}
                  className="px-3 py-1.5 bg-[var(--success)] text-black rounded text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Next Topic
                </button>
              </div>
            )}
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
