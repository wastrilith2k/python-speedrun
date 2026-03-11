# Python Speedrun — Full Architecture & Build Spec

## What This Is

An adaptive Python course for experienced developers. Instead of a fixed curriculum, the app interviews you — figures out what languages you know, what you've built, where your gaps are, what you want to do with Python — then generates a custom course tailored to you. A React/Next.js app with an AI instructor, in-browser Python execution, and a knowledge base of curated articles powering the content.

**Core loop:**
1. User signs in, takes a conversational assessment (5-10 min)
2. AI analyzes gaps and goals, generates a personalized course plan
3. User works through their custom modules — each with teaching, code challenges, and curated resources
4. AI adapts in real-time: speeds up if you're crushing it, slows down and adds exercises if you're struggling
5. Progress persists across sessions, course plan can be revised as the user evolves

**Key differentiators:**
- No fixed syllabus — every user gets a different course
- "Translations" — shows concepts as "In TypeScript you'd do X, in Python it's Y" (or Java, Go, etc.)
- In-browser Python execution via Pyodide — zero setup friction
- Zep knowledge base integration — AI draws from curated articles and resources when teaching
- Adaptive pacing within each topic, not just skip/don't-skip at the module level

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14+ (App Router) | React frontend, API routes for backend, deploys to Vercel |
| AI | Google Gemini Flash (gemini-2.0-flash) | Free tier: 15 RPM, 1M tokens/day, function calling support |
| Database | Turso (libSQL/SQLite) | Free tier: 9GB, edge-ready, simple schema |
| Knowledge Base | Zep Cloud | Stores curated articles, surfaces relevant content per topic via semantic search |
| Python Runtime | Pyodide (client-side WASM) | No backend needed for code execution, safe sandboxing |
| Auth | Clerk | Google/GitHub sign-in, 10K free MAU |
| Hosting | Vercel | Free tier, auto-deploys from GitHub |
| Styling | Tailwind CSS | Fast iteration |
| Code Editor | CodeMirror 6 | Lightweight, Python syntax highlighting, mobile-friendly |

---

## Project Structure

```
python-speedrun/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                       # Public landing page
│   ├── learn/
│   │   ├── page.tsx                   # Main learning interface
│   │   └── components/
│   │       ├── Sidebar.tsx            # Custom course plan + progress
│   │       ├── ChatPane.tsx           # Streaming AI conversation
│   │       ├── CodeEditor.tsx         # CodeMirror + Pyodide runner
│   │       ├── AssessmentChat.tsx     # Conversational assessment UI
│   │       ├── CoursePlan.tsx         # Shows generated course + lets user adjust
│   │       └── ResourcePanel.tsx      # Zep-powered article suggestions
│   └── api/
│       ├── chat/route.ts              # POST — streaming AI conversation
│       ├── assess/route.ts            # POST — process assessment, generate course
│       ├── course/route.ts            # GET/POST/PATCH — user's custom course plan
│       ├── progress/route.ts          # GET/POST — topic progress CRUD
│       ├── knowledge/route.ts         # GET — search Zep for relevant articles
│       └── evaluate/route.ts          # POST — AI evaluates code submission
├── lib/
│   ├── ai.ts                          # Gemini client wrapper (streaming + function calling)
│   ├── db.ts                          # Turso client + queries
│   ├── zep.ts                         # Zep client — search & store
│   ├── topic-pool.ts                  # All teachable topics with metadata
│   ├── course-generator.ts            # AI-driven course plan generation
│   ├── assessment.ts                  # Assessment question bank + analysis
│   ├── prompts.ts                     # System prompt builders
│   ├── challenges.ts                  # Code challenge definitions
│   └── types.ts                       # Shared TypeScript types
├── scripts/
│   └── seed.ts                        # Initialize DB schema
├── middleware.ts                      # Clerk auth
├── .env.local
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## The Assessment System

The assessment is a **conversational interview**, not a quiz. The AI asks questions, the user responds naturally, and the system builds a profile from the conversation.

### Phase 1: Background (2-3 questions, conversational)

The AI asks these adaptively — skips follow-ups if answers are clear:

```typescript
// lib/assessment.ts
export const ASSESSMENT_FLOW = {
  opener: `What's your programming background? What languages/frameworks
           do you use day-to-day?`,

  // AI picks from these based on opener response:
  followUps: {
    experience_depth: `How long have you been coding professionally?
                       What kind of stuff do you build?`,
    python_exposure: `Have you written any Python before? Even scripts,
                      notebooks, or just reading others' code?`,
    goals: `What do you want to use Python for? Job requirement, side
            project, AI/ML, automation, something else?`,
    timeline: `Are you trying to get productive fast (days) or doing a
               deep learn (weeks)?`,
  },
};
```

### Phase 2: Code Probes (3-5 targeted challenges)

After the conversation, the AI presents small code reading/writing challenges to verify actual skill level. These are chosen dynamically based on Phase 1 answers.

```typescript
// lib/assessment.ts
export const CODE_PROBES = {
  // For someone who says "I know some Python"
  can_read_python: {
    type: "read",
    code: `
result = [x**2 for x in range(10) if x % 2 == 0]
print(result)`,
    question: "What does this print?",
    reveals: ["list_comprehensions", "range", "basic_syntax"],
  },

  // For someone claiming intermediate Python
  understands_mutability: {
    type: "predict",
    code: `
def add_item(item, lst=[]):
    lst.append(item)
    return lst

print(add_item("a"))
print(add_item("b"))`,
    question: "What's the output? (This is a classic Python gotcha)",
    reveals: ["mutable_defaults", "function_internals"],
  },

  // For someone who knows JS/TS well
  closure_understanding: {
    type: "translate",
    code: `
// TypeScript
const makeCounter = () => {
  let count = 0;
  return () => ++count;
};`,
    question: "Write the Python equivalent",
    reveals: ["closures", "nonlocal", "first_class_functions"],
  },

  // For someone targeting async
  async_mental_model: {
    type: "explain",
    code: `
import asyncio

async def fetch_data():
    await asyncio.sleep(1)
    return "done"

# What's wrong with this?
result = fetch_data()
print(result)`,
    question: "What happens here and how would you fix it?",
    reveals: ["async_fundamentals", "coroutines", "event_loop"],
  },

  // For someone targeting data/ML
  dict_manipulation: {
    type: "write",
    prompt: "Given a list of dicts like [{'name': 'Alice', 'score': 90}, ...], write a one-liner to get the average score",
    reveals: ["dict_access", "comprehensions", "builtins"],
  },

  // Basic OOP probe
  class_basics: {
    type: "write",
    prompt: "Create a Python dataclass called Point with x and y fields, and a method that returns the distance from origin",
    reveals: ["dataclasses", "imports", "math_operations", "type_hints"],
  },
};
```

### Phase 3: Profile Generation

The AI synthesizes everything into a structured profile:

```typescript
// Output from assessment — stored in DB and used to generate course
interface UserProfile {
  id: string;                          // Clerk user ID
  known_languages: string[];           // ["typescript", "javascript", "react"]
  primary_language: string;            // "typescript" — used for translations
  years_experience: number;            // professional coding years
  python_level: PythonLevel;           // none | read_only | scripting | intermediate | advanced
  confirmed_skills: string[];          // topics verified by code probes
  identified_gaps: string[];           // topics they struggled with or don't know
  goals: string[];                     // ["ai_ml", "automation", "job_requirement"]
  pace_preference: "fast" | "thorough"; // inferred from timeline answer
  created_at: string;
  updated_at: string;
}

