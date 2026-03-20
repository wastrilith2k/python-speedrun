import { createClient } from "@libsql/client";
import type { UserProfile, CoursePlan, TopicProgress, ChatMessage, AssessmentData } from "./types";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;

// Auto-migrate: create tables on first DB access at runtime
let migrated: Promise<void> | null = null;
export function ensureTables() {
  if (!migrated) {
    migrated = db.executeMultiple(`
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
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT REFERENCES user_profile(id),
        topic_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        function_call TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
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
      CREATE TABLE IF NOT EXISTS assessment_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT REFERENCES user_profile(id),
        conversation TEXT NOT NULL,
        code_probe_results TEXT,
        raw_profile TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS assessment_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS chat_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        topic_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        message_count INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, topic_id)
      );
    `).catch((err) => {
      console.error("Migration failed:", err);
      migrated = null; // Allow retry on next request
      throw err;
    });
  }
  return migrated;
}

// ─── User Profile ────────────────────────────────────────

export async function getUser(id: string): Promise<UserProfile | null> {
  const result = await db.execute({ sql: "SELECT * FROM user_profile WHERE id = ?", args: [id] });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    known_languages: JSON.parse(row.known_languages as string),
    primary_language: row.primary_language as string,
    years_experience: row.years_experience as number,
    python_level: row.python_level as UserProfile["python_level"],
    confirmed_skills: JSON.parse(row.confirmed_skills as string),
    identified_gaps: JSON.parse(row.identified_gaps as string),
    goals: JSON.parse(row.goals as string),
    pace_preference: row.pace_preference as UserProfile["pace_preference"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function upsertUser(profile: UserProfile): Promise<void> {
  await db.execute({
    sql: `INSERT INTO user_profile (id, known_languages, primary_language, years_experience, python_level, confirmed_skills, identified_gaps, goals, pace_preference)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            known_languages = excluded.known_languages,
            primary_language = excluded.primary_language,
            years_experience = excluded.years_experience,
            python_level = excluded.python_level,
            confirmed_skills = excluded.confirmed_skills,
            identified_gaps = excluded.identified_gaps,
            goals = excluded.goals,
            pace_preference = excluded.pace_preference,
            updated_at = datetime('now')`,
    args: [
      profile.id,
      JSON.stringify(profile.known_languages),
      profile.primary_language,
      profile.years_experience,
      profile.python_level,
      JSON.stringify(profile.confirmed_skills),
      JSON.stringify(profile.identified_gaps),
      JSON.stringify(profile.goals),
      profile.pace_preference,
    ],
  });
}

// ─── Course Plan ─────────────────────────────────────────

export async function getCoursePlan(userId: string): Promise<CoursePlan | null> {
  const result = await db.execute({
    sql: "SELECT * FROM course_plan WHERE user_id = ? ORDER BY generated_at DESC LIMIT 1",
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    topics: JSON.parse(row.topics as string),
    estimated_total_minutes: row.estimated_total_minutes as number,
    generated_at: row.generated_at as string,
    revised_at: row.revised_at as string | null,
  };
}

export async function saveCoursePlan(plan: CoursePlan): Promise<void> {
  await db.execute({
    sql: `INSERT INTO course_plan (id, user_id, title, description, topics, estimated_total_minutes)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            topics = excluded.topics,
            estimated_total_minutes = excluded.estimated_total_minutes,
            revised_at = datetime('now'),
            revision_count = revision_count + 1`,
    args: [plan.id, plan.user_id, plan.title, plan.description, JSON.stringify(plan.topics), plan.estimated_total_minutes],
  });
}

// ─── Topic Progress ──────────────────────────────────────

export async function getTopicProgress(userId: string, courseId: string): Promise<TopicProgress[]> {
  const result = await db.execute({
    sql: "SELECT * FROM topic_progress WHERE user_id = ? AND course_id = ?",
    args: [userId, courseId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    user_id: row.user_id as string,
    course_id: row.course_id as string,
    topic_id: row.topic_id as string,
    status: row.status as TopicProgress["status"],
    score: row.score as number | undefined,
    ai_assessment: row.ai_assessment as string | undefined,
    struggles: JSON.parse((row.struggles as string) || "[]"),
    started_at: row.started_at as string | undefined,
    completed_at: row.completed_at as string | undefined,
    challenge_attempts: row.challenge_attempts as number,
    failed_attempts: row.failed_attempts as number,
  }));
}

export async function upsertTopicProgress(progress: TopicProgress): Promise<void> {
  await db.execute({
    sql: `INSERT INTO topic_progress (user_id, course_id, topic_id, status, score, ai_assessment, struggles, started_at, completed_at, challenge_attempts, failed_attempts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, course_id, topic_id) DO UPDATE SET
            status = excluded.status,
            score = excluded.score,
            ai_assessment = excluded.ai_assessment,
            struggles = excluded.struggles,
            completed_at = excluded.completed_at,
            challenge_attempts = excluded.challenge_attempts,
            failed_attempts = excluded.failed_attempts`,
    args: [
      progress.user_id, progress.course_id, progress.topic_id,
      progress.status, progress.score ?? null, progress.ai_assessment ?? null,
      JSON.stringify(progress.struggles), progress.started_at ?? null,
      progress.completed_at ?? null, progress.challenge_attempts, progress.failed_attempts,
    ],
  });
}

// ─── Chat Messages ───────────────────────────────────────

export async function getChatMessages(userId: string, topicId: string): Promise<ChatMessage[]> {
  const result = await db.execute({
    sql: "SELECT * FROM chat_messages WHERE user_id = ? AND topic_id = ? ORDER BY created_at ASC",
    args: [userId, topicId],
  });
  return result.rows.map((row) => ({
    id: row.id as number,
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    function_call: row.function_call as string | undefined,
    created_at: row.created_at as string,
  }));
}

export async function saveChatMessage(userId: string, topicId: string, message: ChatMessage): Promise<void> {
  await db.execute({
    sql: "INSERT INTO chat_messages (user_id, topic_id, role, content, function_call) VALUES (?, ?, ?, ?, ?)",
    args: [userId, topicId, message.role, message.content, message.function_call ?? null],
  });
}

// ─── Chat Summary ───────────────────────────────────────

export async function getChatSummary(userId: string, topicId: string): Promise<{ summary: string; messageCount: number } | null> {
  const result = await db.execute({
    sql: "SELECT summary, message_count FROM chat_summary WHERE user_id = ? AND topic_id = ?",
    args: [userId, topicId],
  });
  if (result.rows.length === 0) return null;
  return {
    summary: result.rows[0].summary as string,
    messageCount: result.rows[0].message_count as number,
  };
}

export async function saveChatSummary(userId: string, topicId: string, summary: string, messageCount: number): Promise<void> {
  await db.execute({
    sql: `INSERT INTO chat_summary (user_id, topic_id, summary, message_count)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id, topic_id) DO UPDATE SET
            summary = excluded.summary,
            message_count = excluded.message_count,
            updated_at = datetime('now')`,
    args: [userId, topicId, summary, messageCount],
  });
}

// ─── Code Submissions ────────────────────────────────────

export async function saveCodeSubmission(
  userId: string, topicId: string, challengeId: string,
  code: string, output: string | null, passed: boolean, feedback: string
): Promise<void> {
  await db.execute({
    sql: "INSERT INTO code_submissions (user_id, topic_id, challenge_id, code, output, passed, ai_feedback) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [userId, topicId, challengeId, code, output, passed ? 1 : 0, feedback],
  });
}

// ─── Assessment Data ─────────────────────────────────────

export async function saveAssessmentMessage(userId: string, role: string, content: string): Promise<void> {
  await db.execute({
    sql: "INSERT INTO assessment_messages (user_id, role, content) VALUES (?, ?, ?)",
    args: [userId, role, content],
  });
}

export async function getAssessmentMessages(userId: string): Promise<ChatMessage[]> {
  const result = await db.execute({
    sql: "SELECT * FROM assessment_messages WHERE user_id = ? ORDER BY created_at ASC",
    args: [userId],
  });
  return result.rows.map((row) => ({
    role: row.role as ChatMessage["role"],
    content: row.content as string,
  }));
}

export async function clearAssessmentMessages(userId: string): Promise<void> {
  await db.execute({
    sql: "DELETE FROM assessment_messages WHERE user_id = ?",
    args: [userId],
  });
}

export async function saveAssessmentData(userId: string, data: AssessmentData): Promise<void> {
  await db.execute({
    sql: "INSERT INTO assessment_data (user_id, conversation, code_probe_results, raw_profile) VALUES (?, ?, ?, ?)",
    args: [userId, JSON.stringify(data.conversation), JSON.stringify(data.code_probe_results), data.raw_profile ?? null],
  });
}
