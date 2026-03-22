"use client";

import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import type { ChatMessage } from "@/lib/types";

export interface ChatPaneHandle {
  sendMessage: (msg: string, sub?: { code: string; output: string; challengeId: string }) => Promise<void>;
  stageCodeResult: (code: string, output: string) => void;
}

interface Props {
  topicId: string;
  initialMessages?: ChatMessage[];
  onFunctionCall?: (name: string, args: Record<string, unknown>) => void;
}

const ChatPane = forwardRef<ChatPaneHandle, Props>(function ChatPane({ topicId, initialMessages, onFunctionCall }, ref) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [stagedCode, setStagedCode] = useState<{ code: string; output: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load saved messages when topic changes
  useEffect(() => {
    setMessages(initialMessages || []);
    setStreamingContent("");
    setStagedCode(null);

    if (!initialMessages?.length) {
      fetch(`/api/chat?topicId=${encodeURIComponent(topicId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages?.length) {
            setMessages(data.messages);
          }
        })
        .catch(() => {});
    }
  }, [topicId, initialMessages]);

  const sendMessage = useCallback(
    async (
      message: string,
      codeSubmission?: { code: string; output: string; challengeId: string }
    ) => {
      if (loading) return;

      setLoading(true);
      setStreamingContent("");

      const userMsg: ChatMessage = { role: "user", content: message };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId, message, codeSubmission }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        let lineBuf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuf += decoder.decode(value, { stream: true });
          const parts = lineBuf.split("\n");
          // Keep the last part as buffer (may be incomplete)
          lineBuf = parts.pop() || "";

          for (const line of parts) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "text") {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              } else if (parsed.type === "function_call") {
                onFunctionCall?.(parsed.name, parsed.args);
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }

        if (fullContent) {
          setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
          setStreamingContent("");
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Something went wrong. Try sending that again." },
        ]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [topicId, loading, onFunctionCall]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !stagedCode) return;
    const msg = input.trim() || "Here's my code and output.";
    const sub = stagedCode
      ? { code: stagedCode.code, output: stagedCode.output, challengeId: "" }
      : undefined;
    setStagedCode(null);
    sendMessage(msg, sub);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  // Expose sendMessage and stageCodeResult to parent via ref
  useImperativeHandle(ref, () => ({
    sendMessage,
    stageCodeResult: (code: string, output: string) => {
      setStagedCode({ code, output });
      inputRef.current?.focus();
    },
  }), [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 text-sm chat-message ${
                msg.role === "user"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)]"
              }`}
            >
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-lg px-4 py-3 text-sm bg-[var(--surface)] border border-[var(--border)] chat-message">
              <MessageContent content={streamingContent} />
            </div>
          </div>
        )}

        {loading && !streamingContent && (
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
      <form onSubmit={handleSubmit} className="border-t border-[var(--border)]">
        {stagedCode && (
          <div className="px-4 pt-3 pb-1 flex items-center gap-2 text-xs">
            <span className="bg-[var(--success)]/20 text-[var(--success)] px-2 py-1 rounded font-mono">
              Code output ready
            </span>
            <span className="text-[var(--muted)]">Type your explanation and send, or just hit Send</span>
            <button
              type="button"
              onClick={() => setStagedCode(null)}
              className="ml-auto text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              dismiss
            </button>
          </div>
        )}
        <div className="flex gap-2 p-4 pt-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={stagedCode ? "Add your explanation..." : "Ask a question or respond to a challenge..."}
            rows={2}
            className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !stagedCode)}
            className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors self-end"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
});

export default ChatPane;

// Simple markdown-like rendering for code blocks
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0]?.trim();
          const code = (lang ? lines.slice(1) : lines).join("\n");
          return (
            <pre key={i} className="bg-[#1e1e1e] border border-[var(--border)] rounded-md p-3 my-2 overflow-x-auto">
              {lang && (
                <div className="text-xs text-[var(--muted)] mb-2">{lang}</div>
              )}
              <code className="text-sm font-mono">{code}</code>
            </pre>
          );
        }

        // Inline code
        const inlineParts = part.split(/(`[^`]+`)/g);
        return (
          <span key={i}>
            {inlineParts.map((ip, j) =>
              ip.startsWith("`") && ip.endsWith("`") ? (
                <code
                  key={j}
                  className="bg-[var(--surface)] px-1.5 py-0.5 rounded text-[var(--accent)] text-[13px] font-mono"
                >
                  {ip.slice(1, -1)}
                </code>
              ) : (
                <span key={j}>{ip}</span>
              )
            )}
          </span>
        );
      })}
    </div>
  );
}