type PythonLevel = "none" | "read_only" | "scripting" | "intermediate" | "advanced";
```

---

## The Topic Pool

Instead of fixed modules, the system draws from a pool of topics. Each topic has metadata that the course generator uses to build a personalized sequence.

```typescript
// lib/topic-pool.ts

export interface Topic {
  id: string;
  title: string;
  description: string;
  category: TopicCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];              // other topic IDs
  time_estimate_minutes: number;        // for pace planning
  translation_languages: string[];      // languages that have useful comparisons
  relevant_goals: string[];             // which user goals this serves
  concepts: string[];                   // specific concepts covered
  gotchas: string[];                    // Python-specific pitfalls to highlight
  challenges: ChallengeRef[];           // code challenges for this topic
  zep_search_terms: string[];           // queries to find relevant Zep articles
}

type TopicCategory =
  | "syntax"
  | "data_structures"
  | "functions"
  | "oop"
  | "type_system"
  | "error_handling"
  | "async"
  | "testing"
  | "stdlib"
  | "ecosystem"
  | "patterns"
  | "ai_ml";

export const TOPIC_POOL: Topic[] = [

  // ── SYNTAX ─────────────────────────────────────────────
  {
    id: "variables_types",
    title: "Variables & Dynamic Typing",
    description: "How Python's type system works vs statically-typed languages",
    category: "syntax",
    difficulty: 1,
    prerequisites: [],
    time_estimate_minutes: 15,
    translation_languages: ["typescript", "java", "go", "rust"],
    relevant_goals: ["any"],
    concepts: [
      "dynamic typing", "type() and isinstance()", "duck typing",
      "None vs null/undefined", "truthy/falsy differences"
    ],
    gotchas: [
      "No undefined — only None",
      "0, '', [], {}, set(), None are all falsy",
      "isinstance() preferred over type() for checks",
      "Variables are name bindings, not boxes"
    ],
    challenges: [{ id: "types_01", type: "predict" }, { id: "types_02", type: "write" }],
    zep_search_terms: ["python type system", "dynamic typing"],
  },

  {
    id: "strings_fstrings",
    title: "Strings & f-strings",
    description: "String formatting, methods, and f-string power features",
    category: "syntax",
    difficulty: 1,
    prerequisites: [],
    time_estimate_minutes: 15,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "f-strings with expressions", "str methods (split, join, strip, etc.)",
      "raw strings", "multiline strings", "string multiplication",
      "f-string debugging with {expr=}"
    ],
    gotchas: [
      "Strings are immutable (like JS, unlike some expectations)",
      "No string interpolation without f-prefix",
      "f'{value=}' for debug printing (3.8+)"
    ],
    challenges: [{ id: "strings_01", type: "write" }, { id: "strings_02", type: "translate" }],
    zep_search_terms: ["python f-strings", "python string formatting"],
  },

  {
    id: "comprehensions",
    title: "Comprehensions",
    description: "List, dict, set, and generator comprehensions — Python's killer feature",
    category: "syntax",
    difficulty: 2,
    prerequisites: ["variables_types"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript", "java", "go"],
    relevant_goals: ["any"],
    concepts: [
      "list comprehensions", "dict comprehensions", "set comprehensions",
      "nested comprehensions", "conditional comprehensions",
      "generator expressions", "when NOT to use comprehensions"
    ],
    gotchas: [
      "Comprehensions create new scope (unlike for loops)",
      "Generator expressions use () not [] — lazy evaluation",
      "Nested comprehensions read left-to-right like nested for loops",
      "If it needs more than one line, use a regular loop"
    ],
    challenges: [
      { id: "comp_01", type: "translate" },  // TS .map().filter() → comprehension
      { id: "comp_02", type: "write" },
      { id: "comp_03", type: "refactor" }    // nested loops → comprehension
    ],
    zep_search_terms: ["python comprehensions", "list comprehension"],
  },

  {
    id: "unpacking_walrus",
    title: "Unpacking & the Walrus Operator",
    description: "Destructuring, starred expressions, and assignment expressions",
    category: "syntax",
    difficulty: 2,
    prerequisites: ["variables_types"],
    time_estimate_minutes: 15,
    translation_languages: ["typescript", "javascript"],
    relevant_goals: ["any"],
    concepts: [
      "tuple unpacking", "starred unpacking (*rest)",
      "walrus operator (:=)", "swap idiom (a, b = b, a)",
      "unpacking in for loops"
    ],
    gotchas: [
      "JS destructuring uses {} for objects, Python unpacking is positional",
      "Walrus operator := is assignment AND returns the value (like C's =)",
      "Can't use walrus at statement level — it's for expressions only"
    ],
    challenges: [{ id: "unpack_01", type: "translate" }, { id: "unpack_02", type: "write" }],
    zep_search_terms: ["python unpacking", "walrus operator"],
  },

  // ── DATA STRUCTURES ────────────────────────────────────
  {
    id: "lists_tuples",
    title: "Lists & Tuples",
    description: "Mutable vs immutable sequences, slicing, and common patterns",
    category: "data_structures",
    difficulty: 1,
    prerequisites: [],
    time_estimate_minutes: 20,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "list methods (append, extend, insert, pop)",
      "slicing (start:stop:step)", "negative indexing",
      "tuples as immutable records", "named tuples",
      "list vs tuple — when to use which", "shallow vs deep copy"
    ],
    gotchas: [
      "list.sort() mutates in-place and returns None",
      "sorted() returns a new list",
      "Slicing creates a shallow copy",
      "a = b = [] makes both point to SAME list",
      "Tuples with one element need trailing comma: (1,) not (1)"
    ],
    challenges: [
      { id: "list_01", type: "predict" },   // mutation gotcha
      { id: "list_02", type: "write" },      // slicing exercise
    ],
    zep_search_terms: ["python lists tuples", "python slicing"],
  },

  {
    id: "dicts_sets",
    title: "Dicts & Sets",
    description: "Hashmaps, sets, defaultdict, Counter — and Python-specific patterns",
    category: "data_structures",
    difficulty: 2,
    prerequisites: ["variables_types"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "dict methods (get, setdefault, items, values, keys)",
      "dict merge operator (|)", "dict comprehensions",
      "sets and set operations (union, intersection, difference)",
      "defaultdict", "Counter", "OrderedDict (and why you rarely need it now)",
      "dict insertion order guarantee (3.7+)"
    ],
    gotchas: [
      "dict.get(key, default) vs dict[key] — KeyError prevention",
      "Only hashable types can be dict keys or set members",
      "sets are unordered — don't rely on iteration order",
      "{} creates an empty dict, not an empty set — use set()"
    ],
    challenges: [
      { id: "dict_01", type: "write" },     // word frequency counter
      { id: "dict_02", type: "translate" },  // JS Map/Set → Python
    ],
    zep_search_terms: ["python dict", "python collections module"],
  },

  // ── FUNCTIONS ──────────────────────────────────────────
  {
    id: "functions_args",
    title: "Function Arguments",
    description: "Positional, keyword, *args, **kwargs, and argument gotchas",
    category: "functions",
    difficulty: 2,
    prerequisites: ["variables_types"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript", "javascript"],
    relevant_goals: ["any"],
    concepts: [
      "positional vs keyword args", "default arguments",
      "*args and **kwargs", "keyword-only args (after *)",
      "positional-only args (before /)", "argument unpacking in calls"
    ],
    gotchas: [
      "MUTABLE DEFAULT ARGUMENTS — the #1 Python gotcha",
      "def f(lst=[]) shares the same list across calls",
      "Fix: def f(lst=None): lst = lst or []",
      "In Python, * and ** unpack IN CALLS, collect IN DEFINITIONS"
    ],
    challenges: [
      { id: "args_01", type: "predict" },    // mutable default
      { id: "args_02", type: "write" },       // flexible function signature
    ],
    zep_search_terms: ["python function arguments", "args kwargs"],
  },

  {
    id: "closures_decorators",
    title: "Closures & Decorators",
    description: "First-class functions, closures, nonlocal, and the decorator pattern",
    category: "functions",
    difficulty: 3,
    prerequisites: ["functions_args"],
    time_estimate_minutes: 35,
    translation_languages: ["typescript", "javascript"],
    relevant_goals: ["any"],
    concepts: [
      "functions as first-class objects", "closures and nonlocal",
      "decorator syntax (@decorator)", "decorators with arguments",
      "functools.wraps", "common stdlib decorators",
      "stacking decorators"
    ],
    gotchas: [
      "nonlocal is needed to ASSIGN to outer scope variable (not just read)",
      "JS closures 'just work' — Python needs explicit nonlocal for assignment",
      "Decorators execute at import time, not call time",
      "Without @functools.wraps, decorated function loses its name/docstring"
    ],
    challenges: [
      { id: "closure_01", type: "translate" },  // JS closure → Python
      { id: "closure_02", type: "write" },       // write a timing decorator
      { id: "closure_03", type: "write" },       // decorator with arguments
    ],
    zep_search_terms: ["python closures", "python decorators"],
  },

  {
    id: "generators_iterators",
    title: "Generators & Iterators",
    description: "yield, generator expressions, iterator protocol, itertools",
    category: "functions",
    difficulty: 3,
    prerequisites: ["functions_args", "comprehensions"],
    time_estimate_minutes: 30,
    translation_languages: ["typescript", "javascript"],
    relevant_goals: ["any"],
    concepts: [
      "yield and generator functions", "generator expressions",
      "iterator protocol (__iter__, __next__)", "itertools basics",
      "lazy evaluation benefits", "yield from",
      "generator vs list — memory implications"
    ],
    gotchas: [
      "Generators are exhausted after one iteration",
      "JS has function* — Python uses yield in a regular def",
      "Generators can't be indexed or sliced",
      "itertools.chain, islice, groupby — know these exist"
    ],
    challenges: [
      { id: "gen_01", type: "write" },       // fibonacci generator
      { id: "gen_02", type: "refactor" },     // list → generator for memory
    ],
    zep_search_terms: ["python generators", "python itertools"],
  },

  // ── TYPE SYSTEM ────────────────────────────────────────
  {
    id: "type_hints",
    title: "Type Hints & Typing Module",
    description: "Python's optional type system — familiar territory for TS devs",
    category: "type_system",
    difficulty: 2,
    prerequisites: ["variables_types", "functions_args"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript"],
    relevant_goals: ["any"],
    concepts: [
      "basic type annotations", "typing module (List, Dict, Optional, Union)",
      "modern syntax (list[int] vs List[int])", "TypeAlias",
      "Literal types", "TypeVar and generics",
      "mypy basics", "runtime behavior (hints are NOT enforced)"
    ],
    gotchas: [
      "Type hints are IGNORED at runtime — they're for tooling only",
      "This is the opposite of TypeScript where types are compile-time",
      "Optional[X] means Union[X, None], not 'parameter is optional'",
      "Use X | None (3.10+) instead of Optional[X]"
    ],
    challenges: [
      { id: "types_01", type: "translate" },  // TS interface → Python typed dict/dataclass
      { id: "types_02", type: "write" },       // annotate a function with generics
    ],
    zep_search_terms: ["python type hints", "python typing module", "mypy"],
  },

  {
    id: "protocols_abc",
    title: "Protocols & ABCs",
    description: "Structural typing (like TS interfaces) vs nominal typing in Python",
    category: "type_system",
    difficulty: 3,
    prerequisites: ["type_hints", "oop_classes"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript", "go"],
    relevant_goals: ["any"],
    concepts: [
      "Protocol class (structural subtyping)", "ABC and abstractmethod",
      "Protocol vs ABC — when to use which",
      "runtime_checkable Protocol",
      "how Protocol maps to TS interfaces/Go interfaces"
    ],
    gotchas: [
      "Protocol is structural (like TS) — no explicit implements needed",
      "ABC is nominal — must explicitly inherit",
      "Protocols are the Pythonic way to do TS-style interfaces",
      "@runtime_checkable adds isinstance() support but has limitations"
    ],
    challenges: [
      { id: "protocol_01", type: "translate" },  // TS interface → Protocol
      { id: "protocol_02", type: "write" },       // define and use a Protocol
    ],
    zep_search_terms: ["python protocol", "python abstract base class"],
  },

  // ── OOP ────────────────────────────────────────────────
  {
    id: "oop_classes",
    title: "Classes & Dataclasses",
    description: "Python OOP, dunder methods, and dataclasses for everyday use",
    category: "oop",
    difficulty: 2,
    prerequisites: ["functions_args"],
    time_estimate_minutes: 30,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "class definition and __init__", "self (explicit, not implicit like JS this)",
      "class vs instance attributes", "dataclasses",
      "@dataclass fields, defaults, frozen",
      "common dunder methods (__str__, __repr__, __eq__, __hash__)",
      "__slots__ for memory optimization"
    ],
    gotchas: [
      "self is explicit everywhere — not optional like JS this",
      "Class-level mutable attributes are SHARED across instances",
      "dataclass is preferred over manual __init__ for data containers",
      "__repr__ is for developers, __str__ is for users"
    ],
    challenges: [
      { id: "class_01", type: "translate" },  // TS class → Python class
      { id: "class_02", type: "write" },       // dataclass with custom methods
    ],
    zep_search_terms: ["python classes", "python dataclasses", "dunder methods"],
  },

  {
    id: "inheritance_composition",
    title: "Inheritance, MRO & Composition",
    description: "Multiple inheritance, MRO, mixins, and why composition usually wins",
    category: "oop",
    difficulty: 3,
    prerequisites: ["oop_classes"],
    time_estimate_minutes: 25,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "single vs multiple inheritance", "MRO (method resolution order)",
      "super() and cooperative inheritance", "mixins",
      "composition over inheritance pattern",
      "Python's approach vs Java/TS (no interfaces needed — use Protocol)"
    ],
    gotchas: [
      "Python supports multiple inheritance — most languages don't",
      "MRO follows C3 linearization — use ClassName.mro() to inspect",
      "super() in multiple inheritance can be surprising",
      "Prefer composition + Protocol over deep inheritance hierarchies"
    ],
    challenges: [
      { id: "inherit_01", type: "predict" },  // MRO question
      { id: "inherit_02", type: "write" },     // composition pattern
    ],
    zep_search_terms: ["python inheritance", "python MRO", "composition vs inheritance"],
  },

  // ── ERROR HANDLING ─────────────────────────────────────
  {
    id: "exceptions",
    title: "Exception Handling",
    description: "try/except patterns, exception hierarchy, and custom exceptions",
    category: "error_handling",
    difficulty: 2,
    prerequisites: ["functions_args"],
    time_estimate_minutes: 20,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any"],
    concepts: [
      "try/except/else/finally", "exception hierarchy",
      "catching specific exceptions", "raising exceptions",
      "custom exception classes", "exception chaining (from)",
      "EAFP vs LBYL philosophy"
    ],
    gotchas: [
      "Python prefers EAFP (ask forgiveness) vs JS LBYL (look before you leap)",
      "Bare except: catches EVERYTHING including KeyboardInterrupt — never do this",
      "else block runs only if no exception was raised — useful for 'happy path'",
      "Exception chaining: raise NewError() from original_error"
    ],
    challenges: [
      { id: "except_01", type: "write" },     // proper exception handling
      { id: "except_02", type: "write" },      // custom exception hierarchy
    ],
    zep_search_terms: ["python exceptions", "python error handling", "EAFP"],
  },

  {
    id: "context_managers",
    title: "Context Managers",
    description: "with statement, __enter__/__exit__, contextlib, and resource management",
    category: "error_handling",
    difficulty: 3,
    prerequisites: ["exceptions", "oop_classes"],
    time_estimate_minutes: 20,
    translation_languages: ["typescript"],
    relevant_goals: ["any"],
    concepts: [
      "with statement", "__enter__ and __exit__",
      "contextlib.contextmanager decorator",
      "multiple context managers", "async context managers",
      "common uses (files, locks, DB connections, temp resources)"
    ],
    gotchas: [
      "No equivalent in JS — using/Symbol.dispose is new and limited",
      "with guarantees cleanup even if exception occurs",
      "@contextmanager + yield is the easy way to write one",
      "__exit__ receives exception info — can suppress by returning True"
    ],
    challenges: [
      { id: "ctx_01", type: "write" },         // contextmanager decorator
      { id: "ctx_02", type: "write" },          // class-based context manager
    ],
    zep_search_terms: ["python context managers", "python with statement"],
  },

  // ── ASYNC ──────────────────────────────────────────────
  {
    id: "async_fundamentals",
    title: "Async Python Fundamentals",
    description: "asyncio, async/await — and the critical differences from JS async",
    category: "async",
    difficulty: 3,
    prerequisites: ["functions_args", "exceptions"],
    time_estimate_minutes: 35,
    translation_languages: ["typescript", "javascript"],
    relevant_goals: ["any", "web_dev", "ai_ml"],
    concepts: [
      "coroutines vs regular functions", "await and async def",
      "asyncio.run() — the entry point", "asyncio.gather() for concurrency",
      "asyncio.create_task()", "event loop (implicit vs JS explicit)",
      "async for / async with", "asyncio vs threading vs multiprocessing"
    ],
    gotchas: [
      "BIGGEST DIFFERENCE: Python async is NOT like JS async",
      "JS: all I/O is async by default. Python: sync by default, async is opt-in",
      "Calling an async function returns a coroutine object, doesn't run it",
      "asyncio.run() creates the event loop — there's no top-level await (mostly)",
      "You can't mix sync and async easily — it's all or nothing (colored functions problem)",
      "asyncio.gather() ≈ Promise.all()"
    ],
    challenges: [
      { id: "async_01", type: "predict" },    // what happens without await
      { id: "async_02", type: "translate" },   // JS Promise.all → asyncio.gather
      { id: "async_03", type: "write" },        // concurrent HTTP-like fetches
    ],
    zep_search_terms: ["python asyncio", "python async await", "asyncio vs javascript"],
  },

  // ── TESTING ────────────────────────────────────────────
  {
    id: "testing_pytest",
    title: "Testing with pytest",
    description: "pytest fundamentals — fixtures, parametrize, mocking, and TDD patterns",
    category: "testing",
    difficulty: 2,
    prerequisites: ["functions_args"],
    time_estimate_minutes: 30,
    translation_languages: ["typescript"],
    relevant_goals: ["any", "job_requirement"],
    concepts: [
      "pytest basics (test_ functions, assert)", "fixtures and conftest.py",
      "parametrize for table-driven tests", "mocking with unittest.mock",
      "pytest.raises for exception testing", "markers and skipping",
      "test organization and naming conventions"
    ],
    gotchas: [
      "pytest uses plain assert — no assertEqual/assertTrue needed",
      "Fixtures are dependency injection, not setup/teardown (though they can do both)",
      "conftest.py fixtures are auto-discovered — no imports needed",
      "Mock vs patch — patch replaces WHERE IT'S USED, not where it's defined"
    ],
    challenges: [
      { id: "test_01", type: "write" },       // write tests for a function
      { id: "test_02", type: "write" },        // fixture + parametrize
    ],
    zep_search_terms: ["python pytest", "python testing", "pytest fixtures"],
  },

  // ── ECOSYSTEM ──────────────────────────────────────────
  {
    id: "virtual_envs",
    title: "Virtual Environments & Package Management",
    description: "venv, pip, uv, pyproject.toml — Python's packaging story",
    category: "ecosystem",
    difficulty: 1,
    prerequisites: [],
    time_estimate_minutes: 20,
    translation_languages: ["typescript"],
    relevant_goals: ["any"],
    concepts: [
      "why virtual environments exist (vs node_modules)",
      "venv and activation", "pip install and requirements.txt",
      "pyproject.toml (modern standard)", "uv — the fast modern tool",
      "system Python vs project Python"
    ],
    gotchas: [
      "No node_modules equivalent — packages install globally unless you use a venv",
      "ALWAYS use a virtual environment — never pip install into system Python",
      "uv is the modern answer: fast, handles venvs + packages + Python versions",
      "requirements.txt is legacy — pyproject.toml is the standard now"
    ],
    challenges: [
      { id: "env_01", type: "explain" },      // conceptual, not executable in Pyodide
    ],
    zep_search_terms: ["python virtual environments", "python packaging", "uv python"],
  },

  {
    id: "stdlib_essentials",
    title: "Standard Library Power Tools",
    description: "pathlib, json, datetime, collections, itertools — the batteries included",
    category: "stdlib",
    difficulty: 2,
    prerequisites: ["variables_types", "dicts_sets"],
    time_estimate_minutes: 25,
    translation_languages: [],
    relevant_goals: ["any"],
    concepts: [
      "pathlib.Path (not os.path)", "json.loads/dumps",
      "datetime and timedelta", "collections (defaultdict, Counter, deque, namedtuple)",
      "itertools (chain, groupby, combinations, permutations)",
      "functools (lru_cache, partial, reduce)"
    ],
    gotchas: [
      "Use pathlib, not os.path — it's the modern way",
      "json.dumps/loads, not json.dump/load (those are for files)",
      "datetime is notoriously annoying — consider using a library for complex cases",
      "collections.Counter is magical for frequency problems"
    ],
    challenges: [
      { id: "stdlib_01", type: "write" },     // pathlib file processing
      { id: "stdlib_02", type: "write" },      // Counter + defaultdict problem
    ],
    zep_search_terms: ["python standard library", "python pathlib", "python collections"],
  },

  // ── PATTERNS ───────────────────────────────────────────
  {
    id: "pythonic_patterns",
    title: "Pythonic Patterns & Idioms",
    description: "Writing code that looks like Python, not translated Java/JS",
    category: "patterns",
    difficulty: 2,
    prerequisites: ["comprehensions", "functions_args"],
    time_estimate_minutes: 20,
    translation_languages: ["typescript", "java"],
    relevant_goals: ["any", "job_requirement"],
    concepts: [
      "enumerate() instead of range(len())", "zip() for parallel iteration",
      "any() and all()", "dictionary dispatch (replacing switch/case)",
      "match/case (3.10+, structural pattern matching)",
      "_ as throwaway variable", "the Pythonic vs un-Pythonic spectrum"
    ],
    gotchas: [
      "for i in range(len(lst)): lst[i] — this screams 'I learned another language first'",
      "match/case is NOT switch/case — it's structural pattern matching",
      "Pythonic code values readability over cleverness"
    ],
    challenges: [
      { id: "idiom_01", type: "refactor" },   // un-Pythonic → Pythonic
      { id: "idiom_02", type: "write" },       // match/case
    ],
    zep_search_terms: ["pythonic code", "python idioms", "python best practices"],
  },

  // ── AI/ML ──────────────────────────────────────────────
  {
    id: "ai_sdk_patterns",
    title: "Working with AI APIs in Python",
    description: "OpenAI, Anthropic, and Google AI SDK patterns — streaming, tool use, structured output",
    category: "ai_ml",
    difficulty: 3,
    prerequisites: ["functions_args", "async_fundamentals", "type_hints"],
    time_estimate_minutes: 35,
    translation_languages: ["typescript"],
    relevant_goals: ["ai_ml", "ai_engineer"],
    concepts: [
      "OpenAI SDK patterns", "Anthropic SDK patterns",
      "streaming responses", "tool/function calling",
      "structured output with Pydantic", "token counting and management",
      "error handling and retries", "async SDK usage"
    ],
    gotchas: [
      "Python SDKs are first-class citizens for all AI providers",
      "Streaming in Python uses generators/async generators",
      "Pydantic is the standard for structured output parsing",
      "Type hints matter here — SDKs use them extensively"
    ],
    challenges: [
      { id: "ai_01", type: "write" },         // basic API call pattern
      { id: "ai_02", type: "write" },          // streaming handler
    ],
    zep_search_terms: ["python AI SDK", "openai python", "anthropic python sdk"],
  },

  {
    id: "data_processing",
    title: "Data Processing Patterns",
    description: "CSV, pandas basics, data pipelines — for the data-curious",
    category: "ai_ml",
    difficulty: 2,
    prerequisites: ["dicts_sets", "comprehensions"],
    time_estimate_minutes: 30,
    translation_languages: [],
    relevant_goals: ["ai_ml", "data_science", "automation"],
    concepts: [
      "csv module basics", "pandas DataFrame intro",
      "reading/writing data files", "basic data transformations",
      "groupby and aggregation", "data cleaning patterns"
    ],
    gotchas: [
      "pandas is heavy — don't use it for simple tasks",
      "DataFrames are not dicts — they have their own API",
      "polars is the faster modern alternative"
    ],
    challenges: [
      { id: "data_01", type: "write" },       // csv processing
      { id: "data_02", type: "write" },        // basic pandas
    ],
    zep_search_terms: ["python pandas", "python data processing"],
  },
];
```

---

## Custom Course Generation

The course generator takes the user profile and builds a personalized learning path from the topic pool.

### How It Works

```typescript
// lib/course-generator.ts

