import { getDb } from '@/lib/server/db';
import type { Question } from '@/lib/shared/schemas';

export type DiagramOutcome =
  | { status: 'ok'; autoFixed: boolean; llmRetried: boolean }
  | { status: 'fallback'; error: string };

export interface GeneratedDiagrams {
  architecture: DiagramOutcome;
  workflow: DiagramOutcome;
}

export interface GeneratedRecord {
  id: string;
  topic: string;
  question: Question;
  diagrams: GeneratedDiagrams | null;
  createdAt: number;
}

export interface GeneratedSummary {
  id: string;
  topic: string;
  title: string;
  difficulty: string;
  createdAt: number;
}

interface Row {
  id: string;
  topic: string;
  title: string;
  difficulty: string;
  question_json: string;
  diagrams_json: string | null;
  created_at: number;
}

function topicToId(topic: string): string {
  const slug = topic
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${slug || 'topic'}-${stamp}${rand}`;
}

function rowToRecord(row: Row): GeneratedRecord {
  return {
    id: row.id,
    topic: row.topic,
    question: JSON.parse(row.question_json) as Question,
    diagrams: row.diagrams_json
      ? (JSON.parse(row.diagrams_json) as GeneratedDiagrams)
      : null,
    createdAt: row.created_at,
  };
}

export function insertGenerated(input: {
  topic: string;
  question: Question;
  diagrams: GeneratedDiagrams | null;
}): GeneratedRecord {
  const id = topicToId(input.topic);
  const createdAt = Date.now();
  const db = getDb();
  db.prepare(
    `INSERT INTO generated_questions
      (id, topic, title, difficulty, question_json, diagrams_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.topic,
    input.question.title,
    input.question.difficulty,
    JSON.stringify(input.question),
    input.diagrams ? JSON.stringify(input.diagrams) : null,
    createdAt,
  );
  return {
    id,
    topic: input.topic,
    question: input.question,
    diagrams: input.diagrams,
    createdAt,
  };
}

export function getGenerated(id: string): GeneratedRecord | null {
  const row = getDb()
    .prepare<[string], Row>(`SELECT * FROM generated_questions WHERE id = ?`)
    .get(id);
  return row ? rowToRecord(row) : null;
}

export function listGenerated(limit = 50): GeneratedSummary[] {
  const rows = getDb()
    .prepare<[number], Pick<Row, 'id' | 'topic' | 'title' | 'difficulty' | 'created_at'>>(
      `SELECT id, topic, title, difficulty, created_at
        FROM generated_questions
        ORDER BY created_at DESC
        LIMIT ?`,
    )
    .all(limit);
  return rows.map((r) => ({
    id: r.id,
    topic: r.topic,
    title: r.title,
    difficulty: r.difficulty,
    createdAt: r.created_at,
  }));
}

export function deleteGenerated(id: string): boolean {
  const info = getDb()
    .prepare(`DELETE FROM generated_questions WHERE id = ?`)
    .run(id);
  return info.changes > 0;
}
