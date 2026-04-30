import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import {
  LearnChapterSchema,
  LearnIndexSchema,
  type LearnChapter,
  type LearnIndex,
} from '@/lib/shared/schemas';

const LEARN_DIR = path.join(process.cwd(), 'content', 'learn');

export interface LoadedChapter {
  path: string;
  frontmatter: LearnChapter;
  body: string;
}

export async function loadIndex(): Promise<LearnIndex> {
  const raw = await fs.readFile(
    path.join(LEARN_DIR, '_index.json'),
    'utf8',
  );
  const parsed = LearnIndexSchema.parse(JSON.parse(raw));
  parsed.groups.sort((a, b) => a.order - b.order);
  return parsed;
}

export async function loadChapter(
  relPath: string,
): Promise<LoadedChapter | null> {
  const file = path.join(LEARN_DIR, `${relPath}.md`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    const fm = LearnChapterSchema.parse(data);
    return { path: relPath, frontmatter: fm, body: content };
  } catch {
    return null;
  }
}

export async function loadAllChapters(): Promise<LoadedChapter[]> {
  const idx = await loadIndex();
  const refs = idx.groups.flatMap((g) => g.chapters);
  const out: LoadedChapter[] = [];
  for (const r of refs) {
    const c = await loadChapter(r);
    if (!c)
      throw new Error(
        `Chapter referenced in _index.json not found: ${r}`,
      );
    out.push(c);
  }
  return out;
}