interface CoursePlan {
  id: string;
  user_id: string;
  title: string;                        // AI-generated course title
  description: string;                  // Brief summary of what this course covers and why
  topics: CourseTopic[];                // ordered sequence
  estimated_total_minutes: number;
  generated_at: string;
  revised_at: string | null;            // updated if course plan changes mid-stream
}

interface CourseTopic {
  topic_id: string;                     // references TOPIC_POOL
  order: number;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  reason_included: string;              // AI explains why: "You mentioned wanting to use Python for AI — this covers SDK patterns"
  reason_skipped?: string;              // If skipped: "You demonstrated this in assessment"
  estimated_minutes: number;
  depth: "overview" | "standard" | "deep_dive";  // how much time to spend
  custom_focus?: string;                // AI-generated note: "Focus on asyncio.gather since you know Promise.all"
}
```

### Generation Prompt

```typescript
// lib/course-generator.ts

export function buildCourseGenerationPrompt(
  profile: UserProfile,
  topicPool: Topic[],
  zepContext: string          // relevant articles from Zep
): string {
  return `You are building a personalized Python course for this developer.

## Student Profile
- Languages: ${profile.known_languages.join(', ')} (primary: ${profile.primary_language})
- Experience: ${profile.years_experience} years professional
- Python level: ${profile.python_level}
- Confirmed skills: ${profile.confirmed_skills.join(', ') || 'none assessed'}
- Identified gaps: ${profile.identified_gaps.join(', ') || 'none identified'}
- Goals: ${profile.goals.join(', ')}
- Pace: ${profile.pace_preference}

## Available Topics
${JSON.stringify(topicPool.map(t => ({
  id: t.id, title: t.title, difficulty: t.difficulty,
  prerequisites: t.prerequisites, category: t.category,
  relevant_goals: t.relevant_goals, time: t.time_estimate_minutes
})), null, 2)}

## Relevant Resources from Knowledge Base
${zepContext}

## Instructions
Build a course plan as a JSON array of topics. For each topic, decide:
1. INCLUDE or SKIP — skip if the student clearly already knows it
2. ORDER — respect prerequisites, but also prioritize their goals
3. DEPTH — "overview" (5min, they mostly know this), "standard" (full topic), or "deep_dive" (extra challenges, they need this)
4. CUSTOM_FOCUS — a sentence about what to emphasize given their background

Rules:
- A course should be 6-15 topics. Not every topic needs to be included.
- Put goal-relevant topics earlier (after prerequisites are met)
- If they're pace=fast, prefer overview depth and fewer topics
- If they're pace=thorough, include more topics at standard/deep_dive depth
- Always include at least one topic they'll find challenging
- For "${profile.primary_language}" developers, prioritize topics with translation_languages including "${profile.primary_language}"

Return valid JSON matching the CourseTopic[] type.`;
}
```

### Course Revision

The course plan isn't static. After every 3 completed topics, or if the user struggles (>2 failed challenges on a topic), the system re-evaluates:

```typescript
// lib/course-generator.ts

