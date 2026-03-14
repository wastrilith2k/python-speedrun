import { SignInButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <span className="text-lg font-bold">
          <span className="text-[var(--accent)]">py</span>speedrun
        </span>
        <div>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium transition-colors">
                Sign In
              </button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <div className="flex items-center gap-3">
              <Link
                href="/learn"
                className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg text-sm font-medium transition-colors"
              >
                Start Learning
              </Link>
              <UserButton />
            </div>
          </Show>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <h1 className="text-5xl font-bold mb-6">
            Learn Python.
            <br />
            <span className="text-[var(--muted)]">Skip what you know.</span>
          </h1>

          <p className="text-lg text-[var(--muted)] mb-8 max-w-lg mx-auto">
            An adaptive course that interviews you, finds your gaps, and builds
            a custom curriculum. For devs who already know how to code.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg font-medium transition-colors">
                  Get Started
                </button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/learn"
                className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-lg font-medium transition-colors"
              >
                Continue Learning
              </Link>
            </Show>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <h3 className="font-semibold mb-2">Custom Course</h3>
              <p className="text-sm text-[var(--muted)]">
                AI interviews you, then builds a personalized learning path
                based on your gaps and goals.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <h3 className="font-semibold mb-2">Code in Browser</h3>
              <p className="text-sm text-[var(--muted)]">
                Write and run Python right here. No setup, no installs.
                Powered by Pyodide/WASM.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <h3 className="font-semibold mb-2">Language Translations</h3>
              <p className="text-sm text-[var(--muted)]">
                See concepts as &ldquo;In TypeScript you&rsquo;d do X, in Python
                it&rsquo;s Y.&rdquo; Builds on what you know.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-[var(--muted)] border-t border-[var(--border)]">
        Built for experienced devs who don&rsquo;t need another &ldquo;what is a
        variable&rdquo; course.
      </footer>
    </div>
  );
}
