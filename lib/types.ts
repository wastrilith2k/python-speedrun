// User profile from assessment
export type PythonLevel = "none" | "read_only" | "scripting" | "intermediate" | "advanced";

export interface UserProfile {
  id: string;
  known_languages: string[];
  primary_language: string;
  years_experience: number;
  python_level: PythonLevel;
  confirmed_skills: string[];
  identified_gaps: string[];
  goals: string[];
  pace_preference: "fast" | "thorough";
  created_at: string;
  updated_at: string;
}

// Course plan
export interface CoursePlan {
  id: string;
  user_id: string;
  title: string;
  description: string;
  topics: CourseTopic[];
  estimated_total_minutes: number;
  generated_at: string;
  revised_at: string | null;
}

export interface CourseTopic {
  topic_id: string;
  order: number;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  reason_included: string;
  reason_skipped?: string;
  estimated_minutes: number;
  depth: "overview" | "standard" | "deep_dive";
  custom_focus?: string;
}

// Topic pool
export type TopicCategory =
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

export interface ChallengeRef {
  id: string;
  type: "predict" | "write" | "translate" | "refactor" | "explain";
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  category: TopicCategory;
  difficulty: 1 | 2 | 3 | 4 | 5;
  prerequisites: string[];
  time_estimate_minutes: number;
  translation_languages: string[];
  relevant_goals: string[];
  concepts: string[];
  gotchas: string[];
  challenges: ChallengeRef[];
  zep_search_terms: string[];
}

// Challenges
export interface Challenge {
  id: string;
  topic_id: string;
  type: "predict" | "write" | "translate" | "refactor" | "explain";
  difficulty: 1 | 2 | 3;
  title: string;
  prompt: string;
  starter_code?: string;
  source_code?: string;
  source_language?: string;
  expected_concepts: string[];
  evaluation_criteria: string;
  hints: string[];
}

// Chat
export interface ChatMessage {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  function_call?: string;
  created_at?: string;
}

// Topic progress
export interface TopicProgress {
  id?: number;
  user_id: string;
  course_id: string;
  topic_id: string;
  status: "locked" | "available" | "in_progress" | "completed" | "skipped";
  score?: number;
  ai_assessment?: string;
  struggles: string[];
  started_at?: string;
  completed_at?: string;
  challenge_attempts: number;
  failed_attempts: number;
}

// Code execution
export interface RunResult {
  output: string | null;
  error: string | null;
}

// Assessment
export interface AssessmentData {
  conversation: ChatMessage[];
  code_probe_results: Record<string, { passed: boolean; response: string }>;
  raw_profile?: string;
}

// API types
export interface AssessmentRequest {
  message: string;
  phase: "conversation" | "code_probe" | "generate";
  history: ChatMessage[];
  probeResults?: Record<string, { passed: boolean; response: string }>;
}

export interface AssessmentResponse {
  reply: string;
  phase: "conversation" | "code_probe" | "complete";
  probeCode?: string;
  probeType?: string;
  probeId?: string;
  profile?: UserProfile;
  coursePlan?: CoursePlan;
}

export interface ChatRequest {
  topicId: string;
  message: string;
  codeSubmission?: {
    code: string;
    output: string;
    challengeId: string;
  };
}

export interface ZepResource {
  content: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}