export async function shouldReviseCourse(
  plan: CoursePlan,
  recentProgress: TopicProgress[]
): Promise<{ revise: boolean; reason: string }> {
  const completedTopics = recentProgress.filter(p => p.status === "completed");
  const struggles = recentProgress.filter(p => p.failed_attempts >= 2);

  if (struggles.length > 0) {
    return {
      revise: true,
      reason: `Student struggled with: ${struggles.map(s => s.topic_id).join(', ')}. May need prerequisite topics added or depth adjusted.`
    };
  }

  if (completedTopics.length >= 3) {
    const avgScore = completedTopics.reduce((s, p) => s + p.score, 0) / completedTopics.length;
    if (avgScore > 90) {
      return {
        revise: true,
        reason: `Student averaging ${avgScore} — course may be too easy. Consider increasing depth or skipping easier upcoming topics.`
      };
    }
  }

  return { revise: false, reason: "" };
}
```

---

## Code Challenges

Each topic has 1-3 challenges. These are structured so the AI can present them and evaluate responses.

```typescript
// lib/challenges.ts

export interface Challenge {
  id: string;
  topic_id: string;
  type: "predict" | "write" | "translate" | "refactor" | "explain";
  difficulty: 1 | 2 | 3;
  title: string;
  prompt: string;                       // shown to user
  starter_code?: string;                // optional code scaffold
  source_code?: string;                 // for "predict" and "translate" types
  source_language?: string;             // for "translate" type
  expected_concepts: string[];          // what correct answer demonstrates
  evaluation_criteria: string;          // instructions for AI evaluator
  hints: string[];                      // progressive hints if user is stuck
}

