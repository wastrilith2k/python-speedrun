"use client";

import { useState, useEffect } from "react";
import type { ZepResource } from "@/lib/types";

interface Props {
  topicId: string;
}

export default function ResourcePanel({ topicId }: Props) {
  const [resources, setResources] = useState<ZepResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    async function fetchResources() {
      setLoading(true);
      try {
        const res = await fetch(`/api/knowledge?topicId=${topicId}`);
        if (res.ok) {
          const data = await res.json();
          setResources(data.resources || []);
        }
      } catch {
        // Zep may not be configured
      } finally {
        setLoading(false);
      }
    }

    if (topicId) fetchResources();
  }, [topicId]);

  if (resources.length === 0 && !loading) return null;

  return (
    <div className="border-t border-[var(--border)]">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-2 flex items-center justify-between text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <span>Resources ({resources.length})</span>
        <span>{collapsed ? "+" : "-"}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {loading && (
            <p className="text-xs text-[var(--muted)]">Loading resources...</p>
          )}
          {resources.map((resource, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
            >
              <p className="text-xs text-[var(--foreground)] line-clamp-4">
                {resource.content.slice(0, 300)}
                {resource.content.length > 300 && "..."}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-[var(--muted)]">
                  Relevance: {(resource.relevance * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
