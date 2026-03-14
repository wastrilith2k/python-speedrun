"use client";

import { useState, useRef, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import type { ChatMessage, UserProfile, CoursePlan, AssessmentResponse } from "@/lib/types";

interface Props {
  onComplete: (profile: UserProfile, plan: CoursePlan) => void;
}

export default function AssessmentChat({ onComplete }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm going to ask you a few questions to build you a custom Python course. No generic intro-to-programming stuff — this is for devs who already know how to code.\n\nWhat's your programming background? What languages and frameworks do you use day-to-day?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"conversation" | "code_probe" | "complete">("conversation");
  const [probeResults, setProbeResults] = useState<Record<string, { passed: boolean; response: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          phase,
          history: newMessages,
          probeResults,
        }),
      });

      const data: AssessmentResponse = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setPhase(data.phase);

      if (data.phase === "complete" && data.profile && data.coursePlan) {
        onComplete(data.profile, data.coursePlan);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again?" },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="min-h-screen flex flex-col max-w-3xl mx-auto px-4">
      {/* Header */}
      <div className="py-6 border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">
            <span className="text-[var(--accent)]">py</span>speedrun
            <span className="text-[var(--muted)] text-sm font-normal ml-3">Assessment</span>
          </h1>
          <UserButton />
        </div>
        <p className="text-sm text-[var(--muted)] mt-1">
          {phase === "conversation" && "Getting to know your background..."}
          {phase === "code_probe" && "Testing your Python skills with some code challenges..."}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)]"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 flex gap-1">
              <div className="loading-dot w-2 h-2 rounded-full bg-[var(--muted)]" />
              <div className="loading-dot w-2 h-2 rounded-full bg-[var(--muted)]" />
              <div className="loading-dot w-2 h-2 rounded-full bg-[var(--muted)]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="py-4 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              phase === "code_probe"
                ? "Write your answer or code here..."
                : "Type your response..."
            }
            rows={2}
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)] font-mono"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors self-end"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