// Example challenges:

export const CHALLENGES: Challenge[] = [
  {
    id: "comp_01",
    topic_id: "comprehensions",
    type: "translate",
    difficulty: 1,
    title: "Map & Filter → Comprehension",
    prompt: "Convert this TypeScript to a Python one-liner using a list comprehension:",
    source_code: `const evens = numbers
  .filter(n => n % 2 === 0)
  .map(n => n * n);`,
    source_language: "typescript",
    expected_concepts: ["list_comprehension", "conditional_comprehension"],
    evaluation_criteria: `Correct if: uses [n**2 for n in numbers if n % 2 == 0] or equivalent.
      Also accept: [n*n ...]. Accept ** or * for squaring.
      Incorrect if: uses filter() and map() functions instead of comprehension.`,
    hints: [
      "In Python, a list comprehension combines map and filter into one expression",
      "The pattern is: [expression for item in iterable if condition]",
    ],
  },

  {
    id: "args_01",
    topic_id: "functions_args",
    type: "predict",
    difficulty: 2,
    title: "The Mutable Default Trap",
    prompt: "What does this print? Explain why.",
    source_code: `def add_item(item, lst=[]):
    lst.append(item)
    return lst

print(add_item("a"))
print(add_item("b"))
print(add_item("c"))`,
    expected_concepts: ["mutable_defaults", "function_internals"],
    evaluation_criteria: `Correct if: identifies that output is ['a'], ['a', 'b'], ['a', 'b', 'c']
      and explains that the default list is created ONCE at function definition time,
      shared across all calls. Partial credit for getting output right without explanation.`,
    hints: [
      "Default arguments in Python are evaluated once — when the function is defined, not when it's called",
      "Think about what happens if the same list object is reused between calls",
    ],
  },

  {
    id: "closure_02",
    topic_id: "closures_decorators",
    type: "write",
    difficulty: 2,
    title: "Write a Timing Decorator",
    prompt: `Write a decorator called @timed that prints how long a function took to execute.
It should work with any function, preserve the original function's name, and print the time in milliseconds.`,
    starter_code: `import time
from functools import wraps

def timed(func):
    # your code here
    pass

@timed
def slow_function():
    time.sleep(0.1)
    return "done"

result = slow_function()
print(result)  # should print "done"
# should also print something like "slow_function took 100.23ms"`,
    expected_concepts: ["decorators", "functools.wraps", "closures", "time_module"],
    evaluation_criteria: `Correct if:
      1. Uses @wraps(func) to preserve function metadata
      2. Measures time before/after func() call
      3. Prints function name and elapsed time
      4. Returns the original function's return value
      Acceptable: any timing method (time.time(), time.perf_counter(), etc.)`,
    hints: [
      "A decorator is a function that takes a function and returns a new function",
      "Use @functools.wraps(func) on your inner function to preserve the original name",
      "time.perf_counter() gives the most accurate timing",
    ],
  },

  {
    id: "async_02",
    topic_id: "async_fundamentals",
    type: "translate",
    difficulty: 3,
    title: "Promise.all → asyncio",
    prompt: "Convert this JavaScript to Python using asyncio:",
    source_code: `async function fetchAll() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users').then(r => r.json()),
    fetch('/api/posts').then(r => r.json()),
    fetch('/api/comments').then(r => r.json()),
  ]);
  return { users, posts, comments };
}`,
    source_language: "javascript",
    expected_concepts: ["asyncio.gather", "async_def", "await", "coroutines"],
    evaluation_criteria: `Correct if:
      1. Uses async def
      2. Uses asyncio.gather() for concurrent execution
      3. Properly awaits results
      4. Returns combined result (dict, tuple, or dataclass)
      Note: They won't have aiohttp in Pyodide, so accept any simulated async functions.`,
    hints: [
      "asyncio.gather() is Python's equivalent of Promise.all()",
      "Each fetch would be its own async function in Python",
      "You can unpack gather results: a, b, c = await asyncio.gather(...)",
    ],
  },
];
```

---

## Zep Knowledge Base Integration

Zep stores curated articles and learning resources. The app searches Zep to enrich the AI's teaching context and surface relevant reading material.

### Architecture

```typescript
// lib/zep.ts
import { ZepClient } from "@getzep/zep-cloud";

