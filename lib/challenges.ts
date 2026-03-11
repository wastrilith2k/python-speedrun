import { Challenge } from "./types";

export const CHALLENGES: Challenge[] = [
  // ── VARIABLES & TYPES ───────────────────────────────────
  {
    id: "types_01",
    topic_id: "variables_types",
    type: "predict",
    difficulty: 1,
    title: "Truthy/Falsy Differences",
    prompt: "What does this print? Think about how Python's truthy/falsy rules differ from JavaScript.",
    source_code: `values = [0, "", [], {}, None, "0", " ", [0], False]
truthy = [v for v in values if v]
print(truthy)
print(bool([]))
print(bool("False"))`,
    expected_concepts: ["truthy_falsy", "bool_conversion", "list_comprehension_filter"],
    evaluation_criteria: `Correct if: identifies that truthy is ["0", " ", [0]] — explaining that "0" is a non-empty string (truthy), " " is a non-empty string (truthy), and [0] is a non-empty list (truthy). bool([]) is False (empty list), bool("False") is True (non-empty string — the content doesn't matter). Key insight: Python's falsy values are 0, "", [], {}, set(), None, False. The string "0" is truthy in Python (unlike JS where it's also truthy, but "False" might confuse people coming from other contexts). Partial credit for getting the print outputs mostly right.`,
    hints: [
      "In Python, empty containers ([], {}, set(), '') are all falsy, but containers with anything in them are truthy",
      "The string \"0\" is not the integer 0 — it's a non-empty string, so it's truthy",
      "bool() of any non-empty string is True, even bool(\"False\") — the content doesn't matter",
    ],
  },

  {
    id: "types_02",
    topic_id: "variables_types",
    type: "write",
    difficulty: 1,
    title: "isinstance vs type",
    prompt: `Write a function called \`classify(value)\` that returns a string describing the input:
- "integer" for ints (including booleans should NOT match — bool is a subclass of int!)
- "number" for floats
- "text" for strings
- "collection" for lists, tuples, or sets
- "unknown" for anything else

Use isinstance() but handle the bool/int edge case correctly.`,
    starter_code: `def classify(value):
    # your code here
    pass

# Tests:
print(classify(42))        # "integer"
print(classify(True))      # Should NOT be "integer" — what should it be?
print(classify(3.14))      # "number"
print(classify("hello"))   # "text"
print(classify([1, 2]))    # "collection"
print(classify(None))      # "unknown"`,
    expected_concepts: ["isinstance", "type_checking", "bool_int_subclass", "tuple_of_types"],
    evaluation_criteria: `Correct if:
      1. Uses isinstance() for type checking (not type())
      2. Checks for bool BEFORE int, since bool is a subclass of int
      3. Uses isinstance(value, (list, tuple, set)) or checks each separately
      4. Returns "unknown" for bool (or handles it as a separate category)
      5. Returns correct results for all test cases
      Note: Accept any reasonable classification for True/False — the key insight is checking bool before int.`,
    hints: [
      "In Python, bool is a subclass of int — isinstance(True, int) returns True!",
      "Check for bool first in your if/elif chain, before checking for int",
      "isinstance() accepts a tuple of types: isinstance(x, (list, tuple, set))",
    ],
  },

  // ── STRINGS & F-STRINGS ─────────────────────────────────
  {
    id: "strings_01",
    topic_id: "strings_fstrings",
    type: "write",
    difficulty: 1,
    title: "F-String Formatting Power",
    prompt: `Write a function \`format_table(items)\` that takes a list of tuples like [("Widget", 29.99, 150), ("Gadget", 9.50, 1200)] where each tuple is (name, price, quantity) and prints a formatted table using f-strings.

Requirements:
- Name column: left-aligned, 15 chars wide
- Price column: right-aligned, 10 chars wide, always 2 decimal places, with $ prefix
- Quantity column: right-aligned, 8 chars wide, with comma separators for thousands
- Print a header row and a separator line`,
    starter_code: `def format_table(items):
    # your code here
    pass

items = [
    ("Widget", 29.99, 150),
    ("Gadget", 9.50, 1200),
    ("Doohickey", 199.00, 42),
    ("Thingamajig", 5.75, 10500),
]
format_table(items)`,
    expected_concepts: ["fstring_formatting", "alignment", "number_formatting", "format_spec"],
    evaluation_criteria: `Correct if:
      1. Uses f-strings with format specifiers (not .format() or %)
      2. Left-aligns names with :<15 or similar
      3. Right-aligns prices with :>10.2f or similar, includes $ sign
      4. Uses comma separator for quantity with :>,8 or :>8, format
      5. Output is reasonably table-shaped with headers
      Partial credit for getting some format specs right but not all.`,
    hints: [
      "f-string format spec: f'{value:<15}' left-aligns in 15 chars, f'{value:>10}' right-aligns",
      "For 2 decimal places: f'{price:.2f}'. For comma separators: f'{qty:,}'",
      "You can combine: f'{qty:>8,}' right-aligns with commas in 8 chars",
    ],
  },

  {
    id: "strings_02",
    topic_id: "strings_fstrings",
    type: "translate",
    difficulty: 1,
    title: "Template Literal to F-String",
    prompt: "Convert this TypeScript template literal code to Python using f-strings:",
    source_code: `function formatUser(user: { name: string; age: number; role: string }) {
  const status = user.age >= 18 ? "adult" : "minor";
  return \`User: \${user.name.toUpperCase()}
Age: \${user.age} (\${status})
Role: \${user.role || "none"}
Debug: \${{ name: user.name, age: user.age }}\`;
}`,
    source_language: "typescript",
    expected_concepts: ["fstrings", "ternary_to_conditional_expr", "string_methods", "or_default"],
    evaluation_criteria: `Correct if:
      1. Uses f-strings (not .format() or %)
      2. Correctly translates ternary to Python conditional expression: "adult" if age >= 18 else "minor"
      3. Uses .upper() instead of .toUpperCase()
      4. Handles the "or default" pattern — user.role or "none" (Python's or works similarly here)
      5. Handles the debug line with f-string expression (f'{...=}' syntax or dict literal)
      Partial credit for getting most translations right.`,
    hints: [
      "Python's conditional expression: value_if_true if condition else value_if_false",
      "JavaScript's .toUpperCase() is .upper() in Python",
      "f-string debug trick: f'{expr=}' prints both the expression and its value (Python 3.8+)",
    ],
  },

  // ── COMPREHENSIONS ──────────────────────────────────────
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
    id: "comp_02",
    topic_id: "comprehensions",
    type: "write",
    difficulty: 2,
    title: "Dict Comprehension Challenge",
    prompt: `Given a list of words, write a one-liner dict comprehension that creates a dictionary mapping each word to its length, but only for words longer than 3 characters, with the keys in lowercase.

Example:
  words = ["Hello", "Hi", "Python", "Is", "Awesome", "Go"]
  Result: {"hello": 5, "python": 6, "awesome": 7}`,
    starter_code: `words = ["Hello", "Hi", "Python", "Is", "Awesome", "Go"]

# Write a dict comprehension:
result = ...  # your code here

print(result)`,
    expected_concepts: ["dict_comprehension", "string_methods", "conditional_comprehension"],
    evaluation_criteria: `Correct if:
      1. Uses a dict comprehension {k: v for ... in ... if ...}
      2. Lowercases the keys with .lower()
      3. Filters words with len > 3
      4. Values are the word lengths (len())
      Incorrect if: uses a for loop or dict() constructor with a generator.`,
    hints: [
      "Dict comprehensions look like: {key_expr: value_expr for item in iterable if condition}",
      "Use word.lower() for the key and len(word) for the value",
    ],
  },

  {
    id: "comp_03",
    topic_id: "comprehensions",
    type: "refactor",
    difficulty: 2,
    title: "Nested Loop to Comprehension",
    prompt: "Refactor this nested loop into a single list comprehension:",
    source_code: `matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
result = []
for row in matrix:
    for val in row:
        if val % 2 != 0:
            result.append(val * 10)
print(result)  # [10, 30, 50, 70, 90]`,
    expected_concepts: ["nested_comprehension", "conditional_comprehension", "list_comprehension"],
    evaluation_criteria: `Correct if: produces [val * 10 for row in matrix for val in row if val % 2 != 0] or equivalent.
      The key point is that nested for clauses in comprehensions read left-to-right, same as the nested loops.
      Accept val % 2 == 1 as equivalent to val % 2 != 0.
      Incorrect if: the comprehension nests in the wrong order.`,
    hints: [
      "In a list comprehension, nested for clauses read left-to-right, just like writing them as nested loops",
      "The pattern is: [expr for outer in outer_iter for inner in inner_iter if condition]",
      "Outer loop comes first, inner loop second — same order as the original code",
    ],
  },

  // ── UNPACKING & WALRUS ──────────────────────────────────
  {
    id: "unpack_01",
    topic_id: "unpacking_walrus",
    type: "translate",
    difficulty: 1,
    title: "JS Destructuring to Python Unpacking",
    prompt: "Convert this JavaScript destructuring code to Python:",
    source_code: `// JavaScript
const [first, second, ...rest] = [1, 2, 3, 4, 5];
console.log(first, second, rest);

const { name, age, ...other } = { name: "Alice", age: 30, role: "dev", team: "backend" };
console.log(name, age, other);

// Swap
let a = 1, b = 2;
[a, b] = [b, a];`,
    source_language: "javascript",
    expected_concepts: ["tuple_unpacking", "starred_unpacking", "dict_unpacking", "swap_idiom"],
    evaluation_criteria: `Correct if:
      1. Uses first, second, *rest = [1, 2, 3, 4, 5] for array destructuring
      2. Acknowledges that Python can't directly destructure dicts like JS — must use .pop(), .values(), or manual assignment
      3. Uses a, b = b, a for the swap (no temp variable needed)
      Key insight: Python unpacking is positional (tuples/lists), not named (objects/dicts).
      Partial credit for getting the list unpacking and swap right even if dict part is imperfect.`,
    hints: [
      "Python uses *rest instead of ...rest for collecting remaining items",
      "Python can unpack sequences (lists, tuples) positionally, but can't destructure dicts with the same syntax",
      "Python's swap idiom: a, b = b, a — no temporary variable needed",
    ],
  },

  {
    id: "unpack_02",
    topic_id: "unpacking_walrus",
    type: "write",
    difficulty: 2,
    title: "Walrus Operator Use Case",
    prompt: `Rewrite this code to use the walrus operator (:=) to avoid calling the function twice and to make it more concise. The function is expensive, so calling it once matters.`,
    source_code: `import re

lines = ["INFO: User logged in", "ERROR: Disk full", "WARNING: Low memory", "INFO: Request processed", "ERROR: Connection timeout"]

# Current code — calls re.search twice (or uses a temp variable awkwardly):
errors = []
for line in lines:
    match = re.search(r"ERROR: (.+)", line)
    if match:
        errors.append(match.group(1))
print(errors)`,
    starter_code: `import re

lines = ["INFO: User logged in", "ERROR: Disk full", "WARNING: Low memory", "INFO: Request processed", "ERROR: Connection timeout"]

# Rewrite using the walrus operator (:=) — try to make it a list comprehension too:
errors = ...  # your code here

print(errors)`,
    expected_concepts: ["walrus_operator", "regex", "list_comprehension", "assignment_expression"],
    evaluation_criteria: `Correct if:
      1. Uses := inside a list comprehension or while loop
      2. Calls re.search only once per iteration
      3. The walrus operator assigns and tests the match in one expression
      4. Produces the same output: ["Disk full", "Connection timeout"]
      Ideal answer: [m.group(1) for line in lines if (m := re.search(r"ERROR: (.+)", line))]
      Also accept a while loop version with walrus.`,
    hints: [
      "The walrus operator := assigns a value AND returns it in a single expression",
      "You can use it in an if condition: if (m := re.search(...)):",
      "Combine with a list comprehension: [m.group(1) for x in items if (m := re.search(...))]",
    ],
  },

  // ── LISTS & TUPLES ──────────────────────────────────────
  {
    id: "list_01",
    topic_id: "lists_tuples",
    type: "predict",
    difficulty: 1,
    title: "Mutation Gotcha",
    prompt: "What does this code print? Be careful — there's a common gotcha here.",
    source_code: `nums = [3, 1, 4, 1, 5, 9]
result = nums.sort()
print(f"result = {result}")
print(f"nums = {nums}")

a = [1, 2, 3]
b = a
b.append(4)
print(f"a = {a}")

c = [1, 2, 3]
d = c[:]
d.append(4)
print(f"c = {c}")`,
    expected_concepts: ["sort_returns_none", "reference_semantics", "shallow_copy", "in_place_mutation"],
    evaluation_criteria: `Correct if:
      1. Identifies result = None (sort() mutates in-place and returns None)
      2. Identifies nums = [1, 1, 3, 4, 5, 9] (sorted in-place)
      3. Identifies a = [1, 2, 3, 4] (b is the same list as a)
      4. Identifies c = [1, 2, 3] (d is a copy via slicing)
      Key insight: sort() returns None, assignment creates aliases not copies, slicing creates copies.
      Partial credit for getting most outputs right.`,
    hints: [
      "list.sort() modifies the list in-place and returns None — use sorted() if you want a new list",
      "b = a doesn't copy the list — both names point to the same object",
      "c[:] creates a shallow copy of the list",
    ],
  },

  {
    id: "list_02",
    topic_id: "lists_tuples",
    type: "write",
    difficulty: 1,
    title: "Slicing Mastery",
    prompt: `Given a list, write one-liner expressions (no loops, no imports) for each task:
1. Get the last 3 elements
2. Reverse the list
3. Get every other element (indices 0, 2, 4, ...)
4. Get elements from index 2 to 5 (inclusive)
5. Remove the first and last elements (return middle portion)`,
    starter_code: `data = [10, 20, 30, 40, 50, 60, 70, 80]

last_three = ...       # [60, 70, 80]
reversed_list = ...    # [80, 70, 60, 50, 40, 30, 20, 10]
every_other = ...      # [10, 30, 50, 70]
slice_2_to_5 = ...     # [30, 40, 50, 60]
middle = ...           # [20, 30, 40, 50, 60, 70]

print(last_three)
print(reversed_list)
print(every_other)
print(slice_2_to_5)
print(middle)`,
    expected_concepts: ["slicing", "negative_indexing", "step_slicing", "slice_syntax"],
    evaluation_criteria: `Correct if:
      1. last_three uses data[-3:] or equivalent
      2. reversed_list uses data[::-1]
      3. every_other uses data[::2]
      4. slice_2_to_5 uses data[2:6] (stop index is exclusive, so 6 to include index 5)
      5. middle uses data[1:-1]
      All must use slice notation, not loops or list methods.`,
    hints: [
      "Python slicing syntax: list[start:stop:step] — stop is exclusive",
      "Negative indices count from the end: -1 is the last element, -3 is third from last",
      "Step of -1 reverses: data[::-1]. Step of 2 skips every other: data[::2]",
    ],
  },

  // ── DICTS & SETS ────────────────────────────────────────
  {
    id: "dict_01",
    topic_id: "dicts_sets",
    type: "write",
    difficulty: 2,
    title: "Word Frequency Counter",
    prompt: `Write a function \`word_freq(text)\` that returns a dictionary of word frequencies, case-insensitive, sorted by frequency (highest first). Use Python's collections module for the cleanest solution.

Then write a second version \`word_freq_vanilla(text)\` that does the same thing WITHOUT importing collections — use dict.get() or defaultdict patterns.`,
    starter_code: `from collections import Counter

def word_freq(text):
    # your code here — use Counter
    pass

def word_freq_vanilla(text):
    # your code here — no imports
    pass

text = "the cat sat on the mat the cat"
print(word_freq(text))
print(word_freq_vanilla(text))
# Both should show: {"the": 3, "cat": 2, "sat": 1, "on": 1, "mat": 1}`,
    expected_concepts: ["counter", "dict_get", "string_methods", "sorting_dicts"],
    evaluation_criteria: `Correct if:
      1. Counter version: uses Counter(text.lower().split()) or equivalent, returns most_common() or sorted result
      2. Vanilla version: uses a regular dict with .get(word, 0) + 1 or setdefault pattern
      3. Both handle case-insensitivity with .lower()
      4. Both split on whitespace
      5. Results are sorted by frequency (Counter.most_common() handles this, vanilla needs sorted())
      Partial credit for getting one version right.`,
    hints: [
      "Counter(iterable) counts occurrences automatically — Counter('aab') gives Counter({'a': 2, 'b': 1})",
      "For the vanilla version: freq[word] = freq.get(word, 0) + 1",
      "Counter has a .most_common() method that returns items sorted by count",
    ],
  },

  {
    id: "dict_02",
    topic_id: "dicts_sets",
    type: "translate",
    difficulty: 2,
    title: "JS Map/Object to Python Dict",
    prompt: "Convert this JavaScript to Python, using the most Pythonic equivalents:",
    source_code: `// JavaScript
const scores = new Map();
scores.set("alice", 95);
scores.set("bob", 87);
scores.set("carol", 92);

// Check if key exists
if (scores.has("alice")) {
  console.log(scores.get("alice"));
}

// Iterate entries
for (const [name, score] of scores.entries()) {
  console.log(\`\${name}: \${score}\`);
}

// Merge two objects
const defaults = { theme: "dark", lang: "en" };
const userPrefs = { lang: "fr", fontSize: 14 };
const merged = { ...defaults, ...userPrefs };`,
    source_language: "javascript",
    expected_concepts: ["dict_literals", "dict_methods", "dict_iteration", "dict_merge"],
    evaluation_criteria: `Correct if:
      1. Uses a regular Python dict (not a special Map class)
      2. Uses 'in' operator for key checking (not .has())
      3. Uses .items() for iterating key-value pairs
      4. Uses {**defaults, **userPrefs} or defaults | userPrefs (Python 3.9+) for merge
      5. Uses f-strings for the print statement
      Partial credit for getting most translations right. Accept either ** unpacking or | operator for merge.`,
    hints: [
      "Python's dict IS the Map — no need for a separate Map class",
      "Key existence: 'key' in my_dict (not .has()). Value access: my_dict['key'] or my_dict.get('key')",
      "Dict merge in Python 3.9+: merged = defaults | user_prefs. Earlier: {**defaults, **user_prefs}",
    ],
  },

  // ── FUNCTIONS & ARGS ────────────────────────────────────
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
    id: "args_02",
    topic_id: "functions_args",
    type: "write",
    difficulty: 2,
    title: "Flexible Function with *args/**kwargs",
    prompt: `Write a function \`make_tag(tag, *children, **attrs)\` that generates an HTML-like tag string.

Examples:
  make_tag("div", "hello")             → '<div>hello</div>'
  make_tag("p", "line1", "line2")      → '<p>line1line2</p>'
  make_tag("img", src="cat.png", alt="A cat") → '<img src="cat.png" alt="A cat" />'
  make_tag("div", "content", id="main", class_="container")
    → '<div id="main" class="container">content</div>'

Rules:
- If no children, self-close: <tag ... />
- If children, wrap: <tag ...>children</tag>
- class_ parameter should become "class" in output (since class is reserved in Python)`,
    starter_code: `def make_tag(tag, *children, **attrs):
    # your code here
    pass

print(make_tag("div", "hello"))
print(make_tag("img", src="cat.png", alt="A cat"))
print(make_tag("div", "content", id="main", class_="container"))`,
    expected_concepts: ["args_kwargs", "string_formatting", "keyword_arguments", "trailing_underscore_convention"],
    evaluation_criteria: `Correct if:
      1. Uses *children to collect positional args and **attrs for keyword args
      2. Handles class_ → class conversion (strip trailing underscore)
      3. Self-closes when no children are provided
      4. Joins children (if multiple) into the tag content
      5. Formats attributes correctly as key="value" pairs
      Partial credit for basic *args/**kwargs usage even if class_ handling is missing.`,
    hints: [
      "*children collects extra positional args as a tuple, **attrs collects keyword args as a dict",
      "For the class_ issue: Python uses trailing underscore for names that conflict with keywords",
      "Build the attrs string: ' '.join(f'{k.rstrip(\"_\")}=\"{v}\"' for k, v in attrs.items())",
    ],
  },

  // ── CLOSURES & DECORATORS ───────────────────────────────
  {
    id: "closure_01",
    topic_id: "closures_decorators",
    type: "translate",
    difficulty: 2,
    title: "JS Closure to Python",
    prompt: "Convert this JavaScript closure to Python. Pay attention to how variable mutation in closures works differently.",
    source_code: `// JavaScript
function makeCounter(start = 0) {
  let count = start;
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
}

const counter = makeCounter(10);
console.log(counter.increment()); // 11
console.log(counter.increment()); // 12
console.log(counter.decrement()); // 11
console.log(counter.getCount());  // 11`,
    source_language: "javascript",
    expected_concepts: ["closures", "nonlocal", "first_class_functions", "encapsulation"],
    evaluation_criteria: `Correct if:
      1. Uses nonlocal to allow inner functions to modify count
      2. Returns the functions (as a dict, tuple, or simple class/namedtuple)
      3. The counter state is properly enclosed in the outer function's scope
      4. All operations (increment, decrement, get) work correctly
      Key insight: Python requires 'nonlocal' to assign to variables in enclosing scope.
      JS closures can mutate freely. Python closures can READ but need nonlocal to WRITE.
      Accept class-based solutions too, but note the closure approach is more direct.`,
    hints: [
      "In Python, closures can read outer variables freely but need 'nonlocal' to assign to them",
      "Declare 'nonlocal count' inside each inner function that modifies count",
      "Return the functions as a dict: {'increment': inc, 'decrement': dec, 'get_count': get}",
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
    id: "closure_03",
    topic_id: "closures_decorators",
    type: "write",
    difficulty: 3,
    title: "Decorator with Arguments",
    prompt: `Write a decorator @retry(max_attempts=3, delay=1.0) that retries a function if it raises an exception.

Requirements:
- Takes max_attempts and delay as arguments
- Retries the function up to max_attempts times
- Waits delay seconds between retries
- If all attempts fail, raises the last exception
- Prints which attempt is being tried
- Preserves the original function's name/docstring`,
    starter_code: `import time
from functools import wraps

def retry(max_attempts=3, delay=1.0):
    # your code here — this is a decorator FACTORY
    pass

@retry(max_attempts=3, delay=0.1)
def flaky_function():
    """A function that sometimes fails."""
    import random
    if random.random() < 0.7:
        raise ConnectionError("Network timeout")
    return "success!"

# Should retry up to 3 times with 0.1s delay between attempts
try:
    result = flaky_function()
    print(f"Got: {result}")
except ConnectionError:
    print("All attempts failed")`,
    expected_concepts: ["decorator_factory", "triple_nested_functions", "functools.wraps", "exception_handling"],
    evaluation_criteria: `Correct if:
      1. Uses three levels of nesting: retry() → decorator() → wrapper()
      2. retry() returns the actual decorator
      3. Uses @wraps(func) on the innermost wrapper
      4. Catches exceptions and retries up to max_attempts
      5. Includes delay between retries (time.sleep)
      6. Re-raises the last exception if all attempts fail
      Partial credit for getting the triple-nesting pattern right even if details are off.`,
    hints: [
      "A decorator with arguments needs THREE levels: the factory, the decorator, and the wrapper",
      "def retry(max_attempts, delay): → def decorator(func): → def wrapper(*args, **kwargs):",
      "Use a for loop with range(max_attempts), catching exceptions and sleeping between retries",
    ],
  },

  // ── GENERATORS & ITERATORS ──────────────────────────────
  {
    id: "gen_01",
    topic_id: "generators_iterators",
    type: "write",
    difficulty: 2,
    title: "Fibonacci Generator",
    prompt: `Write a generator function \`fibonacci()\` that yields the Fibonacci sequence indefinitely (0, 1, 1, 2, 3, 5, 8, 13, ...).

Then use it with itertools.islice to get the first 10 Fibonacci numbers as a list.`,
    starter_code: `from itertools import islice

def fibonacci():
    # your code here — use yield
    pass

# Get first 10 Fibonacci numbers:
first_10 = ...  # use islice

print(first_10)  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`,
    expected_concepts: ["generators", "yield", "infinite_sequence", "itertools_islice"],
    evaluation_criteria: `Correct if:
      1. Uses yield (not return) to produce values lazily
      2. Generates the correct Fibonacci sequence starting with 0, 1
      3. Is an infinite generator (no upper limit)
      4. Uses islice(fibonacci(), 10) or list(islice(...)) to get first 10
      5. Output is [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
      Accept any correct Fibonacci implementation (a, b = b, a+b is most Pythonic).`,
    hints: [
      "Use yield to produce each value — the generator pauses and resumes between yields",
      "The Pythonic Fibonacci swap: a, b = b, a + b (parallel assignment)",
      "itertools.islice(iterable, n) takes the first n items from any iterable, including infinite generators",
    ],
  },

  {
    id: "gen_02",
    topic_id: "generators_iterators",
    type: "refactor",
    difficulty: 2,
    title: "List to Generator for Memory",
    prompt: `Refactor this code to use generators instead of lists. The current version builds huge lists in memory. The refactored version should process one item at a time.`,
    source_code: `def get_log_lines(filename):
    """Read all lines from a log file."""
    with open(filename) as f:
        return f.readlines()

def parse_lines(lines):
    """Parse each line into a dict."""
    results = []
    for line in lines:
        parts = line.strip().split(" | ")
        if len(parts) == 3:
            results.append({
                "timestamp": parts[0],
                "level": parts[1],
                "message": parts[2]
            })
    return results

def filter_errors(entries):
    """Keep only ERROR entries."""
    return [e for e in entries if e["level"] == "ERROR"]

# Pipeline that loads EVERYTHING into memory:
lines = get_log_lines("huge_log.txt")
entries = parse_lines(lines)
errors = filter_errors(entries)
for error in errors:
    print(error["message"])`,
    expected_concepts: ["generators", "yield", "lazy_evaluation", "memory_efficiency", "generator_expressions"],
    evaluation_criteria: `Correct if:
      1. get_log_lines uses yield instead of readlines() — yields one line at a time
      2. parse_lines uses yield instead of appending to a list
      3. filter_errors uses a generator expression instead of a list comprehension
      4. The pipeline still works the same way — just lazily now
      5. No intermediate lists are created
      Key insight: changing [] to () in the comprehension and return to yield in the functions.`,
    hints: [
      "Replace 'return f.readlines()' with 'yield from f' or a for loop with yield",
      "Replace 'results.append(...)' with 'yield ...' and remove the results list entirely",
      "Replace [e for e in entries if ...] with (e for e in entries if ...) — parentheses make it a generator expression",
    ],
  },

  // ── TYPE HINTS ──────────────────────────────────────────
  {
    id: "types_hint_01",
    topic_id: "type_hints",
    type: "translate",
    difficulty: 2,
    title: "TS Interface to Python",
    prompt: "Convert these TypeScript interfaces and type definitions to Python using dataclasses and type hints:",
    source_code: `interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user" | "guest";
  preferences?: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

interface ApiResponse<T> {
  data: T;
  status: number;
  error?: string;
}

type UserList = ApiResponse<User[]>;`,
    source_language: "typescript",
    expected_concepts: ["dataclasses", "type_hints", "literal_types", "optional", "generics", "type_alias"],
    evaluation_criteria: `Correct if:
      1. Uses @dataclass for User (or TypedDict — both acceptable)
      2. Uses Literal["admin", "user", "guest"] for the role union
      3. Handles optional preferences with Optional or | None (default None)
      4. Uses Generic[T] or TypeVar for ApiResponse
      5. Creates a TypeAlias for UserList
      Accept both modern (3.10+) syntax (X | None) and older (Optional[X]).
      Accept both dataclass and TypedDict approaches.`,
    hints: [
      "Python's Literal type is like TS's string literal unions: Literal['admin', 'user', 'guest']",
      "Optional fields use Optional[X] or X | None with a default of None",
      "For generics: use TypeVar('T') and Generic[T] to make ApiResponse generic",
    ],
  },

  {
    id: "types_hint_02",
    topic_id: "type_hints",
    type: "write",
    difficulty: 2,
    title: "Annotate with Generics",
    prompt: `Write a fully type-annotated generic function \`first_match\` that takes a list of items of any type T and a predicate function, and returns the first item that matches (or None if nothing matches).

Then write a type-annotated \`pipe\` function that chains multiple single-argument functions together: pipe(f, g, h)(x) should equal h(g(f(x))).`,
    starter_code: `from typing import TypeVar, Callable, Optional

T = TypeVar("T")

def first_match(items, predicate):
    # Add type hints and implement
    pass

def pipe(*funcs):
    # Add type hints and implement
    pass

# Usage:
nums = [1, 4, 7, 10, 13]
result = first_match(nums, lambda x: x > 8)
print(result)  # 10

transform = pipe(str, str.upper, len)
print(transform(42))  # 2 (42 → "42" → "42" → 2)`,
    expected_concepts: ["typevar", "callable", "optional", "generic_functions", "higher_order_functions"],
    evaluation_criteria: `Correct if:
      1. first_match is annotated: (items: list[T], predicate: Callable[[T], bool]) -> Optional[T] or T | None
      2. first_match implementation uses a loop or next() with a generator
      3. pipe has reasonable type hints (this is hard to type perfectly — accept Callable[..., Any])
      4. pipe implementation uses functools.reduce or a loop
      5. Both functions work correctly
      Partial credit for correct implementation without perfect type hints.`,
    hints: [
      "TypeVar('T') creates a generic type variable — use it in both the input and output annotations",
      "Callable[[ArgType], ReturnType] annotates function types",
      "For pipe, consider functools.reduce: reduce(lambda val, fn: fn(val), funcs, initial_value)",
    ],
  },

  // ── OOP & CLASSES ───────────────────────────────────────
  {
    id: "class_01",
    topic_id: "oop_classes",
    type: "translate",
    difficulty: 2,
    title: "TS Class to Python Class",
    prompt: "Convert this TypeScript class to Python. Use Pythonic conventions.",
    source_code: `class BankAccount {
  private balance: number;
  private owner: string;
  private transactions: { amount: number; type: string; date: Date }[];

  constructor(owner: string, initialBalance: number = 0) {
    this.owner = owner;
    this.balance = initialBalance;
    this.transactions = [];
  }

  deposit(amount: number): void {
    if (amount <= 0) throw new Error("Amount must be positive");
    this.balance += amount;
    this.transactions.push({ amount, type: "deposit", date: new Date() });
  }

  withdraw(amount: number): void {
    if (amount > this.balance) throw new Error("Insufficient funds");
    this.balance -= amount;
    this.transactions.push({ amount, type: "withdrawal", date: new Date() });
  }

  getBalance(): number { return this.balance; }

  toString(): string {
    return \`BankAccount(\${this.owner}, $\${this.balance.toFixed(2)})\`;
  }
}`,
    source_language: "typescript",
    expected_concepts: ["classes", "init", "self", "properties", "dunder_methods", "exceptions"],
    evaluation_criteria: `Correct if:
      1. Uses __init__ with self for constructor
      2. Uses self.balance, self.owner, self.transactions (explicit self everywhere)
      3. Uses ValueError or custom exception for validation (not generic Error)
      4. Uses __str__ or __repr__ instead of toString()
      5. Uses naming convention: _balance for "private" (Python convention, not enforced)
      6. Uses datetime.now() or similar instead of new Date()
      Accept @property for getBalance() or a simple method — both are fine.
      Extra credit for using @dataclass or @property.`,
    hints: [
      "Python uses self explicitly — every method's first parameter is self",
      "Private is by convention only: _balance (single underscore) means 'private'",
      "__str__ is Python's toString(). __repr__ is for debugging. Implement both for best practice.",
    ],
  },

  {
    id: "class_02",
    topic_id: "oop_classes",
    type: "write",
    difficulty: 2,
    title: "Dataclass with Custom Methods",
    prompt: `Create a @dataclass called \`Inventory\` that manages a collection of products.

Requirements:
- Product is a frozen dataclass with: name (str), price (float), quantity (int)
- Inventory has a list of Products and supports:
  - total_value property: sum of (price * quantity) for all products
  - most_expensive() method: returns the Product with highest price
  - in_stock() method: returns list of Products where quantity > 0
  - __contains__: lets you do \`"Widget" in inventory\` to check by product name
  - Ability to sort products by price (implement __lt__ on Product or use sort)`,
    starter_code: `from dataclasses import dataclass, field

# Define Product and Inventory here

# Test:
inv = Inventory(products=[
    Product("Widget", 29.99, 100),
    Product("Gadget", 9.50, 0),
    Product("Doohickey", 199.00, 5),
])

print(f"Total value: {inv.total_value:.2f}")
print(f"Most expensive: {inv.most_expensive()}")
print(f"In stock: {inv.in_stock()}")
print(f"Has Widget: {'Widget' in inv}")
print(f"Sorted: {sorted(inv.products)}")`,
    expected_concepts: ["dataclasses", "frozen_dataclass", "dunder_methods", "property", "field_defaults"],
    evaluation_criteria: `Correct if:
      1. Uses @dataclass decorator for both Product and Inventory
      2. Product is frozen=True (immutable)
      3. Product has order=True or implements __lt__ for sorting by price
      4. Inventory.total_value is a @property
      5. __contains__ checks product names (string lookup)
      6. Uses field(default_factory=list) for products default
      Partial credit for getting dataclass basics right without all features.`,
    hints: [
      "@dataclass(frozen=True) makes instances immutable (like a record/readonly)",
      "@dataclass(order=True) auto-generates comparison methods based on field order",
      "Use @property for total_value — it looks like an attribute but computes on access",
    ],
  },

  // ── EXCEPTIONS ──────────────────────────────────────────
  {
    id: "except_01",
    topic_id: "exceptions",
    type: "write",
    difficulty: 2,
    title: "Proper Exception Handling",
    prompt: `Refactor this badly-written exception handling code to follow Python best practices.

Current (bad) code:
\`\`\`python
def process_data(data):
    try:
        result = data["key1"]["key2"]
        value = int(result)
        output = 100 / value
        return output
    except:
        return None
\`\`\`

Requirements:
- Catch specific exceptions (KeyError, ValueError, ZeroDivisionError)
- Provide meaningful error messages
- Use else clause for success path
- Use logging or print for error reporting
- Use exception chaining where appropriate
- Define a custom exception for the overall operation`,
    starter_code: `class DataProcessingError(Exception):
    """Raised when data processing fails."""
    pass

def process_data(data):
    # Rewrite with proper exception handling
    pass

# Test cases:
test_cases = [
    {"key1": {"key2": "42"}},           # Success: 2.38...
    {"key1": {"key2": "0"}},            # ZeroDivisionError
    {"key1": {"key2": "abc"}},          # ValueError
    {"key1": {}},                        # KeyError
    "not a dict",                        # TypeError
]

for data in test_cases:
    try:
        result = process_data(data)
        print(f"Success: {result}")
    except DataProcessingError as e:
        print(f"Error: {e}")`,
    expected_concepts: ["specific_exceptions", "exception_chaining", "custom_exceptions", "else_clause", "eafp"],
    evaluation_criteria: `Correct if:
      1. Catches specific exceptions, NOT bare except:
      2. Uses 'raise DataProcessingError(...) from e' for exception chaining
      3. Includes meaningful error messages that explain what went wrong
      4. Uses else clause for the success path (or at least demonstrates knowledge of it)
      5. Never silently swallows exceptions
      Partial credit for catching specific exceptions even without full chaining.`,
    hints: [
      "Catch the most specific exception first: except KeyError, except ValueError, etc.",
      "Use 'raise NewError(...) from original' to chain exceptions — preserves the traceback",
      "The else clause runs only if no exception was raised — good for the 'happy path' logic",
    ],
  },

  // ── TESTING WITH PYTEST ─────────────────────────────────
  {
    id: "test_01",
    topic_id: "testing_pytest",
    type: "write",
    difficulty: 2,
    title: "Write Tests for a Function",
    prompt: `Write pytest tests for this function. Cover normal cases, edge cases, and error cases.

\`\`\`python
def parse_range(range_str: str) -> list[int]:
    \"\"\"Parse a range string like '1-5' into a list of integers [1, 2, 3, 4, 5].
    Also supports comma-separated values: '1,3,5' → [1, 3, 5]
    And mixed: '1-3,7,9-11' → [1, 2, 3, 7, 9, 10, 11]
    Raises ValueError for invalid input.\"\"\"
\`\`\`

Write at least 6 test cases covering:
- Simple range ("1-5")
- Single numbers ("3")
- Comma-separated ("1,3,5")
- Mixed ("1-3,7,9-11")
- Edge cases (empty string, reversed range like "5-1")
- Error cases (non-numeric input)`,
    starter_code: `import pytest

# Assume parse_range is imported from the module being tested
# from my_module import parse_range

def parse_range(range_str):
    """Reference implementation for testing."""
    if not range_str:
        raise ValueError("Empty range string")
    result = []
    for part in range_str.split(","):
        if "-" in part:
            start, end = part.split("-")
            result.extend(range(int(start), int(end) + 1))
        else:
            result.append(int(part))
    return result

# Write your tests below:`,
    expected_concepts: ["pytest", "test_functions", "assertions", "pytest_raises", "parametrize", "edge_cases"],
    evaluation_criteria: `Correct if:
      1. Test functions start with test_
      2. Uses plain assert statements (not assertEqual)
      3. Uses pytest.raises() for testing exceptions
      4. Covers at least: simple range, comma-separated, mixed, edge case, error case
      5. Tests have descriptive names
      Extra credit for using @pytest.mark.parametrize for data-driven tests.
      Partial credit for basic tests without edge cases.`,
    hints: [
      "pytest discovers functions starting with test_ — no class or import needed",
      "Use plain assert: assert parse_range('1-3') == [1, 2, 3]",
      "Use pytest.raises(ValueError) as a context manager to test exceptions",
    ],
  },

  // ── PYTHONIC PATTERNS ───────────────────────────────────
  {
    id: "idiom_01",
    topic_id: "pythonic_patterns",
    type: "refactor",
    difficulty: 2,
    title: "Un-Pythonic to Pythonic",
    prompt: "Refactor each of these un-Pythonic code snippets to be idiomatic Python:",
    source_code: `# 1. Index-based iteration
names = ["Alice", "Bob", "Charlie"]
for i in range(len(names)):
    print(str(i) + ": " + names[i])

# 2. Manual flag checking
numbers = [2, 4, 6, 8, 10]
has_odd = False
for n in numbers:
    if n % 2 != 0:
        has_odd = True
        break

# 3. Building a string with concatenation
parts = ["hello", "world", "foo", "bar"]
result = ""
for p in parts:
    result = result + p + " "
result = result.strip()

# 4. Explicit index for finding an item
data = [("Alice", 95), ("Bob", 87), ("Charlie", 92)]
best_name = ""
best_score = -1
for i in range(len(data)):
    if data[i][1] > best_score:
        best_score = data[i][1]
        best_name = data[i][0]

# 5. Checking for None incorrectly
value = get_something()
if value != None:
    process(value)`,
    expected_concepts: ["enumerate", "any_all", "str_join", "max_key", "is_none", "pythonic_idioms"],
    evaluation_criteria: `Correct if:
      1. Uses enumerate(names) instead of range(len(names)), with f-string
      2. Uses any(n % 2 != 0 for n in numbers) instead of manual flag
      3. Uses " ".join(parts) instead of concatenation loop
      4. Uses max(data, key=lambda x: x[1]) instead of manual tracking
      5. Uses 'if value is not None:' instead of '!= None'
      Each refactoring should be one or two lines. Partial credit for getting most right.`,
    hints: [
      "enumerate() gives you (index, value) pairs — no need for range(len())",
      "any() and all() replace manual flag-checking loops",
      "' '.join(list) is the Pythonic way to concatenate strings with a separator",
    ],
  },

  // ── ASYNC FUNDAMENTALS ──────────────────────────────────
  {
    id: "async_01",
    topic_id: "async_fundamentals",
    type: "predict",
    difficulty: 2,
    title: "What Happens Without Await",
    prompt: "What does this code print? What's wrong with it, and how would you fix it?",
    source_code: `import asyncio

async def fetch_data():
    print("Fetching...")
    await asyncio.sleep(1)
    print("Done fetching!")
    return {"result": 42}

async def main():
    result = fetch_data()
    print(f"Type: {type(result)}")
    print(f"Result: {result}")

asyncio.run(main())`,
    expected_concepts: ["coroutines", "await", "coroutine_object", "async_def"],
    evaluation_criteria: `Correct if:
      1. Identifies that result is a coroutine object, NOT the return value
      2. Notes that "Fetching..." and "Done fetching!" are NEVER printed (the coroutine never runs)
      3. Explains type would be <class 'coroutine'> and result would be a coroutine object
      4. Says the fix is to add await: result = await fetch_data()
      5. Mentions that Python will likely emit a RuntimeWarning about the coroutine never being awaited
      Partial credit for identifying the missing await without full explanation.`,
    hints: [
      "In Python, calling an async function does NOT execute it — it creates a coroutine object",
      "You must await the coroutine to actually run the code inside it",
      "This is different from JS where calling an async function immediately starts execution",
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
