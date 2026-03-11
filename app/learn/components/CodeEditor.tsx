"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { RunResult } from "@/lib/types";

// Pyodide types
declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

interface PyodideInterface {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
}

interface Props {
  starterCode?: string;
  readOnly?: boolean;
  onRun?: (result: RunResult) => void;
  onCodeChange?: (code: string) => void;
}

export default function CodeEditor({ starterCode, readOnly, onRun, onCodeChange }: Props) {
  const [code, setCode] = useState(starterCode || "");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [pyLoading, setPyLoading] = useState(true);
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const editorRef = useRef<{ view?: { state: { doc: { toString: () => string } } } }>(null);
  const [CodeMirrorComponent, setCodeMirrorComponent] = useState<React.ComponentType<Record<string, unknown>> | null>(null);

  // Load CodeMirror dynamically (it's client-only)
  useEffect(() => {
    Promise.all([
      import("@uiw/react-codemirror"),
      import("@codemirror/lang-python"),
      import("@codemirror/theme-one-dark"),
    ]).then(([cm, python, theme]) => {
      const CMEditor = ({ value, onChange, readOnly: ro }: {
        value: string;
        onChange: (val: string) => void;
        readOnly: boolean;
      }) => {
        const Component = cm.default;
        return (
          <Component
            value={value}
            onChange={onChange}
            theme={theme.oneDark}
            extensions={[python.python()]}
            editable={!ro}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              bracketMatching: true,
              autocompletion: true,
            }}
            className="h-full text-sm"
          />
        );
      };
      setCodeMirrorComponent(() => CMEditor as unknown as React.ComponentType<Record<string, unknown>>);
    });
  }, []);

  // Load Pyodide
  useEffect(() => {
    async function loadPy() {
      try {
        // Load Pyodide script
        if (!window.loadPyodide) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.js";
          script.async = true;
          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const py = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/",
        });
        pyodideRef.current = py;
        setPyReady(true);
      } catch (err) {
        console.error("Failed to load Pyodide:", err);
        setError("Failed to load Python runtime");
      } finally {
        setPyLoading(false);
      }
    }
    loadPy();
  }, []);

  // Update code when starterCode changes
  useEffect(() => {
    if (starterCode !== undefined) {
      setCode(starterCode);
    }
  }, [starterCode]);

  const runCode = useCallback(async () => {
    const py = pyodideRef.current;
    if (!py || running) return;

    setRunning(true);
    setOutput("");
    setError(null);

    try {
      // Reset stdout/stderr
      py.runPython(`
import sys, io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);

      // Run with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Code execution timed out (5s limit)")), 5000)
      );

      await Promise.race([py.runPythonAsync(code), timeoutPromise]);

      const stdout = py.runPython("sys.stdout.getvalue()") as string;
      const stderr = py.runPython("sys.stderr.getvalue()") as string;

      const result: RunResult = {
        output: stdout || null,
        error: stderr || null,
      };

      setOutput(stdout);
      if (stderr) setError(stderr);
      onRun?.(result);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      onRun?.({ output: null, error: errorMsg });
    } finally {
      setRunning(false);
    }
  }, [code, running, onRun]);

  function handleCodeChange(val: string) {
    setCode(val);
    onCodeChange?.(val);
  }

  return (
    <div className="flex flex-col h-full border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface)] border-b border-[var(--border)]">
        <span className="text-xs text-[var(--muted)] font-mono">python</span>
        <div className="flex items-center gap-2">
          {pyLoading && (
            <span className="text-xs text-[var(--muted)]">Loading Python...</span>
          )}
          {pyReady && (
            <span className="text-xs text-[var(--success)]">Ready</span>
          )}
          <button
            onClick={runCode}
            disabled={!pyReady || running || readOnly}
            className="px-3 py-1 bg-[var(--success)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs font-medium text-black transition-opacity"
          >
            {running ? "Running..." : "Run"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-[200px] overflow-auto">
        {CodeMirrorComponent ? (
          <CodeMirrorComponent
            value={code}
            onChange={handleCodeChange}
            readOnly={readOnly || false}
          />
        ) : (
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            readOnly={readOnly}
            className="w-full h-full bg-[#282c34] text-[#abb2bf] p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
        )}
      </div>

      {/* Output */}
      {(output || error) && (
        <div className="border-t border-[var(--border)] bg-[#1e1e1e] max-h-[200px] overflow-auto">
          <div className="px-3 py-1 text-xs text-[var(--muted)] border-b border-[var(--border)]">
            Output
          </div>
          <pre className="p-3 text-sm font-mono whitespace-pre-wrap">
            {output && <span className="text-[var(--foreground)]">{output}</span>}
            {error && <span className="text-[var(--error)]">{error}</span>}
          </pre>
        </div>
      )}
    </div>
  );
}