const zep = new ZepClient({ apiKey: process.env.ZEP_API_KEY });

const SESSION_ID = process.env.ZEP_SESSION_ID;  // the session with your curated articles

// Search for articles relevant to the current topic
export async function searchTopicResources(topic: Topic): Promise<ZepResource[]> {
  const results = await Promise.all(
    topic.zep_search_terms.map(term =>
      zep.memory.search(SESSION_ID, { text: term, limit: 3 })
    )
  );

  // Deduplicate and rank
  const seen = new Set<string>();
  const resources: ZepResource[] = [];
  for (const batch of results) {
    for (const result of batch) {
      if (!seen.has(result.message.uuid)) {
        seen.add(result.message.uuid);
        resources.push({
          content: result.message.content,
          relevance: result.score,
          metadata: result.metadata,
        });
      }
    }
  }

  return resources.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// Get graph context for enriching the AI instructor
export async function getGraphContext(topic: Topic): Promise<string> {
  // Search the knowledge graph for related entities
  const nodes = await zep.graph.search({
    query: topic.title,
    limit: 10,
  });

  return nodes
    .map(n => `- ${n.name}: ${n.summary || n.fact}`)
    .join('\n');
}

// Store a learning milestone (optional — enriches future sessions)
export async function storeLearningMilestone(
  userId: string,
  topicId: string,
  outcome: string
): Promise<void> {
  await zep.memory.add(SESSION_ID, {
    messages: [{
      role: "system",
      content: `User ${userId} completed topic "${topicId}": ${outcome}`,
      role_type: "system",
    }],
  });
}
```

### How Zep Enriches the AI Instructor

When teaching a topic, the system prompt includes relevant Zep content:

```typescript
// In the chat route, before calling Gemini:
const zepResources = await searchTopicResources(currentTopic);
const graphContext = await getGraphContext(currentTopic);

const enrichedPrompt = buildTeachingPrompt(currentTopic, userProfile, {
  articles: zepResources.map(r => r.content).join('\n---\n'),
  graphFacts: graphContext,
});
```

### Resource Panel (Frontend)

The `ResourcePanel.tsx` component shows relevant articles alongside the lesson:

```typescript
// GET /api/knowledge?topicId=comprehensions
// Returns: { resources: [{ title, summary, relevance }] }
// Displayed in a collapsible side panel during each topic
```

---

## AI Instructor System

### Teaching Prompt (per topic)

```typescript
// lib/prompts.ts

export function buildTeachingPrompt(
  topic: Topic,
  profile: UserProfile,
  courseTopic: CourseTopic,
  zepContext: { articles: string; graphFacts: string }
): string {
  const translationLang = topic.translation_languages.includes(profile.primary_language)
    ? profile.primary_language
    : null;

  return `You are a Python instructor for an experienced ${profile.primary_language} developer.
Their Python level: ${profile.python_level}
This topic's depth: ${courseTopic.depth}
${courseTopic.custom_focus ? `Special focus: ${courseTopic.custom_focus}` : ''}

## Topic: ${topic.title}
${topic.description}

## Concepts to Cover (in order)
${topic.concepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Gotchas to Highlight
${topic.gotchas.map(g => `- ${g}`).join('\n')}

${translationLang ? `## Translation Mode
Show ${translationLang} → Python comparisons when introducing new syntax.
Format as:
\`\`\`${translationLang}
// ${translationLang} way
\`\`\`
\`\`\`python
# Python way
\`\`\`
` : ''}

## Relevant Resources (from knowledge base)
${zepContext.articles || 'No specific articles available for this topic.'}

## Graph Context
${zepContext.graphFacts || 'No additional context.'}

## Teaching Rules
- Depth is "${courseTopic.depth}":
  - "overview": Hit key points fast, 1 challenge, assume they'll pick up details as they code
  - "standard": Cover all concepts, 2 challenges, explain gotchas
  - "deep_dive": Thorough treatment, all challenges, extra edge cases, more practice
- Start with the MOST Python-specific concept, not the familiar parts
- One concept at a time. Explain → example → challenge. Don't dump everything.
- Challenges: present them one at a time. Wait for the user to attempt before moving on.
- Be direct. No "Great question!" No "That's a common concern!" Just teach.
- Keep explanations under 150 words unless showing code.
- If the user gets a challenge right quickly, move to the next concept without belaboring it.
- If they struggle, provide hints from the challenge's hint list before giving the answer.
- Reference knowledge base articles when relevant: "For more on this, check out [article name]"

## Completion Signaling
When all concepts for this topic have been covered and the user has passed the challenges,
respond with your final summary AND call the "complete_topic" function with a score (0-100)
and brief assessment.`;
}
```

### Structured Completion (Function Calling, Not Sentinel Tokens)

Instead of the fragile `[MODULE_COMPLETE]` sentinel, use Gemini's function calling:

```typescript
// lib/ai.ts

export const AI_TOOLS = [
  {
    name: "complete_topic",
    description: "Call this when the student has demonstrated understanding of all concepts in the current topic",
    parameters: {
      type: "object",
      properties: {
        score: {
          type: "number",
          description: "0-100 score based on challenge performance and understanding demonstrated"
        },
        assessment: {
          type: "string",
          description: "Brief assessment of what the student understood well and any remaining gaps"
        },
        struggles: {
          type: "array",
          items: { type: "string" },
          description: "Specific concepts the student struggled with, if any"
        }
      },
      required: ["score", "assessment"]
    }
  },
  {
    name: "present_challenge",
    description: "Present a code challenge to the student",
    parameters: {
      type: "object",
      properties: {
        challenge_id: { type: "string" },
        type: { type: "string", enum: ["predict", "write", "translate", "refactor", "explain"] }
      },
      required: ["challenge_id", "type"]
    }
  },
  {
    name: "evaluate_code",
    description: "Evaluate the student's code submission for the current challenge",
    parameters: {
      type: "object",
      properties: {
        passed: { type: "boolean" },
        feedback: { type: "string" },
        hint_level: {
          type: "number",
          description: "If not passed, which hint level to provide next (1, 2, or 3)"
        }
      },
      required: ["passed", "feedback"]
    }
  }
];
```

### Conversation History Management

```typescript
// lib/ai.ts

export function prepareHistory(
  messages: ChatMessage[],
  maxTokenBudget: number = 4000
): ChatMessage[] {
  if (messages.length <= 10) return messages;

  // Keep first 2 messages (topic intro + first response) for context
  const intro = messages.slice(0, 2);

  // Keep last 8 messages for recency
  const recent = messages.slice(-8);

  // Summarize the middle if it exists
  const middle = messages.slice(2, -8);
  if (middle.length > 0) {
    const summary: ChatMessage = {
      role: "system",
      content: `[Earlier in this conversation: ${middle.length} messages covering ${
        summarizeTopics(middle)
      }. The student has been working through the topic progressively.]`,
    };
    return [...intro, summary, ...recent];
  }

  return [...intro, ...recent];
}
```

---

## Database Schema (Turso/SQLite)

```sql
-- User profile (built from assessment)
CREATE TABLE user_profile (
  id TEXT PRIMARY KEY,                   -- Clerk user ID
  known_languages TEXT DEFAULT '[]',     -- JSON: ["typescript", "javascript", "react"]
  primary_language TEXT DEFAULT '',      -- main comparison language for translations
  years_experience INTEGER DEFAULT 0,
  python_level TEXT DEFAULT 'none',      -- none/read_only/scripting/intermediate/advanced
  confirmed_skills TEXT DEFAULT '[]',    -- JSON: topics verified in assessment
  identified_gaps TEXT DEFAULT '[]',     -- JSON: topics they struggled with
  goals TEXT DEFAULT '[]',              -- JSON: ["ai_ml", "job_requirement"]
  pace_preference TEXT DEFAULT 'standard', -- fast/thorough
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Custom course plan per user
CREATE TABLE course_plan (
  id TEXT PRIMARY KEY,                   -- UUID
  user_id TEXT REFERENCES user_profile(id),
  title TEXT NOT NULL,                   -- AI-generated course title
  description TEXT DEFAULT '',
  topics TEXT NOT NULL,                  -- JSON: CourseTopic[] ordered sequence
  estimated_total_minutes INTEGER,
  generated_at TEXT DEFAULT (datetime('now')),
  revised_at TEXT,
  revision_count INTEGER DEFAULT 0
);

-- Progress per topic within a course
CREATE TABLE topic_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES user_profile(id),
  course_id TEXT REFERENCES course_plan(id),
  topic_id TEXT NOT NULL,                -- references TOPIC_POOL
  status TEXT DEFAULT 'locked',          -- locked/available/in_progress/completed/skipped
  score INTEGER,                         -- 0-100 from AI evaluation
  ai_assessment TEXT,                    -- AI's notes on performance
  struggles TEXT DEFAULT '[]',           -- JSON: concepts they struggled with
  started_at TEXT,
  completed_at TEXT,
  challenge_attempts INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0
);

-- Conversation history (per topic session)
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES user_profile(id),
  topic_id TEXT NOT NULL,
  role TEXT NOT NULL,                    -- user/assistant/system
  content TEXT NOT NULL,
  function_call TEXT,                    -- JSON: if AI used a function call
  created_at TEXT DEFAULT (datetime('now'))
);

-- Code submissions (linked to challenges)
CREATE TABLE code_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES user_profile(id),
  topic_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL,
  code TEXT NOT NULL,
  output TEXT,
  passed BOOLEAN DEFAULT FALSE,
  ai_feedback TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Assessment conversation (stored separately for course re-generation)
CREATE TABLE assessment_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES user_profile(id),
  conversation TEXT NOT NULL,           -- JSON: full assessment chat
  code_probe_results TEXT,              -- JSON: { probe_id: { passed, response } }
  raw_profile TEXT,                     -- JSON: AI's raw analysis before structuring
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## API Routes (Detailed)

### POST /api/assess

Two-phase endpoint. First call starts the assessment, subsequent calls continue it.

```typescript
// Phase 1: Start or continue conversational assessment
body: {
  message: string,                     // user's response
  phase: "conversation" | "code_probe", // which phase we're in
  history: Message[],                  // conversation so far
}
response: {
  reply: string,                       // AI's next question or probe
  phase: "conversation" | "code_probe" | "complete",
  probeCode?: string,                  // if presenting a code probe
  probeType?: string,                  // predict/write/translate
}

// Phase 2: Assessment complete — generate profile + course
// (triggered when phase returns "complete")
body: {
  phase: "generate",
  assessmentData: {
    conversation: Message[],
    probeResults: ProbeResult[],
  }
}
response: {
  profile: UserProfile,
  coursePlan: CoursePlan,
}
```

### POST /api/chat (Streaming)

```typescript
// Streaming AI conversation for a topic
body: {
  topicId: string,
  message: string,
  codeSubmission?: {                   // if user is submitting code for a challenge
    code: string,
    output: string,
    challengeId: string,
  }
}
response: ReadableStream               // SSE stream of AI response chunks

// Stream events:
// data: {"type": "text", "content": "..."}
// data: {"type": "function_call", "name": "complete_topic", "args": {...}}
// data: {"type": "function_call", "name": "evaluate_code", "args": {...}}
// data: {"type": "done"}
```

### GET/PATCH /api/course

```typescript
// Get user's course plan
GET /api/course
response: {
  plan: CoursePlan,
  progress: TopicProgress[],
  nextTopic: CourseTopic | null,
}

// Update course (e.g., user wants to skip a topic or add one)
PATCH /api/course
body: {
  action: "skip_topic" | "add_topic" | "reorder" | "regenerate",
  topicId?: string,
  reason?: string,
}
response: {
  plan: CoursePlan,                    // updated plan
}
```

### GET /api/knowledge

```typescript
// Search Zep for topic-relevant articles
GET /api/knowledge?topicId=comprehensions
response: {
  resources: [{
    title: string,
    summary: string,
    content: string,
    relevance: number,
    source: string,
  }],
  graphContext: string,                // related facts from Zep knowledge graph
}
```

### POST /api/evaluate

```typescript
// AI evaluates a code submission against challenge criteria
body: {
  challengeId: string,
  code: string,
  output: string,                      // from Pyodide execution
  topicId: string,
}
response: {
  passed: boolean,
  score: number,                       // 0-100
  feedback: string,
  hint?: string,                       // next hint if not passed
  conceptsDemo: string[],             // which concepts the code demonstrates
}
```

---

## Pyodide Integration (CodeEditor.tsx)

```typescript
// CodeMirror 6 editor + Pyodide runtime
// Key patterns:

// 1. Eager loading — start when user enters /learn
const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
const [pyReady, setPyReady] = useState(false);

useEffect(() => {
  async function loadPy() {
    const py = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.0/full/",
    });
    setPyodide(py);
    setPyReady(true);
  }
  loadPy();
}, []);

