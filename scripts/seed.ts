import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function seed() {
  console.log("Seeding database...");

  await db.executeMultiple(`
    -- User profile (built from assessment)
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY,
      known_languages TEXT DEFAULT '[]',
      primary_language TEXT DEFAULT '',
      years_experience INTEGER DEFAULT 0,
      python_level TEXT DEFAULT 'none',
      confirmed_skills TEXT DEFAULT '[]',
      identified_gaps TEXT DEFAULT '[]',
      goals TEXT DEFAULT '[]',
      pace_preference TEXT DEFAULT 'standard',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Custom course plan per user
    CREATE TABLE IF NOT EXISTS course_plan (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES user_profile(id),
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      topics TEXT NOT NULL,
      estimated_total_minutes INTEGER,
      generated_at TEXT DEFAULT (datetime('now')),
      revised_at TEXT,
      revision_count INTEGER DEFAULT 0
    );

    -- Progress per topic within a course
    CREATE TABLE IF NOT EXISTS topic_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES user_profile(id),
      course_id TEXT REFERENCES course_plan(id),
      topic_id TEXT NOT NULL,
      status TEXT DEFAULT 'locked',
      score INTEGER,
      ai_assessment TEXT,
      struggles TEXT DEFAULT '[]',
      started_at TEXT,
      completed_at TEXT,
      challenge_attempts INTEGER DEFAULT 0,
      failed_attempts INTEGER DEFAULT 0,
      UNIQUE(user_id, course_id, topic_id)
    );

    -- Conversation history (per topic session)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES user_profile(id),
      topic_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      function_call TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Code submissions (linked to challenges)
    CREATE TABLE IF NOT EXISTS code_submissions (
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

    -- Assessment conversation (stored for course re-generation)
    CREATE TABLE IF NOT EXISTS assessment_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT REFERENCES user_profile(id),
      conversation TEXT NOT NULL,
      code_probe_results TEXT,
      raw_profile TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("Database seeded successfully!");
}

seed().catch(console.error);