// 2. Run code with stdout capture + timeout
async function runCode(code: string, timeoutMs = 5000): Promise<RunResult> {
  if (!pyodide) return { output: "", error: "Python is still loading..." };

  try {
    // Reset stdout/stderr
    pyodide.runPython(`
      import sys, io
      sys.stdout = io.StringIO()
      sys.stderr = io.StringIO()
    `);

    // Run with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Code execution timed out (5s limit)")), timeoutMs)
    );

    await Promise.race([
      pyodide.runPythonAsync(code),
      timeoutPromise
    ]);

    const stdout = pyodide.runPython("sys.stdout.getvalue()");
    const stderr = pyodide.runPython("sys.stderr.getvalue()");

    return {
      output: stdout,
      error: stderr || null,
    };
  } catch (err: any) {
    return {
      output: null,
      error: err.message,
    };
  }
}

// 3. Starter code injection for challenges
function loadChallenge(challenge: Challenge) {
  if (challenge.starter_code) {
    setEditorContent(challenge.starter_code);
  }
  if (challenge.source_code && challenge.type === "predict") {
    setEditorContent(challenge.source_code);
    setEditorReadOnly(true);  // they should predict, not modify
  }
}
```

**Pyodide load time:** ~8MB, 3-5 seconds. Show skeleton UI + "Loading Python runtime..." indicator. Initialize on route entry, not on first code run.

**Pyodide limitations to handle:**
- No filesystem access (for pathlib topic, simulate with in-memory)
- No pip install (for topics mentioning external packages, show code patterns without execution)
- No async event loop running (for async topic, use `asyncio.run()` wrapper)
- No network access (for AI API topic, simulate responses)

---

## Frontend Component Architecture

```
learn/page.tsx (layout shell)
├── AssessmentChat.tsx     — shown on first visit, full-screen conversational assessment
├── CoursePlan.tsx         — shown after assessment, lets user review/adjust plan
└── LearningInterface.tsx  — main view after course plan is accepted
    ├── Sidebar.tsx         — course plan topics, progress indicators, collapse/expand
    ├── MainPanel.tsx       — split view:
    │   ├── ChatPane.tsx    — streaming AI conversation (top/left)
    │   └── CodeEditor.tsx  — CodeMirror + run button + output (bottom/right)
    └── ResourcePanel.tsx   — collapsible right panel, Zep articles

State flow:
1. /learn → check if user has a course plan
2. No plan → AssessmentChat (full screen)
3. Assessment done → CoursePlan review (can adjust before starting)
4. Plan accepted → LearningInterface with first available topic loaded
5. Topic complete → auto-advance to next available topic
6. All topics done → completion summary + optional course revision for deeper learning
```

---

## Build Phases

### Phase 1: Foundation (Days 1-2)
1. Next.js scaffold + Tailwind + CodeMirror setup
2. Pyodide integration (load, run, display output)
3. Gemini client with streaming + function calling
4. Turso schema seed + basic DB operations
5. Clerk auth middleware

### Phase 2: Assessment & Course Generation (Days 3-4)
1. AssessmentChat component — conversational UI
2. Assessment prompt engineering — question flow + code probes
3. Profile generation from assessment data
4. Course generator — AI builds a custom plan from topic pool
5. CoursePlan review component
6. Zep client + knowledge search integration

### Phase 3: Teaching Loop (Days 5-7)
1. ChatPane with streaming responses
2. Teaching prompt with Zep enrichment
3. Challenge presentation + code evaluation flow
4. Function calling for topic completion (complete_topic, evaluate_code)
5. Progress persistence + Sidebar progress indicators
6. Topic advancement logic (unlock next, check prerequisites)

### Phase 4: Intelligence & Polish (Days 8-10)
1. Course revision logic (re-evaluate plan based on performance)
2. ResourcePanel showing Zep articles
3. Conversation history management (summarize older context)
4. CodeMirror polish (syntax highlighting, error gutters)
5. Mobile responsive layout
6. Rate limiting (Upstash Redis or in-memory)
7. Deploy to Vercel, end-to-end testing

---

## Environment Variables

```bash
# .env.local
GEMINI_API_KEY=...
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...
ZEP_API_KEY=...
ZEP_SESSION_ID=...                     # session containing curated articles
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

---

## Interview Talking Points

1. **Dynamic course generation** — No two users get the same curriculum. The assessment interview builds a profile, and the AI generates a custom topic sequence from a pool of 20+ topics, each with tailored depth and focus areas. The course revises itself based on ongoing performance.

2. **Pyodide/WASM** — Python runs entirely client-side via WebAssembly. No backend sandbox, no security risk, instant execution. Challenges include handling the ~8MB load, async limitations, and no network access — all worked around with eager loading and simulated environments.

3. **Zep knowledge graph integration** — The AI instructor doesn't just generate content — it draws from a curated knowledge base of articles and resources stored in Zep. Semantic search finds relevant articles per topic, and the knowledge graph provides additional context for richer teaching.

4. **Function calling over sentinel tokens** — Topic completion, code evaluation, and challenge presentation all use Gemini's function calling. This is more reliable than parsing sentinel tokens from text output and provides structured data for progress tracking.

5. **Adaptive pacing** — The system monitors performance across topics. If a user is scoring >90%, upcoming topics shift to "overview" depth. If they struggle (>2 failed attempts), the course plan revises to add prerequisite topics or increase depth. This happens automatically every 3 completed topics.

6. **Translation-first pedagogy** — For every concept, the system shows the user's primary language equivalent first, then the Python way. This leverages existing mental models instead of fighting them. Supports TS, Java, Go, and Rust translations based on the topic.
